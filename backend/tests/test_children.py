import pytest
from sqlalchemy import event

from app import app
from extensions import db
from models import Doctor
from security import create_token

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


def record(child_id, age=14, achieved=9, skip=()):
    domains = {name: {'achieved': achieved, 'assessed': 10} for name in DOMAINS if name not in skip}
    return {'child_id': child_id, 'age_months': age, 'domains': domains}


def make_client(email):
    doctor = Doctor(email=email, password_hash='not-used', full_name='Dr')
    db.session.add(doctor)
    db.session.commit()
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + create_token(doctor.id)
    return client


def test_requires_login(db_client):
    response = db_client.get('/api/children')
    assert response.status_code == 401


def test_empty_list(auth_client):
    response = auth_client.get('/api/children')
    assert response.status_code == 200
    assert response.get_json() == {'children': []}


def test_lists_children_with_their_latest_result(auth_client):
    auth_client.post('/api/score', json=record('C1', age=13, achieved=9))
    auth_client.post('/api/score', json=record('C1', age=14, achieved=2))
    items = auth_client.get('/api/children').get_json()['children']
    assert len(items) == 1
    item = items[0]
    assert item['child_id'] == 'C1'
    assert item['assessment_count'] == 2
    assert item['latest']['age_months'] == 14.0
    assert item['latest']['isolation_forest']['flag'] is True
    assert item['latest']['rule_based']['flagged_domains'] == DOMAINS


def test_latest_result_has_scores_and_counts(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    latest = auth_client.get('/api/children').get_json()['children'][0]['latest']
    assert latest['age_band'] == [9, 18]
    assert latest['complete'] is True
    assert latest['counts']['motor'] == {'achieved': 9, 'assessed': 10}
    assert latest['proportions']['motor'] == 0.9
    assert all(isinstance(v, float) for v in latest['z_scores'].values())
    assert latest['missing_domains'] == []
    assert latest['assessed_at'].endswith('+00:00')


def test_partial_latest_result(auth_client):
    auth_client.post('/api/score', json=record('C1', age=25, skip=['motor']))
    latest = auth_client.get('/api/children').get_json()['children'][0]['latest']
    assert latest['complete'] is False
    assert latest['isolation_forest'] is None
    assert latest['missing_domains'] == ['motor']
    assert latest['z_scores']['motor'] is None
    assert latest['counts']['motor'] is None
    assert latest['proportions']['motor'] is None


def test_latest_is_the_last_saved_even_inside_one_batch(auth_client):
    auth_client.post('/api/score/batch', json=[record('A', age=13), record('A', age=14), record('A', age=15)])
    item = auth_client.get('/api/children').get_json()['children'][0]
    assert item['assessment_count'] == 3
    assert item['latest']['age_months'] == 15.0


def test_most_recently_assessed_child_comes_first(auth_client):
    auth_client.post('/api/score', json=record('first'))
    auth_client.post('/api/score', json=record('second'))
    auth_client.post('/api/score', json=record('first'))
    refs = [c['child_id'] for c in auth_client.get('/api/children').get_json()['children']]
    assert refs == ['first', 'second']


def test_each_doctor_sees_only_their_own_children(auth_client):
    other = make_client('other@example.com')
    auth_client.post('/api/score', json=record('mine'))
    other.post('/api/score', json=record('theirs'))
    other.post('/api/score', json=record('mine'))
    mine = auth_client.get('/api/children').get_json()['children']
    theirs = other.get('/api/children').get_json()['children']
    assert [c['child_id'] for c in mine] == ['mine']
    assert sorted(c['child_id'] for c in theirs) == ['mine', 'theirs']
    assert mine[0]['assessment_count'] == 1
    assert {c['id'] for c in mine}.isdisjoint({c['id'] for c in theirs})


def test_response_has_no_doctor_or_password_data(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    text = auth_client.get('/api/children').get_data(as_text=True)
    assert 'password' not in text
    assert 'dr.test@example.com' not in text
    assert 'doctor_id' not in text


def test_number_of_queries_does_not_grow_with_children(auth_client):
    auth_client.post('/api/score/batch', json=[record(f'C{i}') for i in range(30)])
    statements = []

    def count(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(db.engine, 'before_cursor_execute', count)
    try:
        response = auth_client.get('/api/children')
    finally:
        event.remove(db.engine, 'before_cursor_execute', count)
    assert len(response.get_json()['children']) == 30
    assert len(statements) <= 6


def test_children_route_rejects_post(auth_client):
    assert auth_client.post('/api/children').status_code == 405