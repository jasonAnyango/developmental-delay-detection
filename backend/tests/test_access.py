import pytest

from access import assessments_of, children_of, find_assessment, find_child
from app import app
from extensions import db
from models import Child, Doctor
from security import create_token

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


def record(child_id, age=14):
    return {'child_id': child_id, 'age_months': age,
            'domains': {name: {'achieved': 9, 'assessed': 10} for name in DOMAINS}}


def make_client(email):
    doctor = Doctor(email=email, password_hash='not-used', full_name='Dr')
    db.session.add(doctor)
    db.session.commit()
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + create_token(doctor.id)
    return doctor, client


@pytest.fixture
def two_doctors(db_client):
    alice, alice_client = make_client('alice@example.com')
    bob, bob_client = make_client('bob@example.com')
    alice_ids = [alice_client.post('/api/score', json=record('C1', age=a)).get_json()['assessment_id']
                 for a in (13, 14)]
    bob_ids = [bob_client.post('/api/score', json=record(c)).get_json()['assessment_id']
               for c in ('C1', 'C2')]
    return alice, bob, alice_ids, bob_ids


def test_children_of_returns_only_own_children(two_doctors):
    alice, bob, _, _ = two_doctors
    assert [c.child_ref for c in children_of(alice)] == ['C1']
    assert sorted(c.child_ref for c in children_of(bob)) == ['C1', 'C2']
    assert {c.doctor_id for c in children_of(alice)} == {alice.id}


def test_find_child_returns_own_child(two_doctors):
    alice, _, _, _ = two_doctors
    child = Child.query.filter_by(doctor_id=alice.id).one()
    assert find_child(alice, child.id) == child


def test_find_child_hides_another_doctors_child(two_doctors):
    alice, bob, _, _ = two_doctors
    alice_child = Child.query.filter_by(doctor_id=alice.id).one()
    assert find_child(bob, alice_child.id) is None


def test_find_child_returns_none_for_unknown_id(two_doctors):
    alice, _, _, _ = two_doctors
    assert find_child(alice, 99999) is None


def test_assessments_of_returns_only_own_assessments(two_doctors):
    alice, bob, alice_ids, bob_ids = two_doctors
    assert sorted(a.id for a in assessments_of(alice)) == sorted(alice_ids)
    assert sorted(a.id for a in assessments_of(bob)) == sorted(bob_ids)


def test_find_assessment_hides_another_doctors_assessment(two_doctors):
    alice, bob, alice_ids, bob_ids = two_doctors
    assert find_assessment(alice, alice_ids[0]) is not None
    assert find_assessment(bob, alice_ids[0]) is None
    assert find_assessment(alice, bob_ids[0]) is None


def test_find_assessment_returns_none_for_unknown_id(two_doctors):
    alice, _, _, _ = two_doctors
    assert find_assessment(alice, 99999) is None


def test_doctor_with_no_records_sees_nothing(two_doctors):
    carol, _ = make_client('carol@example.com')
    assert children_of(carol).count() == 0
    assert assessments_of(carol).count() == 0


def test_another_doctor_submitting_the_same_child_id_does_not_touch_it(two_doctors):
    alice, _, alice_ids, _ = two_doctors
    alice_child = Child.query.filter_by(doctor_id=alice.id).one()
    assert len(alice_child.assessments) == 2
    assert sorted(a.id for a in alice_child.assessments) == sorted(alice_ids)