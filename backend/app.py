from flask import Flask, jsonify, request
from flask_cors import CORS

from assessment import assess_record
from config import Config
from model_store import artifacts

app = Flask(__name__)
app.config.from_object(Config)

origins = [origin.strip() for origin in Config.FRONTEND_ORIGIN.split(',')]
CORS(app, origins=origins)


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/score', methods=['POST'])
def score():
    payload, errors, status = assess_record(request.get_json(silent=True), artifacts)
    if errors:
        return jsonify({'errors': errors}), status
    return jsonify(payload)


if __name__ == '__main__':
    app.run(debug=True)