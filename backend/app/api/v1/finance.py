from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...core.exceptions import BusinessError
from ...models import Commission, CommissionStatus, Payout, PayoutStatus, Affiliate, PayoutCommission, User
from ...utils.ids import public_id
router=APIRouter(tags=["Finance"])
@router.get("/commissions",dependencies=[Depends(require_roles("ADMIN","FINANCE"))])
def commissions(db:Session=Depends(get_db),status:CommissionStatus|None=None,page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100)):
    q=db.query(Commission)
    if status:q=q.filter(Commission.status==status)
    total=q.count(); items=q.order_by(Commission.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"success":True,"data":{"items":[{"public_id":x.public_id,"affiliate_id":x.affiliate_id,"amount":str(x.amount),"currency":x.currency,"status":x.status.value,"enrollment_id":x.enrollment_id} for x in items],"page":page,"page_size":page_size,"total":total}}
@router.patch("/commissions/{public_id}/approve",dependencies=[Depends(require_roles("ADMIN","FINANCE"))])
def approve(public_id:str,db:Session=Depends(get_db)):
    c=db.query(Commission).filter(Commission.public_id==public_id).first()
    if not c: raise BusinessError("NOT_FOUND","Commission not found.",404)
    if c.status!=CommissionStatus.PENDING: raise BusinessError("INVALID_STATE_TRANSITION","Only pending commissions can be approved.",409)
    c.status=CommissionStatus.APPROVED;c.approved_at=datetime.now(timezone.utc);db.commit();return {"success":True,"message":"Commission approved."}
@router.post("/payouts",dependencies=[Depends(require_roles("ADMIN","FINANCE"))],status_code=201)
def create_payout(affiliate_id:str,db:Session=Depends(get_db)):
    a=db.query(Affiliate).filter(Affiliate.affiliate_id==affiliate_id).first()
    if not a: raise BusinessError("NOT_FOUND","Affiliate not found.",404)
    eligible=db.query(Commission).filter(Commission.affiliate_id==a.id,Commission.status==CommissionStatus.APPROVED).all()
    if not eligible: raise BusinessError("PAYOUT_NOT_READY","No approved commissions are ready for payout.",409)
    from sqlalchemy import func
    amount=sum((x.amount for x in eligible),start=0)
    p=Payout(public_id=public_id(),affiliate_id=a.id,amount=amount,currency=eligible[0].currency,status=PayoutStatus.PENDING);db.add(p);db.flush()
    for c in eligible: db.add(PayoutCommission(payout_id=p.id,commission_id=c.id))
    db.commit();return {"success":True,"data":{"payout_id":p.public_id,"amount":str(p.amount),"status":p.status.value}}
@router.patch("/payouts/{public_id}/status",dependencies=[Depends(require_roles("ADMIN","FINANCE"))])
def payout_status(public_id:str,status:PayoutStatus,db:Session=Depends(get_db)):
    p=db.query(Payout).filter(Payout.public_id==public_id).first()
    if not p: raise BusinessError("NOT_FOUND","Payout not found.",404)
    allowed={PayoutStatus.PENDING:{PayoutStatus.VALIDATING,PayoutStatus.CANCELLED},PayoutStatus.VALIDATING:{PayoutStatus.APPROVED,PayoutStatus.FAILED},PayoutStatus.APPROVED:{PayoutStatus.PROCESSING,PayoutStatus.CANCELLED},PayoutStatus.PROCESSING:{PayoutStatus.PAID,PayoutStatus.FAILED},PayoutStatus.PAID:set(),PayoutStatus.FAILED:{PayoutStatus.PROCESSING},PayoutStatus.CANCELLED:set()}
    if status not in allowed[p.status]: raise BusinessError("INVALID_STATE_TRANSITION","Invalid payout state transition.",409)
    p.status=status
    if status==PayoutStatus.PAID:
        p.paid_at=datetime.now(timezone.utc)
        for link in db.query(PayoutCommission).filter(PayoutCommission.payout_id==p.id).all():
            c=db.query(Commission).filter(Commission.id==link.commission_id).first(); c.status=CommissionStatus.PAID;c.paid_at=p.paid_at
    db.commit();return {"success":True,"data":{"status":p.status.value}}
