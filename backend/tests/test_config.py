import pytest

from config import get_secret_key


def test_secret_key_is_returned(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'k' * 32)
    assert get_secret_key() == 'k' * 32


@pytest.mark.parametrize('value', [None, '', 'change-me', 'k' * 31])
def test_missing_or_short_secret_key_stops_the_app(monkeypatch, value):
    if value is None:
        monkeypatch.delenv('SECRET_KEY', raising=False)
    else:
        monkeypatch.setenv('SECRET_KEY', value)
    with pytest.raises(RuntimeError, match='SECRET_KEY'):
        get_secret_key()