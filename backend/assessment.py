from detection import score_with_models
from scoring import MIN_ITEMS, prepare_scores
from validation import DOMAINS, validate_input


def build_warnings(clean, result):
    warnings = []
    for name in result['missing_domains']:
        counts = clean['domains'].get(name)
        if counts is None:
            warnings.append(f'{name}: not provided, so it was not scored')
        else:
            warnings.append(
                f"{name}: only {counts['assessed']} milestones assessed, "
                f'at least {MIN_ITEMS} needed, so it was not scored'
            )
    if result['missing_domains']:
        warnings.append('Partial assessment: only the rule-based result is given, no Isolation Forest score')
    return warnings


def assess_record(data, artifacts):
    clean, errors = validate_input(data)
    if errors:
        return None, errors, 400

    result, error = prepare_scores(clean, artifacts['norms'], artifacts['bands']['bands'])
    if error:
        return None, [error], 422

    models = score_with_models(result, artifacts)
    forest = models['isolation_forest']
    if forest is not None:
        forest = {'flag': forest['flag'], 'score': round(forest['score'], 4)}
    rules = models['rule_based']

    payload = {
        'child_id': clean['child_id'],
        'age_months': clean['age_months'],
        'age_band': list(result['band']),
        'complete': result['complete'],
        'proportions': {
            name: None if result['scores'][name]['proportion'] is None
            else round(result['scores'][name]['proportion'], 3)
            for name in DOMAINS
        },
        'z_scores': {
            name: None if result['scores'][name]['z'] is None
            else round(result['scores'][name]['z'], 3)
            for name in DOMAINS
        },
        'isolation_forest': forest,
        'rule_based': {
            'flag': rules['flag'],
            'score': round(rules['score'], 3),
            'flagged_domains': rules['flagged_domains'],
        },
        'warnings': build_warnings(clean, result),
    }
    return payload, [], 200

MAX_BATCH = 100


def assess_batch(data, artifacts):
    if isinstance(data, dict):
        data = data.get('records')
    if not isinstance(data, list):
        return None, ['Send a list of records, or an object with a records list']
    if len(data) == 0:
        return None, ['The list of records is empty']
    if len(data) > MAX_BATCH:
        return None, [f'Too many records: the limit is {MAX_BATCH} per request']

    results = []
    failed = 0
    for index, record in enumerate(data):
        payload, errors, status = assess_record(record, artifacts)
        if errors:
            failed += 1
            child_id = record.get('child_id') if isinstance(record, dict) else None
            results.append({'index': index, 'child_id': child_id, 'errors': errors})
        else:
            results.append({'index': index, 'child_id': payload['child_id'], 'result': payload})

    return {'total': len(data), 'failed': failed, 'results': results}, []