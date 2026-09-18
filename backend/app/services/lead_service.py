from sqlalchemy.orm import Session
from ..models import Lead, AffiliateLink, Referral, LeadStatus, TrackingEvent, EventType
from ..core.exceptions import BusinessError
from ..utils.ids import public_id

def create_lead(db:Session,payload):
    referral=None; affiliate_id=None
    if payload.referral_code:
        link=db.query(AffiliateLink).filter(AffiliateLink.referral_code==payload.referral_code,AffiliateLink.active.is_(True)).first()
        if link: affiliate_id=link.affiliate_id; referral=db.query(Referral).filter(Referral.affiliate_link_id==link.id,Referral.session_id==payload.session_id).first() if payload.session_id else None
    lead=Lead(public_id=public_id(),name=payload.name.strip(),phone=payload.phone.strip(),email=payload.email.lower(),course_interest=payload.course_interest,student_professional_status=payload.student_professional_status,location=payload.location,affiliate_id=affiliate_id,referral_id=referral.id if referral else None,source="AFFILIATE" if affiliate_id else "DIRECT",status=LeadStatus.NEW)
    db.add(lead); db.flush(); db.add(TrackingEvent(event_type=EventType.LEAD_SUBMITTED,affiliate_id=affiliate_id,referral_id=referral.id if referral else None,session_id=payload.session_id,entity_id=lead.public_id,metadata_json="{}")); db.commit(); return lead
