from validation import DOMAINS


def find_band(age_months, norms):
    for row in norms:
        if row['age_low'] <= age_months < row['age_high']:
            return row['age_low'], row['age_high']
    return None


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
        if counts is None or counts['assessed'] == 0:
            scores[domain] = {'proportion': None, 'z': None}
            continue
        proportion = counts['achieved'] / counts['assessed']
        norm = norm_rows[domain]
        z = (proportion - norm['mean']) / norm['std']
        scores[domain] = {'proportion': proportion, 'z': z}
    return {'band': band, 'scores': scores}