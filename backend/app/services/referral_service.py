import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import AffiliateLink, Referral, TrackingEvent, EventType
from ..core.exceptions import BusinessError
from ..utils.ids import public_id

def resolve_click(db:Session, payload):
    link=db.query(AffiliateLink).filter(AffiliateLink.referral_code==payload.referral_code,AffiliateLink.active.is_(True)).first()
    if not link: raise BusinessError("INVALID_REFERRAL_CODE","This referral code is invalid or inactive.",404)
    session_id=payload.session_id or str(uuid.uuid4())
    ref=db.query(Referral).filter(Referral.affiliate_link_id==link.id,Referral.session_id==session_id).first()
    now=datetime.now(timezone.utc)
    if ref: ref.last_seen_at=now
    else:
        ref=Referral(public_id=public_id(),affiliate_id=link.affiliate_id,affiliate_link_id=link.id,session_id=session_id,landing_path=payload.landing_path,referrer=payload.referrer,utm_source=payload.utm_source,utm_medium=payload.utm_medium,utm_campaign=payload.utm_campaign,first_seen_at=now,last_seen_at=now); db.add(ref); db.flush()
    db.add(TrackingEvent(event_type=EventType.REFERRAL_CLICK,affiliate_id=link.affiliate_id,referral_id=ref.id,session_id=session_id,metadata_json="{}"))
    db.commit(); return ref,link
