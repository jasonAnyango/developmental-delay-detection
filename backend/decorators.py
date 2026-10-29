from functools import wraps

from flask import g, jsonify, request

from extensions import db
from models import Doctor
from security import verify_token


def unauthorized(message):
    response = jsonify({'errors': [message]})
    response.status_code = 401
    response.headers['WWW-Authenticate'] = 'Bearer'
    return response


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header:
            return unauthorized('Authentication required')

        scheme, _, token = header.partition(' ')
        if scheme.lower() != 'bearer' or token.strip() == '':
            return unauthorized('Authorization header must be: Bearer <token>')

        doctor_id, error = verify_token(token.strip())
        if error:
            return unauthorized(error)

        doctor = db.session.get(Doctor, doctor_id)
        if doctor is None:
            return unauthorized('Invalid token')

        g.doctor = doctor
        return view(*args, **kwargs)

    return wrapper