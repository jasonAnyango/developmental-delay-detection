import json
import os

import joblib
from config import Config

MODEL_FILE = 'isolation_forest.joblib'
JSON_FILES = {
    'norms': 'norms.json',
    'bands': 'supported_bands.json',
    'items': 'item_domain_map.json',
    'info': 'model_info.json',
}


def load_artifacts(model_dir=Config.MODEL_DIR):
    needed = [MODEL_FILE] + list(JSON_FILES.values())
    missing = [name for name in needed if not os.path.exists(os.path.join(model_dir, name))]
    if missing:
        raise FileNotFoundError(f"Missing model files in {model_dir}: {', '.join(missing)}")

    artifacts = {'model': joblib.load(os.path.join(model_dir, MODEL_FILE))}
    for key, name in JSON_FILES.items():
        with open(os.path.join(model_dir, name)) as f:
            artifacts[key] = json.load(f)
    return artifacts


artifacts = load_artifacts()