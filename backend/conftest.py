import os

import pytest
from dotenv import load_dotenv

load_dotenv()
default_url = 'postgresql+psycopg2://postgres:password@localhost:5432/sophia_test'
os.environ['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', default_url)
os.environ['SECRET_KEY'] = 'test-secret-key-' + 'x' * 60


@pytest.fixture
def db_client():
    from app import app
    from extensions import db

    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_client():
    from app import app
    from extensions import db
    from models import Doctor
    from security import create_token

    with app.app_context():
        db.create_all()
        doctor = Doctor(email='dr.test@example.com', password_hash='not-used', full_name='Dr Test')
        db.session.add(doctor)
        db.session.commit()
        client = app.test_client()
        client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + create_token(doctor.id)
        yield client
        db.session.remove()
        db.drop_all()