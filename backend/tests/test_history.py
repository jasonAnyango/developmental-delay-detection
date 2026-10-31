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


def child_row_id(client, child_ref):
    items = client.get('/api/children').get_json()['children']
    return next(item['id'] for item in items if item['child_id'] == child_ref)


def test_requires_login(db_client):
    assert db_client.get('/api/children/1').status_code == 401


def test_returns_every_assessment_oldest_first(auth_client):
    auth_client.post('/api/score', json=record('C1', age=13, achieved=9))
    auth_client.post('/api/score', json=record('C1', age=14, achieved=8))
    auth_client.post('/api/score', json=record('C1', age=15, achieved=2))
    body = auth_client.get('/api/children/' + str(child_row_id(auth_client, 'C1'))).get_json()
    assert body['child_id'] == 'C1'
    assert body['assessment_count'] == 3
    assert [a['age_months'] for a in body['assessments']] == [13.0, 14.0, 15.0]
    assert [a['isolation_forest']['flag'] for a in body['assessments']] == [False, False, True]


def test_assessments_keep_their_order_when_saved_in_one_batch(auth_client):
    auth_client.post('/api/score/batch', json=[record('A', age=a) for a in (12, 13, 14, 15)])
    body = auth_client.get('/api/children/' + str(child_row_id(auth_client, 'A'))).get_json()
    assert [a['age_months'] for a in body['assessments']] == [12.0, 13.0, 14.0, 15.0]


def test_assessment_has_the_same_fields_as_the_list(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    listing = auth_client.get('/api/children').get_json()['children'][0]
    body = auth_client.get('/api/children/' + str(listing['id'])).get_json()
    assert body['assessments'][0] == listing['latest']


def test_partial_assessment_is_included(auth_client):
    auth_client.post('/api/score', json=record('C1', age=25))
    auth_client.post('/api/score', json=record('C1', age=26, skip=['motor']))
    body = auth_client.get('/api/children/' + str(child_row_id(auth_client, 'C1'))).get_json()
    assert [a['complete'] for a in body['assessments']] == [True, False]
    assert body['assessments'][1]['isolation_forest'] is None


def test_unknown_child_is_not_found(auth_client):
    response = auth_client.get('/api/children/99999')
    assert response.status_code == 404
    assert response.get_json() == {'errors': ['Child not found']}


def test_another_doctors_child_looks_exactly_like_a_missing_one(auth_client):
    other = make_client('other@example.com')
    other.post('/api/score', json=record('theirs'))
    theirs = child_row_id(other, 'theirs')
    foreign = auth_client.get(f'/api/children/{theirs}')
    missing = auth_client.get('/api/children/99999')
    assert foreign.status_code == missing.status_code == 404
    assert foreign.get_json() == missing.get_json()
    assert other.get(f'/api/children/{theirs}').status_code == 200


def test_history_never_mixes_in_another_doctors_records(auth_client):
    other = make_client('other@example.com')
    auth_client.post('/api/score', json=record('C1', age=13))
    other.post('/api/score', json=record('C1', age=14))
    other.post('/api/score', json=record('C1', age=15))
    mine = auth_client.get('/api/children/' + str(child_row_id(auth_client, 'C1'))).get_json()
    theirs = other.get('/api/children/' + str(child_row_id(other, 'C1'))).get_json()
    assert [a['age_months'] for a in mine['assessments']] == [13.0]
    assert [a['age_months'] for a in theirs['assessments']] == [14.0, 15.0]


@pytest.mark.parametrize('path', ['abc', '0', '-1', '1.5', '99999999999999999999'])
def test_odd_ids_give_a_json_404_not_an_error(auth_client, path):
    response = auth_client.get('/api/children/' + path)
    assert response.status_code == 404
    assert 'errors' in response.get_json()


def test_response_has_no_doctor_or_password_data(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    text = auth_client.get('/api/children/' + str(child_row_id(auth_client, 'C1'))).get_data(as_text=True)
    assert 'password' not in text
    assert 'dr.test@example.com' not in text
    assert 'doctor_id' not in text


def test_number_of_queries_does_not_grow_with_assessments(auth_client):
    auth_client.post('/api/score/batch', json=[record('C1', age=14) for _ in range(30)])
    child_id = child_row_id(auth_client, 'C1')
    statements = []

    def count(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(db.engine, 'before_cursor_execute', count)
    try:
        response = auth_client.get(f'/api/children/{child_id}')
    finally:
        event.remove(db.engine, 'before_cursor_execute', count)
    assert len(response.get_json()['assessments']) == 30
    assert len(statements) <= 6


@pytest.mark.parametrize('method', ['post', 'put', 'delete'])
def test_history_route_is_read_only(auth_client, method):
    assert getattr(auth_client, method)('/api/children/1').status_code == 405


def test_unknown_routes_and_wrong_methods_return_json(auth_client):
    missing = auth_client.get('/api/nothing-here')
    assert missing.status_code == 404
    assert missing.get_json() == {'errors': ['Not found']}
    wrong = auth_client.post('/api/children')
    assert wrong.status_code == 405
    assert wrong.get_json() == {'errors': ['Method not allowed']}