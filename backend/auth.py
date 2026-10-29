import re

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Doctor
from security import hash_password, verify_password

auth = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_PATTERN = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

DUMMY_HASH = hash_password('not-a-real-password')
BAD_LOGIN = 'Invalid email or password'


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
        password_hash=hash_password(clean['password']),
        full_name=clean['full_name'],
    )
    db.session.add(doctor)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'errors': ['An account with this email already exists']}), 409

    return jsonify({'id': doctor.id, 'email': doctor.email, 'full_name': doctor.full_name}), 201

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'errors': ['Request body must be a JSON object']}), 400

    email = data.get('email')
    password = data.get('password')
    errors = []
    if not isinstance(email, str) or email.strip() == '':
        errors.append('email is required')
    if not isinstance(password, str) or password == '':
        errors.append('password is required')
    if errors:
        return jsonify({'errors': errors}), 400

    doctor = Doctor.query.filter_by(email=email.strip().lower()).first()
    stored_hash = doctor.password_hash if doctor else DUMMY_HASH
    password_ok = len(password) <= MAX_PASSWORD_LENGTH and verify_password(stored_hash, password)
    if doctor is None or not password_ok:
        return jsonify({'errors': [BAD_LOGIN]}), 401

    return jsonify({'id': doctor.id, 'email': doctor.email, 'full_name': doctor.full_name})