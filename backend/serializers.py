from datetime import timezone

from detection import RULE_THRESHOLD
from validation import DOMAINS


def round_or_none(value, digits):
    return None if value is None else round(value, digits)


def format_time(value):
    return value.astimezone(timezone.utc).isoformat()


def serialize_assessment(assessment):
    predictions = {p.model: p for p in assessment.predictions}
    z = {name: getattr(assessment, f'z_{name}') for name in DOMAINS}

    counts = {}
    proportions = {}
    for name in DOMAINS:
        achieved = getattr(assessment, f'{name}_achieved')
        assessed = getattr(assessment, f'{name}_assessed')
        counts[name] = None if assessed is None else {'achieved': achieved, 'assessed': assessed}
        scored = z[name] is not None
        proportions[name] = round(achieved / assessed, 3) if scored else None

    forest = predictions.get('isolation_forest')
    rules = predictions['rule_based']
    return {
        'assessment_id': assessment.id,
        'assessed_at': format_time(assessment.created_at),
        'age_months': assessment.age_months,
        'age_band': [assessment.age_band_low, assessment.age_band_high],
        'complete': assessment.complete,
        'counts': counts,
        'proportions': proportions,
        'z_scores': {name: round_or_none(value, 3) for name, value in z.items()},
        'missing_domains': [name for name in DOMAINS if z[name] is None],
        'isolation_forest': None if forest is None else {
            'flag': forest.flag,
            'score': round(forest.score, 4),
        },
        'rule_based': {
            'flag': rules.flag,
            'score': round(rules.score, 3),
            'flagged_domains': [name for name in DOMAINS if z[name] is not None and z[name] < RULE_THRESHOLD],
        },
    }