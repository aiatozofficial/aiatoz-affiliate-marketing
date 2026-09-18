from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..models import AffiliateApplication, ApplicationStatus
from ..schemas.application import ApplicationCreate
from ..core.exceptions import BusinessError
from ..utils.ids import public_id
from ..utils.json import dumps
from .audit_service import audit

def create_application(db:Session, payload:ApplicationCreate):
    existing=db.query(AffiliateApplication).filter(or_(AffiliateApplication.email==payload.email.lower(), AffiliateApplication.phone==payload.phone)).filter(AffiliateApplication.status.in_([ApplicationStatus.PENDING,ApplicationStatus.ON_HOLD,ApplicationStatus.APPROVED,ApplicationStatus.ACTIVE])).first()
    if existing: raise BusinessError("DUPLICATE_APPLICATION","An application with these details may already exist.",409)
    obj=AffiliateApplication(public_id=public_id(),name=payload.name.strip(),email=payload.email.lower(),phone=payload.phone.strip(),instagram=payload.instagram,youtube=payload.youtube,linkedin=payload.linkedin,website=payload.website,audience_size=payload.audienceSize,social_media_followers=payload.socialMediaFollowers,content_category=payload.contentCategory,platforms=dumps(payload.platforms),category=payload.category,target_audience=payload.targetAudience,audience_type=payload.audienceType,audience_location=payload.audienceLocation,main_platform=payload.mainPlatform,average_reach=payload.averageReach,affiliate_experience=payload.affiliateExperience,previous_experience=payload.previousExperience,status=ApplicationStatus.PENDING)
    db.add(obj); db.flush(); audit(db,None,"APPLICATION_SUBMITTED","AffiliateApplication",obj.public_id); db.commit(); return obj

def update_status(db:Session, application:AffiliateApplication, status:ApplicationStatus, actor_id:int, notes:str|None=None):
    allowed={ApplicationStatus.PENDING:{ApplicationStatus.APPROVED,ApplicationStatus.REJECTED,ApplicationStatus.ON_HOLD},ApplicationStatus.ON_HOLD:{ApplicationStatus.APPROVED,ApplicationStatus.REJECTED},ApplicationStatus.APPROVED:{ApplicationStatus.ACTIVE},ApplicationStatus.ACTIVE:set(),ApplicationStatus.REJECTED:set()}
    if status not in allowed[application.status]: raise BusinessError("INVALID_STATE_TRANSITION",f"Cannot move application from {application.status.value} to {status.value}.",409)
    application.status=status; application.reviewed_by=actor_id; application.review_notes=notes; db.flush(); audit(db,actor_id,f"APPLICATION_{status.value}","AffiliateApplication",application.public_id); db.commit(); return application
