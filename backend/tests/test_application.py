import os,sys
sys.path.insert(0,os.path.join(os.path.dirname(__file__),".."))
os.environ["DATABASE_URL"]="sqlite:///./test_application.db"
from app.core.database import Base,engine,SessionLocal
from app.main import app
from fastapi.testclient import TestClient
from app.models import AffiliateApplication
# Ensure clean state for this test DB (handle shared engine after other tests)
try:
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
except Exception:
    pass
# also remove any leftover test email if present
try:
    db=SessionLocal()
    db.query(AffiliateApplication).filter(AffiliateApplication.email=="test@example.com").delete()
    db.commit()
    db.close()
except Exception:
    pass

def test_application_submission():
    import time, uuid
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    unique_phone = f"+91987654{str(int(time.time()) % 10000).zfill(4)}"
    c=TestClient(app)
    r=c.post('/api/v1/applications',json={"name":"Test User","email":unique_email,"phone":unique_phone,"platforms":["Instagram"],"category":"Content Creator","targetAudience":"Students","audienceLocation":"India","mainPlatform":"Instagram","affiliateExperience":"No","contentCategory":"AI"})
    assert r.status_code==201, r.text
    assert r.json()["data"]["status"]=="PENDING"
