from unittest.mock import patch

import pytest

from models import Doctor

URL = '/api/auth/register'


def new_doctor(**changes):
    data = {'email': 'dr.a@example.com', 'password': 'longenough1', 'full_name': 'Dr Amina Otieno'}
    data.update(changes)
    return data


def test_register_creates_doctor(db_client):
    response = db_client.post(URL, json=new_doctor())
    body = response.get_json()
    assert response.status_code == 201
    assert body['email'] == 'dr.a@example.com'
    assert body['full_name'] == 'Dr Amina Otieno'
    assert Doctor.query.count() == 1


def test_response_has_no_password_data(db_client):
    body = db_client.post(URL, json=new_doctor()).get_json()
    assert set(body) == {'id', 'email', 'full_name'}


def test_password_is_stored_as_a_hash(db_client):
    db_client.post(URL, json=new_doctor(password='longenough1'))
    doctor = Doctor.query.one()
    assert doctor.password_hash != 'longenough1'
    assert 'longenough1' not in doctor.password_hash


def test_same_password_gives_different_hashes(db_client):
    db_client.post(URL, json=new_doctor(email='a@example.com'))
    db_client.post(URL, json=new_doctor(email='b@example.com'))
    first, second = Doctor.query.order_by(Doctor.id).all()
    assert first.password_hash != second.password_hash


def test_email_is_trimmed_and_lowercased(db_client):
    body = db_client.post(URL, json=new_doctor(email='  Dr.A@Example.COM ')).get_json()
    assert body['email'] == 'dr.a@example.com'


def test_duplicate_email_is_rejected(db_client):
    db_client.post(URL, json=new_doctor())
    response = db_client.post(URL, json=new_doctor(full_name='Someone Else'))
    assert response.status_code == 409
    assert response.get_json()['errors'] == ['An account with this email already exists']
    assert Doctor.query.count() == 1


def test_duplicate_email_ignores_case(db_client):
    db_client.post(URL, json=new_doctor())
    response = db_client.post(URL, json=new_doctor(email='DR.A@example.com'))
    assert response.status_code == 409


def test_different_emails_both_register(db_client):
    assert db_client.post(URL, json=new_doctor(email='a@example.com')).status_code == 201
    assert db_client.post(URL, json=new_doctor(email='b@example.com')).status_code == 201


@pytest.mark.parametrize('change, message', [
    ({'email': None}, 'email is required'),
    ({'email': ''}, 'email is required'),
    ({'email': 5}, 'email is required'),
    ({'email': 'not-an-email'}, 'email is not a valid address'),
    ({'email': 'a@b'}, 'email is not a valid address'),
    ({'email': 'a b@example.com'}, 'email is not a valid address'),
    ({'email': 'a' * 250 + '@example.com'}, 'email is not a valid address'),
    ({'password': None}, 'password is required'),
    ({'password': ''}, 'password is required'),
    ({'password': 12345678}, 'password is required'),
    ({'password': 'short'}, 'password must be at least 8 characters'),
    ({'password': 'x' * 129}, 'password must be at most 128 characters'),
    ({'full_name': None}, 'full_name is required'),
    ({'full_name': '   '}, 'full_name is required'),
    ({'full_name': 'N' * 121}, 'full_name must be at most 120 characters'),
])
def test_invalid_fields_give_clear_errors(db_client, change, message):
    response = db_client.post(URL, json=new_doctor(**change))
    assert response.status_code == 400
    assert response.get_json()['errors'] == [message]
    assert Doctor.query.count() == 0


def test_all_errors_are_reported_together(db_client):
    response = db_client.post(URL, json={'email': 'x', 'password': 'a'})
    assert len(response.get_json()['errors']) == 3


def test_invalid_json_body(db_client):
    response = db_client.post(URL, data='not json', content_type='application/json')
    assert response.status_code == 400
    assert response.get_json()['errors'] == ['Request body must be a JSON object']


def test_register_rejects_get(db_client):
    assert db_client.get(URL).status_code == 405


def test_duplicate_found_only_by_the_database_is_rejected(db_client):
    db_client.post(URL, json=new_doctor())
    with patch.object(Doctor, 'query') as query:
        query.filter_by.return_value.first.return_value = None
        response = db_client.post(URL, json=new_doctor())
    assert response.status_code == 409
    assert Doctor.query.count() == 1