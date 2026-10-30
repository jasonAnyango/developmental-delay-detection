from models import Assessment, Child


def children_of(doctor):
    return Child.query.filter_by(doctor_id=doctor.id)


def find_child(doctor, child_id):
    return children_of(doctor).filter(Child.id == child_id).first()


def assessments_of(doctor):
    return Assessment.query.join(Child).filter(Child.doctor_id == doctor.id)


def find_assessment(doctor, assessment_id):
    return assessments_of(doctor).filter(Assessment.id == assessment_id).first()