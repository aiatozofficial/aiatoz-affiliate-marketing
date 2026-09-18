import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__),".."))
os.environ["DATABASE_URL"]="sqlite:///./test_affiliate.db"
from fastapi.testclient import TestClient
from app.main import app

def test_health():
    assert TestClient(app).get("/health").json()=={"status":"ok"}
