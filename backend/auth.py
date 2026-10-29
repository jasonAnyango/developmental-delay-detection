import re

from extensions import db
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from models import Doctor

auth = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_PATTERN = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def validate_registration(data):
    errors = []
    if not isinstance(data, dict):
        return None, ['Request body must be a JSON object']

    email = data.get('email')
    if not isinstance(email, str) or email.strip() == '':
        errors.append('email is required')
    else:
        email = email.strip().lower()
        if len(email) > 255 or not EMAIL_PATTERN.match(email):
            errors.append('email is not a valid address')

    password = data.get('password')
    if not isinstance(password, str) or password == '':
        errors.append('password is required')
    elif len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f'password must be at least {MIN_PASSWORD_LENGTH} characters')
    elif len(password) > MAX_PASSWORD_LENGTH:
        errors.append(f'password must be at most {MAX_PASSWORD_LENGTH} characters')

    full_name = data.get('full_name')
    if not isinstance(full_name, str) or full_name.strip() == '':
        errors.append('full_name is required')
    else:
        full_name = full_name.strip()
        if len(full_name) > 120:
            errors.append('full_name must be at most 120 characters')

    if errors:
        return None, errors
    return {'email': email, 'password': password, 'full_name': full_name}, []


@auth.route('/register', methods=['POST'])
def register():
    clean, errors = validate_registration(request.get_json(silent=True))
    if errors:
        return jsonify({'errors': errors}), 400

    if Doctor.query.filter_by(email=clean['email']).first():
        return jsonify({'errors': ['An account with this email already exists']}), 409

    doctor = Doctor(
        email=clean['email'],
        password_hash=generate_password_hash(clean['password']),
        full_name=clean['full_name'],
    )
    db.session.add(doctor)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'errors': ['An account with this email already exists']}), 409

    return jsonify({'id': doctor.id, 'email': doctor.email, 'full_name': doctor.full_name}), 201