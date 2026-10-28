from config import Config
from flask import Flask, jsonify
from flask_cors import CORS
from model_store import artifacts

app = Flask(__name__)
app.config.from_object(Config)

origins = [origin.strip() for origin in Config.FRONTEND_ORIGIN.split(',')]
CORS(app, origins=origins)


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True)