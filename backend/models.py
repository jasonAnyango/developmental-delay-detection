from extensions import db


class Doctor(db.Model):
    __tablename__ = 'doctors'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    children = db.relationship('Child', back_populates='doctor', cascade='all, delete-orphan')


class Child(db.Model):
    __tablename__ = 'children'
    __table_args__ = (
        db.UniqueConstraint('doctor_id', 'child_ref', name='uq_children_doctor_ref'),
    )

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'),
                          nullable=False, index=True)
    child_ref = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    doctor = db.relationship('Doctor', back_populates='children')
    assessments = db.relationship('Assessment', back_populates='child', cascade='all, delete-orphan',
                                  order_by='Assessment.created_at')


class Assessment(db.Model):
    __tablename__ = 'assessments'
    __table_args__ = (
        db.Index('ix_assessments_child_created', 'child_id', 'created_at'),
        db.CheckConstraint('cognitive_achieved <= cognitive_assessed', name='ck_cognitive_counts'),
        db.CheckConstraint('motor_achieved <= motor_assessed', name='ck_motor_counts'),
        db.CheckConstraint('language_achieved <= language_assessed', name='ck_language_counts'),
        db.CheckConstraint('social_emotional_achieved <= social_emotional_assessed',
                           name='ck_social_emotional_counts'),
    )

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('children.id', ondelete='CASCADE'), nullable=False)
    age_months = db.Column(db.Float, nullable=False)
    age_band_low = db.Column(db.Integer, nullable=False)
    age_band_high = db.Column(db.Integer, nullable=False)
    complete = db.Column(db.Boolean, nullable=False)

    cognitive_achieved = db.Column(db.Integer)
    cognitive_assessed = db.Column(db.Integer)
    motor_achieved = db.Column(db.Integer)
    motor_assessed = db.Column(db.Integer)
    language_achieved = db.Column(db.Integer)
    language_assessed = db.Column(db.Integer)
    social_emotional_achieved = db.Column(db.Integer)
    social_emotional_assessed = db.Column(db.Integer)

    z_cognitive = db.Column(db.Float)
    z_motor = db.Column(db.Float)
    z_language = db.Column(db.Float)
    z_social_emotional = db.Column(db.Float)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    child = db.relationship('Child', back_populates='assessments')
    predictions = db.relationship('Prediction', back_populates='assessment', cascade='all, delete-orphan')


class Prediction(db.Model):
    __tablename__ = 'predictions'
    __table_args__ = (
        db.UniqueConstraint('assessment_id', 'model', name='uq_predictions_assessment_model'),
        db.CheckConstraint("model in ('isolation_forest', 'rule_based')", name='ck_predictions_model'),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id', ondelete='CASCADE'),
                              nullable=False, index=True)
    model = db.Column(db.String(30), nullable=False)
    flag = db.Column(db.Boolean, nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    assessment = db.relationship('Assessment', back_populates='predictions')