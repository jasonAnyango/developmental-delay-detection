import math

DOMAINS = ['cognitive', 'motor', 'language', 'social_emotional']


def is_whole_number(value):
    return isinstance(value, int) and not isinstance(value, bool)


def validate_input(data):
    errors = []

    if not isinstance(data, dict):
        return None, ['Request body must be a JSON object']

    child_id = data.get('child_id')
    if child_id is None or isinstance(child_id, bool) or not isinstance(child_id, (str, int)):
        errors.append('child_id is required and must be a string or number')
    elif str(child_id).strip() == '':
        errors.append('child_id must not be empty')

    age = data.get('age_months')
    if age is None:
        errors.append('age_months is required')
    elif isinstance(age, bool) or not isinstance(age, (int, float)) or not math.isfinite(age):
        errors.append('age_months must be a number')
    elif age <= 0:
        errors.append('age_months must be greater than 0')

    domains = data.get('domains')
    clean_domains = {}
    if domains is None:
        errors.append('domains is required')
    elif not isinstance(domains, dict):
        errors.append('domains must be an object')
    else:
        for name in domains:
            if name not in DOMAINS:
                errors.append(f'Unknown domain: {name}')
        for name in DOMAINS:
            if name not in domains:
                continue
            counts = domains[name]
            if not isinstance(counts, dict):
                errors.append(f'{name} must have achieved and assessed')
                continue
            achieved = counts.get('achieved')
            assessed = counts.get('assessed')
            if not is_whole_number(achieved) or not is_whole_number(assessed):
                errors.append(f'{name}: achieved and assessed must be whole numbers')
            elif achieved < 0 or assessed < 0:
                errors.append(f'{name}: achieved and assessed cannot be negative')
            elif achieved > assessed:
                errors.append(f'{name}: achieved cannot be greater than assessed')
            else:
                clean_domains[name] = {'achieved': achieved, 'assessed': assessed}

    if errors:
        return None, errors

    clean = {
        'child_id': str(child_id).strip(),
        'age_months': float(age),
        'domains': clean_domains,
    }
    return clean, []