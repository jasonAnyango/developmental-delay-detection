from app import app
from extensions import db
from models import Assessment, Doctor, Prediction
from security import create_token

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


def record(child_id, age=14, achieved=9):
    domains = {name: {'achieved': achieved, 'assessed': 10} for name in DOMAINS}
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
    assert db_client.delete('/api/children/1').status_code == 401


def test_deletes_the_child_and_all_their_records(auth_client):
    auth_client.post('/api/score', json=record('C1', age=13))
    auth_client.post('/api/score', json=record('C1', age=14))
    auth_client.post('/api/score', json=record('C2'))
    row_id = child_row_id(auth_client, 'C1')

    response = auth_client.delete(f'/api/children/{row_id}')

    assert response.status_code == 200
    assert response.get_json() == {'deleted': row_id}
    assert auth_client.get(f'/api/children/{row_id}').status_code == 404
    refs = [item['child_id'] for item in auth_client.get('/api/children').get_json()['children']]
    assert refs == ['C2']
    assert Assessment.query.count() == 1
    assert Prediction.query.count() == 2


def test_unknown_child_is_not_found(auth_client):
    response = auth_client.delete('/api/children/999')
    assert response.status_code == 404
    assert response.get_json() == {'errors': ['Child not found']}


def test_cannot_delete_another_doctors_child(db_client):
    owner = make_client('owner@example.com')
    other = make_client('other@example.com')
    owner.post('/api/score', json=record('C1'))
    row_id = child_row_id(owner, 'C1')

    response = other.delete(f'/api/children/{row_id}')

    assert response.status_code == 404
    assert owner.get(f'/api/children/{row_id}').status_code == 200
    assert Assessment.query.count() == 1


def test_child_id_can_be_used_again_after_deletion(auth_client):
    auth_client.post('/api/score', json=record('C1'))
    auth_client.delete(f'/api/children/{child_row_id(auth_client, "C1")}')

    auth_client.post('/api/score', json=record('C1', age=25))

    body = auth_client.get(f'/api/children/{child_row_id(auth_client, "C1")}').get_json()
    assert body['assessment_count'] == 1
    assert body['assessments'][0]['age_months'] == 25.0
