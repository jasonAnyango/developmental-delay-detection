import os

from assessment import assess_batch, assess_record
from config import BASE_DIR, Config
from decorators import login_required
from extensions import db, migrate
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from model_store import artifacts
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from auth import auth
from children import children

import models  # noqa: F401

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
migrate.init_app(app, db, directory=os.path.join(BASE_DIR, 'migrations'))

app.register_blueprint(auth)
app.register_blueprint(children)

origins = [origin.strip() for origin in Config.FRONTEND_ORIGIN.split(',')]
CORS(app, origins=origins)

@app.route('/api/health/db')
def health_db():
    try:
        db.session.execute(text('SELECT 1'))
    except SQLAlchemyError:
        return jsonify({'database': 'unavailable'}), 503
    return jsonify({'database': 'ok'})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'errors': ['Not found']}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'errors': ['Method not allowed']}), 405

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/evaluation')
@login_required
def evaluation():
    return jsonify(artifacts['evaluation'])

SAVE_ERROR = 'The assessment could not be saved'


@app.route('/api/score', methods=['POST'])
@login_required
def score():
    try:
        payload, errors, status = assess_record(request.get_json(silent=True), artifacts, g.doctor)
        if not errors:
            db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'errors': [SAVE_ERROR]}), 500
    if errors:
        return jsonify({'errors': errors}), status
    return jsonify(payload)


@app.route('/api/score/batch', methods=['POST'])
@login_required
def score_batch():
    try:
        payload, errors = assess_batch(request.get_json(silent=True), artifacts, g.doctor)
        if not errors:
            db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'errors': [SAVE_ERROR]}), 500
    if errors:
        return jsonify({'errors': errors}), 400
    return jsonify(payload)