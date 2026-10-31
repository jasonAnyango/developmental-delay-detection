from flask import Blueprint, g, jsonify

from access import assessment_counts, children_of, latest_assessments
from decorators import login_required
from serializers import format_time, serialize_assessment

children = Blueprint('children', __name__, url_prefix='/api')


@children.route('/children')
@login_required
def list_children():
    latest = latest_assessments(g.doctor)
    counts = assessment_counts(g.doctor)

    items = []
    for child in children_of(g.doctor):
        assessment = latest.get(child.id)
        items.append({
            'id': child.id,
            'child_id': child.child_ref,
            'created_at': format_time(child.created_at),
            'assessment_count': counts.get(child.id, 0),
            'latest': serialize_assessment(assessment) if assessment else None,
        })

    items.sort(key=lambda item: item['latest']['assessed_at'] if item['latest'] else '', reverse=True)
    return jsonify({'children': items})