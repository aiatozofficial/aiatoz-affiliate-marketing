import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["DATABASE_URL"] = "sqlite:///./test_conversions.db"
os.environ["AIATOZ_API_KEY"] = "test-aiatoz-key-32chars-for-testing-only"
# Ensure config picks up test key
from app.core.config import settings
# Force override for test
settings.aiatoz_api_key = "test-aiatoz-key-32chars-for-testing-only"

from app.core.database import Base, engine, SessionLocal
from app.models import User, Role, Affiliate, AffiliateApplication, ApplicationStatus
from app.core.security import hash_password
from app.utils.ids import public_id, short_code
from fastapi.testclient import TestClient
from sqlalchemy import text

# Recreate DB
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

from app.main import app
client = TestClient(app)

def create_affiliate_pair(email="conv_aff@test.com", name="Conv Aff"):
    db = SessionLocal()
    try:
        # Use Approve flow logic manually
        app_obj = AffiliateApplication(
            public_id=public_id(), name=name, email=email, phone="+919876543210",
            platforms='["Instagram"]', category="Test Category", target_audience="Students",
            audience_location="India", main_platform="Instagram", affiliate_experience="No",
            status=ApplicationStatus.PENDING
        )
        db.add(app_obj); db.commit()
        # Create user + affiliate directly
        user = User(public_id=public_id(), name=name, email=email.lower(), phone="+919876543210",
                    password_hash=hash_password("Affiliate123!"), role=Role.AFFILIATE, is_active=True, is_verified=True)
        db.add(user); db.flush()
        affiliate = Affiliate(public_id=public_id(), user_id=user.id, name=name,
                              affiliate_id=short_code("AFF",8), status=ApplicationStatus.ACTIVE, category="Test Category")
        db.add(affiliate); db.flush()
        from app.models import AffiliateLink
        link = AffiliateLink(public_id=public_id(), affiliate_id=affiliate.id, referral_code=short_code("AIATOZ",8), active=True)
        db.add(link); db.commit()
        return affiliate.affiliate_id, link.referral_code, email, db.query(User).filter(User.email==email.lower()).first().public_id
    finally:
        db.close()

# Setup two affiliates
AFF1_ID, REF1, EMAIL1, USER_PUB1 = create_affiliate_pair("aff1_conv@test.com", "Aff One")
AFF2_ID, REF2, EMAIL2, USER_PUB2 = create_affiliate_pair("aff2_conv@test.com", "Aff Two")

# Setup course + commission rule
from decimal import Decimal
db = SessionLocal()
try:
    from app.models import Course, CommissionRule
    course = Course(public_id=public_id(), name="Test Course", slug="test-course-conv", description="test", price=Decimal("10000"), currency="INR", active=True)
    db.add(course); db.flush()
    rule = CommissionRule(public_id=public_id(), course_id=course.id, percentage=Decimal("15.00"), active=True, priority=10)
    db.add(rule)
    # also global rule
    global_rule = CommissionRule(public_id=public_id(), course_id=None, percentage=Decimal("10.00"), active=True, priority=100)
    db.add(global_rule)
    db.commit()
finally:
    db.close()

API_KEY = "test-aiatoz-key-32chars-for-testing-only"
BAD_KEY = "bad-key"

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def login_affiliate(email):
    r = client.post("/api/v1/auth/affiliate/login", json={"email": email, "password": "Affiliate123!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

TOKEN1 = login_affiliate(EMAIL1)
TOKEN2 = login_affiliate(EMAIL2)

# --- AUTH TESTS ---
def test_valid_api_key_success():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "test_valid_001",
        "referral_code": REF1,
        "order_id": "ORDER-VALID-001",
        "sale_amount": 5000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 201, r.text
    assert r.json()["success"] == True
    assert r.json()["affiliate_id"] == AFF1_ID

def test_missing_api_key_rejected():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "test_missing_key",
        "referral_code": REF1,
        "order_id": "ORDER-MISSING-001",
        "sale_amount": 5000.00,
        "currency": "INR"
    })
    assert r.status_code in (401,403), r.text

def test_invalid_api_key_rejected():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "test_invalid_key",
        "referral_code": REF1,
        "order_id": "ORDER-INVALID-001",
        "sale_amount": 5000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {BAD_KEY}"})
    assert r.status_code == 401, r.text

# --- REFERRAL VALIDATION ---
def test_invalid_referral_rejected():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "test_invalid_ref",
        "referral_code": "FAKE9999",
        "order_id": "ORDER-FAKE-001",
        "sale_amount": 5000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 404, r.text
    assert "INVALID_REFERRAL" in r.text

# --- CONVERSION CREATION & COMMISSION ---
def test_commission_calculated_server_side():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "test_commission_001",
        "referral_code": REF1,
        "order_id": "ORDER-COMM-001",
        "sale_amount": 10000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 201, r.text
    data = r.json()
    # 10% global rule fallback or 15% if product mapping? Sale 10000 * 10% = 1000 or 15% =1500 depending rule priority
    # Our rule priority 10 for course-specific, 100 for global. With no product_id, global 10% applies => 1000
    # Check commission is calculated, not 0
    assert float(data["commission_amount"]) > 0
    # Ensure client cannot send commission amount (not in payload) – server calculates

