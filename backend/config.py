import os

from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))


def normalize_url(url):
    for start in ('postgres://', 'postgresql://'):
        if url.startswith(start):
            return 'postgresql+psycopg2://' + url[len(start):]
    return url


def get_database_url():
    url = os.getenv('DATABASE_URL')
    if not url:
        raise RuntimeError('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
    return normalize_url(url)

def get_secret_key():
    key = os.getenv('SECRET_KEY')
    if not key or len(key) < 32:
        raise RuntimeError('SECRET_KEY must be set to a random string of at least 32 characters. See .env.example.')
    return key

DATABASE_URL = get_database_url()
SECRET_KEY = get_secret_key()

class Config:
    FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
    MODEL_DIR = os.getenv('MODEL_DIR', os.path.join(BASE_DIR, 'model'))
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SECRET_KEY = SECRET_KEY
    TOKEN_HOURS = int(os.getenv('TOKEN_HOURS', '8'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    if ':6543/' in DATABASE_URL:
        SQLALCHEMY_ENGINE_OPTIONS = {'poolclass': NullPool}
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {'pool_pre_ping': True}