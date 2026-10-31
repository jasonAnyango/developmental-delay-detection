from sqlalchemy import func
from sqlalchemy.orm import selectinload

from extensions import db
from models import Assessment, Child


def children_of(doctor):
    return Child.query.filter_by(doctor_id=doctor.id)


def find_child(doctor, child_id):
    return children_of(doctor).filter(Child.id == child_id).first()


def assessments_of(doctor):
    return Assessment.query.join(Child).filter(Child.doctor_id == doctor.id)


def find_assessment(doctor, assessment_id):
    return assessments_of(doctor).filter(Assessment.id == assessment_id).first()


def latest_assessments(doctor):
    query = (
        assessments_of(doctor)
        .distinct(Assessment.child_id)
        .order_by(Assessment.child_id, Assessment.created_at.desc(), Assessment.id.desc())
        .options(selectinload(Assessment.predictions))
    )
    return {assessment.child_id: assessment for assessment in query}


def assessment_counts(doctor):
    rows = (
        db.session.query(Assessment.child_id, func.count(Assessment.id))
        .join(Child)
        .filter(Child.doctor_id == doctor.id)
        .group_by(Assessment.child_id)
    )
    return dict(rows)