import pytest

from checklist import build_checklist
from model_store import artifacts

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


@pytest.fixture
def client(auth_client):
    return auth_client


def ids_for(age):
    body, _, _ = build_checklist(str(age), artifacts)
    return {d['domain']: [i['id'] for i in d['items']] for d in body['domains']}


def test_requires_login(db_client):
    assert db_client.get('/api/checklist?age_months=14').status_code == 401


@pytest.mark.parametrize('age, band, sizes', [
    (5, [3, 6], [39, 80, 24, 23]),
    (7, [6, 9], [39, 80, 24, 23]),
    (14, [9, 18], [52, 91, 36, 22]),
    (23, [21, 24], [3, 6, 4, 16]),
    (25, [24, 27], [3, 6, 4, 16]),
    (28, [27, 30], [3, 6, 4, 16]),
])
def test_checklist_for_each_age_group(client, age, band, sizes):
    body = client.get(f'/api/checklist?age_months={age}').get_json()
    assert body['age_band'] == band
    assert [d['domain'] for d in body['domains']] == DOMAINS
    assert [len(d['items']) for d in body['domains']] == sizes
    first = body['domains'][0]['items'][0]
    assert set(first) == {'id', 'label'}
    assert first['label'] != ''


def test_every_item_has_a_label_and_appears_once(client):
    body = client.get('/api/checklist?age_months=14').get_json()
    ids = [i['id'] for d in body['domains'] for i in d['items']]
    assert len(ids) == len(set(ids))
    assert all(i['label'] for d in body['domains'] for i in d['items'])


@pytest.mark.parametrize('query, status', [
    ('', 400),
    ('?age_months=abc', 400),
    ('?age_months=0', 400),
    ('?age_months=-3', 400),
    ('?age_months=nan', 400),
    ('?age_months=10', 422),
    ('?age_months=40', 422),
])
def test_checklist_rejects_bad_or_unsupported_age(client, query, status):
    response = client.get('/api/checklist' + query)
    assert response.status_code == status
    assert response.get_json()['errors']


def test_checklist_rejects_post(client):
    assert client.post('/api/checklist').status_code == 405


def answers(age, passed_each=True, per_domain=10):
    out = {}
    for name, ids in ids_for(age).items():
        for item in ids[:per_domain]:
            out[item] = passed_each
    return out


def test_items_give_the_same_result_as_equivalent_counts(client):
    items = answers(14)
    for index, item in enumerate(list(items)):
        items[item] = index % 4 != 0
    from_items = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': items}).get_json()

    counts = {}
    for name, ids in ids_for(14).items():
        picked = [i for i in ids if i in items]
        counts[name] = {'achieved': sum(items[i] for i in picked), 'assessed': len(picked)}
    from_counts = client.post('/api/score', json={'child_id': 'B', 'age_months': 14, 'domains': counts}).get_json()

    for key in ['proportions', 'z_scores', 'isolation_forest', 'rule_based', 'complete', 'age_band', 'warnings']:
        assert from_items[key] == from_counts[key]


def test_all_failed_items_are_flagged(client):
    body = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': answers(14, False)}).get_json()
    assert body['rule_based']['flag'] is True
    assert body['rule_based']['flagged_domains'] == DOMAINS


def test_domain_with_too_few_items_is_not_scored(client):
    items = answers(14)
    cognitive = ids_for(14)['cognitive']
    for item in cognitive[2:]:
        items.pop(item, None)
    body = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': items}).get_json()
    assert body['z_scores']['cognitive'] is None
    assert body['complete'] is False
    assert any('cognitive' in w for w in body['warnings'])


def test_items_result_is_saved_with_counts(client):
    items = answers(14, per_domain=5)
    client.post('/api/score', json={'child_id': 'Saved', 'age_months': 14, 'items': items})
    children = client.get('/api/children').get_json()['children']
    assert children[0]['child_id'] == 'Saved'
    assert children[0]['latest']['counts']['motor'] == {'achieved': 5, 'assessed': 5}


@pytest.mark.parametrize('items, message', [
    ({'nope': True}, 'not part of the checklist'),
    ({'REAL': 'yes'}, 'true or false'),
    ({'REAL': 1}, 'true or false'),
    ({'REAL': None}, 'true or false'),
    ([], 'items must be an object'),
    ('x', 'items must be an object'),
    (None, 'items must be an object'),
])
def test_bad_items_are_rejected(client, items, message):
    if isinstance(items, dict) and 'REAL' in items:
        items = {ids_for(14)['motor'][0]: items['REAL']}
    response = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': items})
    assert response.status_code == 400
    assert message in response.get_json()['errors'][0]


def test_item_from_another_age_group_is_rejected(client):
    other = ids_for(23)['cognitive'][0]
    response = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': {other: True}})
    assert response.status_code == 400


def test_items_and_domains_together_are_rejected(client):
    body = {'child_id': 'A', 'age_months': 14, 'items': {}, 'domains': {}}
    response = client.post('/api/score', json=body)
    assert response.status_code == 400
    assert 'not both' in response.get_json()['errors'][0]


def test_items_with_unsupported_age_is_422(client):
    response = client.post('/api/score', json={'child_id': 'A', 'age_months': 10, 'items': {}})
    assert response.status_code == 422


def test_items_with_bad_age_reports_the_age_error(client):
    response = client.post('/api/score', json={'child_id': 'A', 'age_months': 'x', 'items': {}})
    assert response.status_code == 400
    assert any('age_months' in e for e in response.get_json()['errors'])


def test_no_answers_gives_not_enough_items_error(client):
    response = client.post('/api/score', json={'child_id': 'A', 'age_months': 14, 'items': {}})
    assert response.status_code == 422


def test_batch_accepts_items(client):
    record = {'child_id': 'A', 'age_months': 14, 'items': answers(14)}
    body = client.post('/api/score/batch', json=[record]).get_json()
    assert body['failed'] == 0