import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from flask_migrate import downgrade, upgrade
from sqlalchemy import inspect, text

from app import app
from extensions import db


def reset():
    db.session.remove()
    db.drop_all()
    db.session.execute(text('DROP TABLE IF EXISTS alembic_version'))
    db.session.commit()


@pytest.fixture
def empty_database():
    with app.app_context():
        reset()
        yield
        reset()


def test_migration_matches_models(empty_database):
    upgrade()
    with db.engine.connect() as connection:
        context = MigrationContext.configure(connection)
        assert compare_metadata(context, db.metadata) == []


def test_downgrade_removes_the_tables(empty_database):
    upgrade()
    downgrade(revision='base')
    tables = inspect(db.engine).get_table_names()
    assert tables == ['alembic_version']