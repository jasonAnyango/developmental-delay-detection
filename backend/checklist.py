import math

from scoring import check_age, find_band
from validation import DOMAINS

MAX_LISTED = 5


def band_key(band):
    return f'[{band[0]}, {band[1]})'


def items_for_age(age, artifacts):
    error = check_age(age, artifacts['bands']['bands'])
    if error:
        return None, None, error
    band = find_band(age, artifacts['norms'])
    return band, artifacts['bands']['items'][band_key(band)], None


def build_checklist(age_text, artifacts):
    try:
        age = float(age_text)
    except (TypeError, ValueError):
        return None, ['age_months is required and must be a number'], 400
    if not math.isfinite(age) or age <= 0:
        return None, ['age_months must be greater than 0'], 400

    band, band_items, error = items_for_age(age, artifacts)
    if error:
        return None, [error], 422

    labels = artifacts['labels']
    domains = [
        {
            'domain': name,
            'items': [{'id': item, 'label': labels[item]} for item in band_items[name]],
        }
        for name in DOMAINS
    ]
    return {'age_months': age, 'age_band': list(band), 'domains': domains}, [], 200


def domains_from_items(data, artifacts):
    answers = data.get('items')
    errors = []
    if 'domains' in data:
        errors.append('Send either items or domains, not both')
    if not isinstance(answers, dict):
        errors.append('items must be an object that maps item ids to true or false')
    if errors:
        return None, errors, 400

    converted = {key: value for key, value in data.items() if key != 'items'}
    age = data.get('age_months')
    if isinstance(age, bool) or not isinstance(age, (int, float)) or not math.isfinite(age) or age <= 0:
        converted['domains'] = {}
        return converted, [], 200

    band, band_items, error = items_for_age(age, artifacts)
    if error:
        return None, [error], 422

    domain_of = {item: name for name, ids in band_items.items() for item in ids}
    unknown = [item for item in answers if item not in domain_of]
    if unknown:
        listed = ', '.join(unknown[:MAX_LISTED])
        more = '' if len(unknown) <= MAX_LISTED else f' and {len(unknown) - MAX_LISTED} more'
        return None, [f'These items are not part of the checklist for this age: {listed}{more}'], 400
    if any(not isinstance(value, bool) for value in answers.values()):
        return None, ['Each item must be answered with true or false'], 400

    counts = {}
    for item, passed in answers.items():
        entry = counts.setdefault(domain_of[item], {'achieved': 0, 'assessed': 0})
        entry['assessed'] += 1
        entry['achieved'] += int(passed)
    converted['domains'] = counts
    return converted, [], 200