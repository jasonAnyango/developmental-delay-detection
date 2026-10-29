import pytest

from app import app

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


@pytest.fixture
def client():
    return app.test_client()


def record(child_id='C1', age=14, achieved=9, assessed=10, skip=()):
    domains = {name: {'achieved': achieved, 'assessed': assessed}
               for name in DOMAINS if name not in skip}
    return {'child_id': child_id, 'age_months': age, 'domains': domains}


def test_health(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.get_json() == {'status': 'ok'}

def test_evaluation_results(client):
    response = client.get('/api/evaluation')
    body = response.get_json()
    assert response.status_code == 200
    assert body['test_set']['rows'] == 516
    assert body['test_set']['isolation_forest']['flagged'] == 27
    assert body['test_set']['rule_based']['flagged'] == 71
    assert 'overlap' in body
    assert 'score_distribution' in body

def test_evaluation_rejects_post(client):
    assert client.post('/api/evaluation').status_code == 405

def test_cors_allows_frontend_origin(client):
    response = client.get('/api/health', headers={'Origin': 'http://localhost:5173'})
    assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'


def test_cors_blocks_other_origin(client):
    response = client.get('/api/health', headers={'Origin': 'http://example.com'})
    assert 'Access-Control-Allow-Origin' not in response.headers


def test_typical_child_not_flagged(client):
    response = client.post('/api/score', json=record())
    body = response.get_json()
    assert response.status_code == 200
    assert body['complete'] is True
    assert body['age_band'] == [9, 18]
    assert body['isolation_forest']['flag'] is False
    assert body['rule_based']['flag'] is False
    assert body['warnings'] == []


def test_low_child_flagged_by_both(client):
    body = client.post('/api/score', json=record(achieved=2)).get_json()
    assert body['isolation_forest']['flag'] is True
    assert body['rule_based']['flag'] is True
    assert body['rule_based']['flagged_domains'] == DOMAINS


def test_one_low_domain_flagged_by_rule_only(client):
    data = record()
    data['domains']['motor'] = {'achieved': 1, 'assessed': 10}
    body = client.post('/api/score', json=data).get_json()
    assert body['rule_based']['flag'] is True
    assert body['rule_based']['flagged_domains'] == ['motor']


def test_z_scores_returned(client):
    body = client.post('/api/score', json=record()).get_json()
    assert set(body['z_scores']) == set(DOMAINS)
    assert all(isinstance(value, float) for value in body['z_scores'].values())


def test_omitted_domain_gives_partial_result(client):
    body = client.post('/api/score', json=record(age=25, skip=['motor'])).get_json()
    assert body['complete'] is False
    assert body['isolation_forest'] is None
    assert body['z_scores']['motor'] is None
    assert any('motor: not provided' in text for text in body['warnings'])


def test_domain_with_too_few_milestones_is_not_scored(client):
    data = record(age=25)
    data['domains']['language'] = {'achieved': 1, 'assessed': 2}
    body = client.post('/api/score', json=data).get_json()
    assert body['z_scores']['language'] is None
    assert any('only 2 milestones' in text for text in body['warnings'])


def test_zero_assessed_domain_is_not_scored(client):
    data = record()
    data['domains']['cognitive'] = {'achieved': 0, 'assessed': 0}
    body = client.post('/api/score', json=data).get_json()
    assert body['z_scores']['cognitive'] is None


def test_no_usable_domain_is_rejected(client):
    data = {'child_id': 'C1', 'age_months': 14, 'domains': {}}
    response = client.post('/api/score', json=data)
    assert response.status_code == 422
    assert 'At least one domain' in response.get_json()['errors'][0]


@pytest.mark.parametrize('age', [3, 4.0, 10, 18, 20, 30, 36])
def test_unsupported_ages_are_rejected(client, age):
    response = client.post('/api/score', json=record(age=age))
    assert response.status_code == 422
    assert 'Supported ages' in response.get_json()['errors'][0]


@pytest.mark.parametrize('age', [4.2, 6.0, 8.3, 12, 16, 22.6, 24.05, 29.3])
def test_supported_ages_are_accepted(client, age):
    assert client.post('/api/score', json=record(age=age)).status_code == 200


@pytest.mark.parametrize('change, message', [
    ({'child_id': ''}, 'child_id must not be empty'),
    ({'child_id': None}, 'child_id is required'),
    ({'age_months': 'x'}, 'age_months must be a number'),
    ({'age_months': -1}, 'age_months must be greater than 0'),
    ({'age_months': None}, 'age_months is required'),
    ({'age_months': True}, 'age_months must be a number'),
    ({'domains': None}, 'domains is required'),
    ({'domains': []}, 'domains must be an object'),
])
def test_invalid_fields_give_clear_errors(client, change, message):
    data = record()
    data.update(change)
    response = client.post('/api/score', json=data)
    assert response.status_code == 400
    assert message in response.get_json()['errors'][0]


@pytest.mark.parametrize('counts, message', [
    ({'achieved': 5, 'assessed': 3}, 'motor: achieved cannot be greater than assessed'),
    ({'achieved': -1, 'assessed': 3}, 'motor: achieved and assessed cannot be negative'),
    ({'achieved': 2.5, 'assessed': 3}, 'motor: achieved and assessed must be whole numbers'),
    ({'achieved': 'a', 'assessed': 3}, 'motor: achieved and assessed must be whole numbers'),
    ({'achieved': 1}, 'motor: achieved and assessed must be whole numbers'),
    (5, 'motor must have achieved and assessed'),
])
def test_invalid_counts_give_clear_errors(client, counts, message):
    data = record()
    data['domains']['motor'] = counts
    response = client.post('/api/score', json=data)
    assert response.status_code == 400
    assert response.get_json()['errors'] == [message]


def test_unknown_domain_is_rejected(client):
    data = record()
    data['domains']['vision'] = {'achieved': 1, 'assessed': 2}
    response = client.post('/api/score', json=data)
    assert response.status_code == 400
    assert response.get_json()['errors'] == ['Unknown domain: vision']


def test_all_errors_are_reported_together(client):
    data = {'child_id': '', 'age_months': 'x', 'domains': {'motor': {'achieved': 5, 'assessed': 2}}}
    errors = client.post('/api/score', json=data).get_json()['errors']
    assert len(errors) == 3


def test_invalid_json_body(client):
    response = client.post('/api/score', data='not json', content_type='application/json')
    assert response.status_code == 400
    assert response.get_json()['errors'] == ['Request body must be a JSON object']


def test_score_rejects_get(client):
    assert client.get('/api/score').status_code == 405


def test_batch_mixed_records(client):
    records = [record('A'), record('B', achieved=2), record('C', age=10), {'child_id': 'D'}, 'junk']
    body = client.post('/api/score/batch', json=records).get_json()
    assert body['total'] == 5
    assert body['failed'] == 3
    assert [item['index'] for item in body['results']] == [0, 1, 2, 3, 4]
    assert 'result' in body['results'][0]
    assert body['results'][1]['result']['isolation_forest']['flag'] is True
    assert 'Supported ages' in body['results'][2]['errors'][0]
    assert body['results'][3]['child_id'] == 'D'
    assert body['results'][4]['errors'] == ['Request body must be a JSON object']


def test_batch_matches_single_endpoint(client):
    single = client.post('/api/score', json=record('A')).get_json()
    batch = client.post('/api/score/batch', json=[record('A')]).get_json()
    assert batch['results'][0]['result'] == single


def test_batch_accepts_records_object(client):
    body = client.post('/api/score/batch', json={'records': [record()]}).get_json()
    assert body['total'] == 1


@pytest.mark.parametrize('body', [[], {}, 'text', {'records': 5}])
def test_batch_rejects_bad_bodies(client, body):
    response = client.post('/api/score/batch', json=body)
    assert response.status_code == 400
    assert 'errors' in response.get_json()


def test_batch_limit(client):
    assert client.post('/api/score/batch', json=[record()] * 100).status_code == 200
    response = client.post('/api/score/batch', json=[record()] * 101)
    assert response.status_code == 400
    assert 'limit is 100' in response.get_json()['errors'][0]