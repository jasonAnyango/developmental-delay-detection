from unittest.mock import patch

import pytest
from sqlalchemy.exc import OperationalError

from app import app
from extensions import db
from models import Assessment, Child, Doctor, Prediction
from security import create_token

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


def record(child_id='C1', age=14, achieved=9, assessed=10, skip=()):
    domains = {name: {'achieved': achieved, 'assessed': assessed}
               for name in DOMAINS if name not in skip}
    return {'child_id': child_id, 'age_months': age, 'domains': domains}


def other_doctor_client():
    doctor = Doctor(email='dr.other@example.com', password_hash='not-used', full_name='Dr Other')
    db.session.add(doctor)
    db.session.commit()
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + create_token(doctor.id)
    return client, doctor


def test_score_saves_the_assessment_and_both_predictions(auth_client):
    body = auth_client.post('/api/score', json=record()).get_json()
    assessment = db.session.get(Assessment, body['assessment_id'])
    assert assessment.child.child_ref == 'C1'
    assert assessment.age_months == 14.0
    assert (assessment.age_band_low, assessment.age_band_high) == (9, 18)
    assert assessment.complete is True
    assert assessment.cognitive_achieved == 9 and assessment.cognitive_assessed == 10
    assert assessment.z_cognitive == pytest.approx(body['z_scores']['cognitive'], abs=0.001)
    models = {p.model: p for p in assessment.predictions}
    assert set(models) == {'isolation_forest', 'rule_based'}
    assert models['isolation_forest'].flag is body['isolation_forest']['flag']
    assert models['isolation_forest'].score == pytest.approx(body['isolation_forest']['score'], abs=0.0001)
    assert models['rule_based'].flag is body['rule_based']['flag']


def test_flagged_result_is_stored_as_flagged(auth_client):
    body = auth_client.post('/api/score', json=record(achieved=2)).get_json()
    models = {p.model: p for p in db.session.get(Assessment, body['assessment_id']).predictions}
    assert models['isolation_forest'].flag is True
    assert models['rule_based'].flag is True


def test_partial_assessment_stores_only_the_rule_based_prediction(auth_client):
    body = auth_client.post('/api/score', json=record(age=25, skip=['motor'])).get_json()
    assessment = db.session.get(Assessment, body['assessment_id'])
    assert assessment.complete is False
    assert assessment.motor_assessed is None and assessment.z_motor is None
    assert [p.model for p in assessment.predictions] == ['rule_based']


def test_counts_are_stored_even_when_too_few_to_score(auth_client):
    data = record(age=25)
    data['domains']['language'] = {'achieved': 1, 'assessed': 2}
    body = auth_client.post('/api/score', json=data).get_json()
    assessment = db.session.get(Assessment, body['assessment_id'])
    assert (assessment.language_achieved, assessment.language_assessed) == (1, 2)
    assert assessment.z_language is None


def test_repeated_assessments_belong_to_one_child(auth_client):
    first = auth_client.post('/api/score', json=record(age=13)).get_json()
    second = auth_client.post('/api/score', json=record(age=14)).get_json()
    assert first['assessment_id'] != second['assessment_id']
    assert Child.query.count() == 1
    assert Assessment.query.count() == 2
    assert [a.age_months for a in Child.query.one().assessments] == [13.0, 14.0]


def test_identical_submissions_are_stored_twice(auth_client):
    auth_client.post('/api/score', json=record())
    auth_client.post('/api/score', json=record())
    assert Assessment.query.count() == 2


def test_different_children_are_separate(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    auth_client.post('/api/score', json=record('C2'))
    assert Child.query.count() == 2


def test_child_id_is_trimmed_and_numbers_become_text(auth_client):
    auth_client.post('/api/score', json=record(' C1 '))
    auth_client.post('/api/score', json=record('C1'))
    auth_client.post('/api/score', json=record(5))
    assert sorted(c.child_ref for c in Child.query.all()) == ['5', 'C1']


def test_child_id_over_64_characters_is_rejected(auth_client):
    response = auth_client.post('/api/score', json=record('C' * 65))
    assert response.status_code == 400
    assert response.get_json()['errors'] == ['child_id must be at most 64 characters']
    assert Child.query.count() == 0


def test_same_child_id_for_two_doctors_gives_two_children(auth_client):
    other, _ = other_doctor_client()
    auth_client.post('/api/score', json=record('C1'))
    other.post('/api/score', json=record('C1'))
    assert Child.query.count() == 2
    assert len({c.doctor_id for c in Child.query.all()}) == 2


def test_rejected_records_are_not_saved(auth_client):
    auth_client.post('/api/score', json=record(age=10))
    auth_client.post('/api/score', json={'child_id': 'C1'})
    auth_client.post('/api/score', json={'child_id': 'C1', 'age_months': 14, 'domains': {}})
    assert Child.query.count() == 0
    assert Assessment.query.count() == 0


def test_database_failure_returns_an_error_and_saves_nothing(auth_client):
    with patch.object(db.session, 'commit', side_effect=OperationalError('x', {}, Exception('down'))):
        response = auth_client.post('/api/score', json=record())
    assert response.status_code == 500
    assert response.get_json()['errors'] == ['The assessment could not be saved']
    assert Assessment.query.count() == 0


def test_batch_saves_only_the_valid_records(auth_client):
    records = [record('A'), record('B', age=10), record('C', achieved=2), {'child_id': 'D'}]
    body = auth_client.post('/api/score/batch', json=records).get_json()
    assert body['failed'] == 2
    saved = [item['result']['assessment_id'] for item in body['results'] if 'result' in item]
    assert len(saved) == 2
    assert Assessment.query.count() == 2
    assert sorted(c.child_ref for c in Child.query.all()) == ['A', 'C']


def test_batch_with_the_same_child_twice(auth_client):
    body = auth_client.post('/api/score/batch', json=[record('A', age=13), record('A', age=14)]).get_json()
    assert body['failed'] == 0
    assert Child.query.count() == 1
    assert Assessment.query.count() == 2


def test_batch_database_failure_saves_nothing(auth_client):
    with patch.object(db.session, 'commit', side_effect=OperationalError('x', {}, Exception('down'))):
        response = auth_client.post('/api/score/batch', json=[record('A'), record('B')])
    assert response.status_code == 500
    assert Assessment.query.count() == 0
    assert Child.query.count() == 0


def test_each_prediction_row_is_linked_to_its_assessment(auth_client):
    auth_client.post('/api/score', json=record('A'))
    auth_client.post('/api/score', json=record('B'))
    assert Prediction.query.count() == 4