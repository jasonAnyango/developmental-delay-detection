from validation import DOMAINS

MIN_ITEMS = 3
GAP_TOLERANCE = 0.5
ROUNDING = 0.01


def find_band(age_months, norms):
    for row in norms:
        if row['age_low'] <= age_months < row['age_high']:
            return row['age_low'], row['age_high']
    return None


def supported_windows(bands):
    windows = []
    for band in sorted(bands, key=lambda b: b['age_low']):
        low, high = band['min_age_seen'], band['max_age_seen']
        if windows and low - windows[-1][1] <= GAP_TOLERANCE:
            windows[-1][1] = high
        else:
            windows.append([low, high])
    return windows


def check_age(age_months, bands):
    windows = supported_windows(bands)
    for low, high in windows:
        if low - ROUNDING <= age_months <= high + ROUNDING:
            return None
    text = ', '.join(f'{low:.1f} to {high:.1f}' for low, high in windows)
    return f'Age {age_months:g} months is not supported. Supported ages (months): {text}'


def compute_z_scores(data, norms):
    band = find_band(data['age_months'], norms)
    if band is None:
        return None

    norm_rows = {}
    for row in norms:
        if (row['age_low'], row['age_high']) == band:
            norm_rows[row['domain']] = row

    scores = {}
    for domain in DOMAINS:
        counts = data['domains'].get(domain)
        if counts is None or counts['assessed'] < MIN_ITEMS:
            scores[domain] = {'proportion': None, 'z': None}
            continue
        proportion = counts['achieved'] / counts['assessed']
        norm = norm_rows[domain]
        z = (proportion - norm['mean']) / norm['std']
        scores[domain] = {'proportion': proportion, 'z': z}
    return {'band': band, 'scores': scores}


def prepare_scores(data, norms, bands):
    error = check_age(data['age_months'], bands)
    if error:
        return None, error

    result = compute_z_scores(data, norms)
    missing = [name for name in DOMAINS if result['scores'][name]['z'] is None]
    if len(missing) == len(DOMAINS):
        return None, f'At least one domain needs {MIN_ITEMS} or more assessed milestones'

    result['missing_domains'] = missing
    result['complete'] = len(missing) == 0
    return result, None