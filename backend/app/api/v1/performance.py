from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import current_affiliate
from ...models import Affiliate, TrackingEvent, EventType
router=APIRouter(prefix="/affiliate",tags=["Performance"])
@router.get("/performance")
def performance(days:int=Query(30,ge=1,le=365),a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    since=datetime.now(timezone.utc)-timedelta(days=days-1)
    rows=db.query(func.date(TrackingEvent.created_at),TrackingEvent.event_type,func.count(TrackingEvent.id)).filter(TrackingEvent.affiliate_id==a.id,TrackingEvent.created_at>=since).group_by(func.date(TrackingEvent.created_at),TrackingEvent.event_type).all()
    by_day={}
    for day,event,count in rows: by_day.setdefault(str(day),{})[event.value]=int(count)
    return {"success":True,"data":{"days":days,"series":[{"date":d,"events":events} for d,events in sorted(by_day.items())]}}
