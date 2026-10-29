import pytest

from app import app
from config import normalize_url


@pytest.mark.parametrize('url, expected', [
    ('postgres://u:p@host:5432/db', 'postgresql+psycopg2://u:p@host:5432/db'),
    ('postgresql://u:p@host:5432/db', 'postgresql+psycopg2://u:p@host:5432/db'),
    ('postgresql+psycopg2://u:p@host:5432/db', 'postgresql+psycopg2://u:p@host:5432/db'),
])
def test_normalize_url(url, expected):
    assert normalize_url(url) == expected


def test_database_health():
    response = app.test_client().get('/api/health/db')
    assert response.status_code == 200
    assert response.get_json() == {'database': 'ok'}