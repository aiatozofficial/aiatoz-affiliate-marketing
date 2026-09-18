from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import current_affiliate
from ...models import Affiliate, Lead, Enrollment, Commission, Payout, AffiliateLink
router=APIRouter(prefix="/affiliate",tags=["Affiliate Data"])
@router.get("/leads")
def leads(page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    q=db.query(Lead).filter(Lead.affiliate_id==a.id); total=q.count(); items=q.order_by(Lead.created_at.desc()).offset((page-1)*page_size).limit(page_size).all(); return {"success":True,"data":{"items":[{"public_id":x.public_id,"name":x.name,"status":x.status.value,"source":x.source,"created_at":x.created_at.isoformat()} for x in items],"page":page,"page_size":page_size,"total":total}}
@router.get("/enrollments")
def enrollments(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    items=db.query(Enrollment).filter(Enrollment.affiliate_id==a.id).order_by(Enrollment.created_at.desc()).limit(100).all(); return {"success":True,"data":{"items":[{"public_id":x.public_id,"status":x.status.value,"course_id":x.course_id,"price":str(x.course_price_snapshot),"created_at":x.created_at.isoformat()} for x in items]}}
@router.get("/commissions")
def commissions(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    items=db.query(Commission).filter(Commission.affiliate_id==a.id).order_by(Commission.created_at.desc()).limit(100).all(); return {"success":True,"data":{"items":[{"public_id":x.public_id,"amount":str(x.amount),"currency":x.currency,"status":x.status.value,"enrollment_id":x.enrollment_id} for x in items]}}
@router.get("/payouts")
def payouts(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    items=db.query(Payout).filter(Payout.affiliate_id==a.id).order_by(Payout.created_at.desc()).limit(100).all(); return {"success":True,"data":{"items":[{"public_id":x.public_id,"amount":str(x.amount),"currency":x.currency,"status":x.status.value,"paid_at":x.paid_at.isoformat() if x.paid_at else None} for x in items]}}
@router.get("/referral")
def referral(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    items=db.query(AffiliateLink).filter(AffiliateLink.affiliate_id==a.id,AffiliateLink.active.is_(True)).all(); return {"success":True,"data":{"items":[{"public_id":x.public_id,"referral_code":x.referral_code,"active":x.active} for x in items]}}
