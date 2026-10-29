import pytest
from sqlalchemy.exc import IntegrityError

from app import app
from extensions import db
from models import Assessment, Child, Doctor, Prediction


@pytest.fixture
def session():
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.rollback()
        db.session.remove()
        db.drop_all()


def make_doctor(session, email='a@example.com'):
    doctor = Doctor(email=email, password_hash='hash', full_name='Dr A')
    session.add(doctor)
    session.commit()
    return doctor


def make_assessment(child, **changes):
    values = dict(age_months=14.0, age_band_low=9, age_band_high=18, complete=True,
                  cognitive_achieved=5, cognitive_assessed=10)
    values.update(changes)
    return Assessment(child=child, **values)


def test_doctor_email_is_unique(session):
    make_doctor(session)
    session.add(Doctor(email='a@example.com', password_hash='hash', full_name='Dr B'))
    with pytest.raises(IntegrityError):
        session.commit()


def test_same_child_ref_allowed_for_different_doctors(session):
    first = make_doctor(session, 'a@example.com')
    second = make_doctor(session, 'b@example.com')
    session.add_all([Child(doctor=first, child_ref='C1'), Child(doctor=second, child_ref='C1')])
    session.commit()
    assert Child.query.count() == 2


def test_child_ref_is_unique_per_doctor(session):
    doctor = make_doctor(session)
    session.add_all([Child(doctor=doctor, child_ref='C1'), Child(doctor=doctor, child_ref='C1')])
    with pytest.raises(IntegrityError):
        session.commit()


def test_child_needs_a_doctor(session):
    session.add(Child(child_ref='C1'))
    with pytest.raises(IntegrityError):
        session.commit()


def test_child_can_have_many_assessments_in_order(session):
    child = Child(doctor=make_doctor(session), child_ref='C1')
    make_assessment(child, age_months=13.0)
    make_assessment(child, age_months=14.0)
    session.add(child)
    session.commit()
    assert [a.age_months for a in child.assessments] == [13.0, 14.0]


def test_achieved_cannot_exceed_assessed(session):
    child = Child(doctor=make_doctor(session), child_ref='C1')
    session.add(make_assessment(child, cognitive_achieved=11, cognitive_assessed=10))
    with pytest.raises(IntegrityError):
        session.commit()


def test_omitted_domain_is_stored_as_null(session):
    child = Child(doctor=make_doctor(session), child_ref='C1')
    assessment = make_assessment(child, complete=False)
    session.add(assessment)
    session.commit()
    assert assessment.motor_assessed is None
    assert assessment.z_motor is None


def test_one_prediction_per_model_per_assessment(session):
    child = Child(doctor=make_doctor(session), child_ref='C1')
    assessment = make_assessment(child)
    assessment.predictions.append(Prediction(model='rule_based', flag=False, score=0.5))
    assessment.predictions.append(Prediction(model='isolation_forest', flag=False, score=0.1))
    session.add(assessment)
    session.commit()
    assert len(assessment.predictions) == 2
    session.add(Prediction(assessment_id=assessment.id, model='rule_based', flag=True, score=-3.0))
    with pytest.raises(IntegrityError):
        session.commit()


def test_unknown_model_name_is_rejected(session):
    child = Child(doctor=make_doctor(session), child_ref='C1')
    assessment = make_assessment(child)
    assessment.predictions.append(Prediction(model='other', flag=False, score=0.0))
    session.add(assessment)
    with pytest.raises(IntegrityError):
        session.commit()


def test_deleting_a_doctor_removes_their_records(session):
    doctor = make_doctor(session)
    child = Child(doctor=doctor, child_ref='C1')
    assessment = make_assessment(child)
    assessment.predictions.append(Prediction(model='rule_based', flag=False, score=0.5))
    session.add(child)
    session.commit()
    session.delete(doctor)
    session.commit()
    assert Child.query.count() == 0
    assert Assessment.query.count() == 0
    assert Prediction.query.count() == 0