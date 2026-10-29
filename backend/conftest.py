import os

from dotenv import load_dotenv

load_dotenv()
default_url = 'postgresql+psycopg2://postgres:password@localhost:5432/sophia_test'
os.environ['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', default_url)