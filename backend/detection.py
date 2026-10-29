import warnings

import numpy as np
from validation import DOMAINS

RULE_THRESHOLD = -2


def isolation_forest_result(result, artifacts):
    if not result['complete']:
        return None

    features = artifacts['info']['features']
    row = [[result['scores'][name]['z'] for name in DOMAINS]]
    if features != ['z_' + name for name in DOMAINS]:
        raise ValueError('Model features do not match the expected domain order')

    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        score = float(artifacts['model'].decision_function(np.array(row))[0])
    return {'flag': score < 0, 'score': score}


def rule_based_result(result):
    z_values = {name: result['scores'][name]['z'] for name in DOMAINS
                if result['scores'][name]['z'] is not None}
    flagged = [name for name, z in z_values.items() if z < RULE_THRESHOLD]
    return {
        'flag': len(flagged) > 0,
        'score': min(z_values.values()),
        'flagged_domains': flagged,
    }


def score_with_models(result, artifacts):
    return {
        'isolation_forest': isolation_forest_result(result, artifacts),
        'rule_based': rule_based_result(result),
    }