import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import hash_password
from app.models import User, Role, Course, CommissionRule, ContentAsset, Campaign
from app.utils.ids import public_id
from decimal import Decimal

def main():
    db=SessionLocal()
    try:
        admin=db.query(User).filter(User.email==settings.admin_email.lower()).first()
        if not admin:
            db.add(User(public_id=public_id(),name="Platform Admin",email=settings.admin_email.lower(),password_hash=hash_password(settings.admin_password),role=Role.ADMIN,is_active=True,is_verified=True)); db.flush()
        course=db.query(Course).filter(Course.slug=="ai-to-z-demo-course").first()
        if not course:
            course=Course(public_id=public_id(),name="AI A to Z Demo Course",slug="ai-to-z-demo-course",description="Development/demo course only.",price=Decimal("10000"),currency="INR",active=True);db.add(course);db.flush()
        if not db.query(CommissionRule).filter(CommissionRule.course_id==course.id).first(): db.add(CommissionRule(public_id=public_id(),course_id=course.id,percentage=Decimal("15"),active=True,priority=10))
        if not db.query(ContentAsset).first(): db.add(ContentAsset(public_id=public_id(),title="Example Content Kit",description="Demo placeholder; replace with approved assets.",asset_type="INFO",url=None,active=True))
        db.commit(); print(f"Seeded admin: {settings.admin_email}")
    finally: db.close()
if __name__=="__main__": main()
