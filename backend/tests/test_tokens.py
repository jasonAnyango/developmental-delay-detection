from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app import app
from security import create_token, verify_token


@pytest.fixture(autouse=True)
def app_context():
    with app.app_context():
        yield


def test_token_round_trip():
    assert verify_token(create_token(7)) == (7, None)


def test_token_contains_expiry_in_the_future():
    claims = jwt.decode(create_token(7), options={'verify_signature': False})
    expires = datetime.fromtimestamp(claims['exp'], timezone.utc)
    assert timedelta(hours=7) < expires - datetime.now(timezone.utc) <= timedelta(hours=8)


def test_expired_token_is_rejected():
    token = create_token(7, lifetime=timedelta(seconds=-1))
    assert verify_token(token) == (None, 'Token has expired')


def test_tampered_token_is_rejected():
    header, payload, signature = create_token(7).split('.')
    forged = jwt.encode({'sub': '8', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                        'another-secret-that-is-long-enough-12345', algorithm='HS256')
    assert verify_token(forged) == (None, 'Invalid token')
    assert verify_token(f'{header}.{payload}.{signature[:-2]}xx') == (None, 'Invalid token')


def test_token_with_other_algorithm_is_rejected():
    token = jwt.encode({'sub': '7', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       app.config['SECRET_KEY'], algorithm='HS512')
    assert verify_token(token) == (None, 'Invalid token')


def test_unsigned_token_is_rejected():
    token = jwt.encode({'sub': '7', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       None, algorithm='none')
    assert verify_token(token) == (None, 'Invalid token')


def test_token_without_expiry_is_rejected():
    token = jwt.encode({'sub': '7'}, app.config['SECRET_KEY'], algorithm='HS256')
    assert verify_token(token) == (None, 'Invalid token')


def test_token_without_subject_is_rejected():
    token = jwt.encode({'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       app.config['SECRET_KEY'], algorithm='HS256')
    assert verify_token(token) == (None, 'Invalid token')


def test_token_with_non_numeric_subject_is_rejected():
    token = jwt.encode({'sub': 'abc', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       app.config['SECRET_KEY'], algorithm='HS256')
    assert verify_token(token) == (None, 'Invalid token')


@pytest.mark.parametrize('token', ['', 'garbage', 'a.b.c', None, 12345])
def test_garbage_is_rejected(token):
    assert verify_token(token) == (None, 'Invalid token')


def test_token_signed_with_another_secret_is_rejected():
    other = jwt.encode({'sub': '7', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       'wrong-secret-that-is-long-enough-1234567', algorithm='HS256')
    assert verify_token(other) == (None, 'Invalid token')