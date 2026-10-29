from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app import app
from extensions import db
from models import Doctor
from security import create_token

PROTECTED = [
    ('get', '/api/evaluation'),
    ('post', '/api/score'),
    ('post', '/api/score/batch'),
]

RECORD = {
    'child_id': 'C1',
    'age_months': 14,
    'domains': {'cognitive': {'achieved': 9, 'assessed': 10}},
}


@pytest.fixture
def setup(db_client):
    doctor = Doctor(email='dr.a@example.com', password_hash='not-used', full_name='Dr A')
    db.session.add(doctor)
    db.session.commit()
    return db_client, doctor


def send(client, method, url, token=None, header=None):
    headers = {}
    if header is not None:
        headers['Authorization'] = header
    elif token is not None:
        headers['Authorization'] = 'Bearer ' + token
    body = [RECORD] if url.endswith('/batch') else RECORD
    return getattr(client, method)(url, json=body, headers=headers)


@pytest.mark.parametrize('method, url', PROTECTED)
def test_missing_token_is_rejected(setup, method, url):
    client, _ = setup
    response = send(client, method, url)
    assert response.status_code == 401
    assert response.get_json()['errors'] == ['Authentication required']
    assert response.headers['WWW-Authenticate'] == 'Bearer'


@pytest.mark.parametrize('method, url', PROTECTED)
def test_valid_token_is_accepted(setup, method, url):
    client, doctor = setup
    response = send(client, method, url, create_token(doctor.id))
    assert response.status_code == 200


@pytest.mark.parametrize('header', ['Basic abc', 'Bearer', 'Bearer ', 'token', 'abc def'])
def test_wrong_header_format_is_rejected(setup, header):
    client, doctor = setup
    response = send(client, 'post', '/api/score', header=header)
    assert response.status_code == 401
    assert response.get_json()['errors'] == ['Authorization header must be: Bearer <token>']


def test_scheme_is_case_insensitive(setup):
    client, doctor = setup
    response = send(client, 'post', '/api/score', header='bearer ' + create_token(doctor.id))
    assert response.status_code == 200


def test_garbage_token_is_rejected(setup):
    client, _ = setup
    response = send(client, 'post', '/api/score', token='garbage')
    assert response.status_code == 401
    assert response.get_json()['errors'] == ['Invalid token']


def test_expired_token_is_rejected(setup):
    client, doctor = setup
    token = create_token(doctor.id, lifetime=timedelta(seconds=-1))
    response = send(client, 'post', '/api/score', token)
    assert response.status_code == 401
    assert response.get_json()['errors'] == ['Token has expired']


def test_token_signed_with_another_key_is_rejected(setup):
    client, doctor = setup
    token = jwt.encode({'sub': str(doctor.id), 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       'wrong-secret-that-is-long-enough-1234567', algorithm='HS256')
    assert send(client, 'post', '/api/score', token).status_code == 401


def test_token_for_a_deleted_doctor_is_rejected(setup):
    client, doctor = setup
    token = create_token(doctor.id)
    db.session.delete(doctor)
    db.session.commit()
    response = send(client, 'post', '/api/score', token)
    assert response.status_code == 401
    assert response.get_json()['errors'] == ['Invalid token']


def test_authentication_is_checked_before_the_body(setup):
    client, _ = setup
    response = client.post('/api/score', data='not json', content_type='application/json')
    assert response.status_code == 401


def test_public_routes_need_no_token(setup):
    client, _ = setup
    assert client.get('/api/health').status_code == 200
    assert client.get('/api/health/db').status_code == 200
    register = {'email': 'new@example.com', 'password': 'longenough1', 'full_name': 'New'}
    assert client.post('/api/auth/register', json=register).status_code == 201
    login = {'email': 'new@example.com', 'password': 'longenough1'}
    assert client.post('/api/auth/login', json=login).status_code == 200


def test_browser_preflight_needs_no_token(setup):
    client, _ = setup
    response = client.options('/api/score', headers={
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
    })
    assert response.status_code == 200
    assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'
    assert 'authorization' in response.headers['Access-Control-Allow-Headers'].lower()