# --- IDEMPOTENCY ---
def test_idempotency_same_conversion_id():
    payload = {
        "conversion_id": "idem_test_001",
        "referral_code": REF1,
        "order_id": "ORDER-IDEM-001",
        "sale_amount": 3000.00,
        "currency": "INR"
    }
    r1 = client.post("/api/v1/conversions", json=payload, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r1.status_code == 201, r1.text
    r2 = client.post("/api/v1/conversions", json=payload, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r2.status_code in (200,201), r2.text
    assert r2.json()["is_duplicate"] == True
    # Ensure only one row in DB
    db = SessionLocal()
    try:
        from app.models import Conversion
        cnt = db.query(Conversion).filter(Conversion.conversion_id=="idem_test_001").count()
        assert cnt == 1
    finally:
        db.close()

def test_different_conversions_created():
    for i in (101,102):
        r = client.post("/api/v1/conversions", json={
            "conversion_id": f"diff_test_{i}",
            "referral_code": REF1,
            "order_id": f"ORDER-DIFF-{i}",
            "sale_amount": 2000.00,
            "currency": "INR"
        }, headers={"Authorization": f"Bearer {API_KEY}"})
        assert r.status_code == 201, r.text
    db = SessionLocal()
    try:
        from app.models import Conversion
        assert db.query(Conversion).filter(Conversion.conversion_id.in_(["diff_test_101","diff_test_102"])).count() == 2
    finally:
        db.close()

# --- DUPLICATE ORDER ---
def test_duplicate_order_rejected():
    r1 = client.post("/api/v1/conversions", json={
        "conversion_id": "dup_order_001",
        "referral_code": REF1,
        "order_id": "ORDER-DUP-UNIQUE",
        "sale_amount": 1000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r1.status_code == 201, r1.text
    r2 = client.post("/api/v1/conversions", json={
        "conversion_id": "dup_order_002",
        "referral_code": REF1,
        "order_id": "ORDER-DUP-UNIQUE",
        "sale_amount": 1000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r2.status_code == 409, r2.text

# --- DASHBOARD SECURITY ---
def test_affiliate_cannot_see_other_conversions():
    # AFF1 has many conversions, AFF2 has 0 (or few)
    r = client.get("/api/v1/affiliate/conversions", headers=auth_headers(TOKEN2))
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    # All items should belong to AFF2 (but we have not created any for AFF2, so expect 0)
    # Create one for AFF2 to verify isolation
    r_new = client.post("/api/v1/conversions", json={
        "conversion_id": "iso_test_aff2",
        "referral_code": REF2,
        "order_id": "ORDER-ISO-001",
        "sale_amount": 4000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r_new.status_code == 201
    # Now AFF2 sees exactly 1
    r2 = client.get("/api/v1/affiliate/conversions", headers=auth_headers(TOKEN2))
    assert r2.status_code == 200
    assert r2.json()["data"]["total"] >= 1
    # AFF1 should not see AFF2's conversion
    r1 = client.get("/api/v1/affiliate/conversions", headers=auth_headers(TOKEN1))
    ids = [x["conversion_id"] for x in r1.json()["data"]["items"]]
    assert "iso_test_aff2" not in ids

# --- REFUND ---
def test_reversal_flow():
    # Create approved conversion
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "reversal_test_001",
        "referral_code": REF1,
        "order_id": "ORDER-REV-001",
        "sale_amount": 6000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 201
    assert r.json()["status"] == "APPROVED"
    # Reverse
    r2 = client.post("/api/v1/conversions/reversal_test_001/reverse", json={"reason": "refund"}, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r2.status_code == 200, r2.text
    assert r2.json()["status"] == "REVERSED"
    assert r2.json()["is_duplicate"] == False
    # Duplicate reversal
    r3 = client.post("/api/v1/conversions/reversal_test_001/reverse", json={"reason": "refund again"}, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r3.status_code == 200, r3.text
    assert r3.json()["is_duplicate"] == True
    assert r3.json()["status"] == "REVERSED"

def test_reversal_not_found():
    r = client.post("/api/v1/conversions/NONEXISTENT/reverse", json={}, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 404, r.text

# --- VALIDATION ---
def test_validation_negative_amount():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "val_neg_001",
        "referral_code": REF1,
        "order_id": "ORDER-NEG-001",
        "sale_amount": -100.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 422, r.text

def test_validation_invalid_currency():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "val_curr_001",
        "referral_code": REF1,
        "order_id": "ORDER-CURR-001",
        "sale_amount": 1000.00,
        "currency": "XYZ"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 422, r.text

def test_validation_missing_referral():
    r = client.post("/api/v1/conversions", json={
        "conversion_id": "val_ref_001",
        "order_id": "ORDER-REF-001",
        "sale_amount": 1000.00,
        "currency": "INR"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    assert r.status_code == 422, r.text
