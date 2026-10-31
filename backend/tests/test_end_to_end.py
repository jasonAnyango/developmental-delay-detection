import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone

import jwt

from app import app
from extensions import db
from models import Assessment, Child, Doctor

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']
PASSWORD = 'longenough1'

RESTART_SCRIPT = '''
import json, sys
from app import app

client = app.test_client()
login = client.post('/api/auth/login', json={'email': sys.argv[1], 'password': sys.argv[2]})
headers = {'Authorization': 'Bearer ' + login.get_json()['token']}
listing = client.get('/api/children', headers=headers).get_json()
history = client.get('/api/children/%d' % listing['children'][0]['id'], headers=headers).get_json()
print(json.dumps({'listing': listing, 'history': history}))
'''


def record(child_id, age=14, achieved=9):
    domains = {name: {'achieved': achieved, 'assessed': 10} for name in DOMAINS}
    return {'child_id': child_id, 'age_months': age, 'domains': domains}


def sign_up(email):
    client = app.test_client()
    register = client.post('/api/auth/register', json={'email': email, 'password': PASSWORD, 'full_name': 'Dr'})
    assert register.status_code == 201
    login = client.post('/api/auth/login', json={'email': email, 'password': PASSWORD})
    assert login.status_code == 200
    token = login.get_json()['token']
    client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + token
    return client, register.get_json()['id'], token


def test_records_survive_a_restart(db_client):
    alice, _, _ = sign_up('alice@example.com')
    alice.post('/api/score', json=record('C1', age=13))
    alice.post('/api/score', json=record('C1', age=14, achieved=2))
    before_list = alice.get('/api/children').get_json()
    before_history = alice.get('/api/children/%d' % before_list['children'][0]['id']).get_json()

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    run = subprocess.run([sys.executable, '-c', RESTART_SCRIPT, 'alice@example.com', PASSWORD],
                         capture_output=True, text=True, cwd=backend_dir, env=os.environ.copy())
    assert run.returncode == 0, run.stderr
    after = json.loads(run.stdout.strip().splitlines()[-1])

    assert after['listing'] == before_list
    assert after['history'] == before_history
    assert after['history']['assessment_count'] == 2


def test_repeated_assessments_are_all_stored(db_client):
    alice, _, _ = sign_up('alice@example.com')
    for age in (13, 14, 15):
        assert alice.post('/api/score', json=record('C1', age=age)).status_code == 200
    listing = alice.get('/api/children').get_json()['children']
    assert len(listing) == 1 and listing[0]['assessment_count'] == 3
    history = alice.get('/api/children/%d' % listing[0]['id']).get_json()
    assert [a['age_months'] for a in history['assessments']] == [13.0, 14.0, 15.0]
    assert Assessment.query.count() == 3


def test_a_doctor_cannot_read_another_doctors_records(db_client):
    alice, _, _ = sign_up('alice@example.com')
    bob, _, _ = sign_up('bob@example.com')
    alice.post('/api/score', json=record('C1', age=13))
    alice.post('/api/score', json=record('C1', age=14))
    alice.post('/api/score', json=record('only-alice'))
    bob.post('/api/score', json=record('C1', age=15))

    alice_children = alice.get('/api/children').get_json()['children']
    bob_children = bob.get('/api/children').get_json()['children']
    assert sorted(c['child_id'] for c in alice_children) == ['C1', 'only-alice']
    assert [c['child_id'] for c in bob_children] == ['C1']

    bob_ids = {c['id'] for c in bob_children}
    reachable = {i for i in range(1, 30) if bob.get(f'/api/children/{i}').status_code == 200}
    assert reachable == bob_ids

    alice_c1 = next(c for c in alice_children if c['child_id'] == 'C1')
    assert alice_c1['assessment_count'] == 2
    assert bob_children[0]['assessment_count'] == 1


def test_a_doctor_cannot_add_to_another_doctors_child(db_client):
    alice, _, _ = sign_up('alice@example.com')
    bob, _, _ = sign_up('bob@example.com')
    alice.post('/api/score', json=record('C1'))
    bob.post('/api/score', json=record('C1'))
    bob.post('/api/score', json=record('C1'))
    alice_child = alice.get('/api/children').get_json()['children'][0]
    assert alice_child['assessment_count'] == 1
    assert Child.query.count() == 2


def test_tokens_cannot_be_borrowed_or_forged(db_client):
    alice, alice_id, _ = sign_up('alice@example.com')
    bob, bob_id, bob_token = sign_up('bob@example.com')
    alice.post('/api/score', json=record('C1'))
    alice_child = alice.get('/api/children').get_json()['children'][0]['id']

    forged = jwt.encode({'sub': str(alice_id), 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                        'bobs-guess-of-the-secret-that-is-long-enough', algorithm='HS256')
    attacker = app.test_client()
    attacker.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + forged
    assert attacker.get('/api/children').status_code == 401

    bob_view = bob.get(f'/api/children/{alice_child}')
    assert bob_view.status_code == 404

    tampered = bob_token[:-3] + ('abc' if not bob_token.endswith('abc') else 'xyz')
    attacker.environ_base['HTTP_AUTHORIZATION'] = 'Bearer ' + tampered
    assert attacker.get('/api/children').status_code == 401


def test_deleting_one_doctor_leaves_the_other_untouched(db_client):
    alice, alice_id, alice_token = sign_up('alice@example.com')
    bob, _, _ = sign_up('bob@example.com')
    alice.post('/api/score', json=record('C1'))
    bob.post('/api/score', json=record('C1', age=13))
    bob.post('/api/score', json=record('C1', age=14))

    db.session.delete(db.session.get(Doctor, alice_id))
    db.session.commit()

    assert alice.get('/api/children').status_code == 401
    bob_children = bob.get('/api/children').get_json()['children']
    assert len(bob_children) == 1 and bob_children[0]['assessment_count'] == 2
    assert Child.query.count() == 1