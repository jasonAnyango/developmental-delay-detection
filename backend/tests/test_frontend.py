import importlib
import os

import pytest


@pytest.fixture
def served(tmp_path, monkeypatch):
    (tmp_path / 'assets').mkdir()
    (tmp_path / 'index.html').write_text('<html>SOPHIA app</html>')
    (tmp_path / 'assets' / 'app.js').write_text('console.log(1)')
    monkeypatch.setenv('FRONTEND_DIR', str(tmp_path))
    import config
    import app as app_module

    importlib.reload(config)
    importlib.reload(app_module)
    yield app_module.app.test_client()
    monkeypatch.delenv('FRONTEND_DIR')
    importlib.reload(config)
    importlib.reload(app_module)


def test_root_and_deep_links_return_the_app(served):
    assert b'SOPHIA app' in served.get('/').data
    assert b'SOPHIA app' in served.get('/children/5').data


def test_static_files_are_served(served):
    response = served.get('/assets/app.js')
    assert response.status_code == 200
    assert b'console.log' in response.data


def test_unknown_api_paths_stay_json_404(served):
    response = served.get('/api/nothing')
    assert response.status_code == 404
    assert response.get_json() == {'errors': ['Not found']}


def test_api_routes_still_work_when_serving(served):
    assert served.get('/api/health').get_json() == {'status': 'ok'}


def test_no_frontend_routes_without_the_setting(db_client):
    assert os.getenv('FRONTEND_DIR') is None
    assert db_client.get('/').status_code == 404
