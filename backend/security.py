from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

ALGORITHM = 'HS256'


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password_hash, password):
    return check_password_hash(password_hash, password)


def create_token(doctor_id, lifetime=None):
    if lifetime is None:
        lifetime = timedelta(hours=current_app.config['TOKEN_HOURS'])
    now = datetime.now(timezone.utc)
    claims = {'sub': str(doctor_id), 'iat': now, 'exp': now + lifetime}
    return jwt.encode(claims, current_app.config['SECRET_KEY'], algorithm=ALGORITHM)


def verify_token(token):
    try:
        claims = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=[ALGORITHM],
            options={'require': ['exp', 'sub']},
        )
        return int(claims['sub']), None
    except jwt.ExpiredSignatureError:
        return None, 'Token has expired'
    except (jwt.InvalidTokenError, ValueError):
        return None, 'Invalid token'