from sqlalchemy.orm import Session
from ..models import Affiliate, AffiliateApplication, AffiliateLink, User, Role, ApplicationStatus
from ..core.security import hash_password
from ..core.config import settings
from ..core.exceptions import BusinessError
from ..utils.ids import public_id, short_code
from .audit_service import audit

def approve_application(db:Session, application:AffiliateApplication, actor:User):
    if application.status not in (ApplicationStatus.PENDING,ApplicationStatus.ON_HOLD): raise BusinessError("INVALID_STATE_TRANSITION","Only pending/on-hold applications can be approved.",409)
    user=db.query(User).filter(User.email==application.email).first()
    if not user:
        user=User(public_id=public_id(),name=application.name,email=application.email,phone=application.phone,password_hash=hash_password(short_code("TEMP",16)),role=Role.AFFILIATE,is_active=True,is_verified=False)
        db.add(user); db.flush()
    elif user.affiliate: raise BusinessError("ALREADY_AFFILIATE","This user already has an affiliate profile.",409)
    affiliate=Affiliate(public_id=public_id(),user_id=user.id,name=application.name,affiliate_id=short_code("AFF",8),status=ApplicationStatus.APPROVED,category=application.category)
    db.add(affiliate); db.flush()
    link=AffiliateLink(public_id=public_id(),affiliate_id=affiliate.id,referral_code=short_code("AIATOZ",8),active=True)
    db.add(link)
    application.status=ApplicationStatus.APPROVED; application.reviewed_by=actor.id
    audit(db,actor.id,"AFFILIATE_APPROVED","Affiliate",affiliate.public_id,{"application_id":application.public_id})
    db.commit(); return affiliate,link
