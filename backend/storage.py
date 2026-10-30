from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Assessment, Child, Prediction
from validation import DOMAINS


def get_or_create_child(doctor, child_ref):
    child = Child.query.filter_by(doctor_id=doctor.id, child_ref=child_ref).first()
    if child:
        return child
    try:
        with db.session.begin_nested():
            child = Child(doctor_id=doctor.id, child_ref=child_ref)
            db.session.add(child)
    except IntegrityError:
        child = Child.query.filter_by(doctor_id=doctor.id, child_ref=child_ref).first()
    return child


def save_assessment(doctor, clean, result, models):
    child = get_or_create_child(doctor, clean['child_id'])
    band_low, band_high = result['band']

    values = {}
    for name in DOMAINS:
        counts = clean['domains'].get(name)
        values[f'{name}_achieved'] = counts['achieved'] if counts else None
        values[f'{name}_assessed'] = counts['assessed'] if counts else None
        values[f'z_{name}'] = result['scores'][name]['z']

    assessment = Assessment(
        child=child,
        age_months=clean['age_months'],
        age_band_low=band_low,
        age_band_high=band_high,
        complete=result['complete'],
        **values,
    )

    forest = models['isolation_forest']
    if forest is not None:
        assessment.predictions.append(
            Prediction(model='isolation_forest', flag=forest['flag'], score=forest['score'])
        )
    rules = models['rule_based']
    assessment.predictions.append(
        Prediction(model='rule_based', flag=rules['flag'], score=rules['score'])
    )

    db.session.add(assessment)
    db.session.flush()
    return assessment