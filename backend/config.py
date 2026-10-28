import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
    MODEL_DIR = os.getenv('MODEL_DIR', os.path.join(BASE_DIR, 'model'))