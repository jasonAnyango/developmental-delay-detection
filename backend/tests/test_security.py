from security import hash_password, verify_password


def test_hash_is_not_the_password():
    assert hash_password('longenough1') != 'longenough1'


def test_correct_password_verifies():
    assert verify_password(hash_password('longenough1'), 'longenough1') is True


def test_wrong_password_fails():
    assert verify_password(hash_password('longenough1'), 'longenough2') is False


def test_password_is_case_sensitive():
    assert verify_password(hash_password('LongEnough1'), 'longenough1') is False


def test_same_password_hashes_differently():
    assert hash_password('longenough1') != hash_password('longenough1')


def test_hash_uses_scrypt_with_a_salt():
    parts = hash_password('longenough1').split('$')
    assert parts[0].startswith('scrypt:')
    assert len(parts[1]) >= 16


def test_malformed_stored_hash_fails_instead_of_crashing():
    assert verify_password('not-a-hash', 'longenough1') is False