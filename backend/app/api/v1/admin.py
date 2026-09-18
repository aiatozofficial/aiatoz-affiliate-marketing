from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...models import User, Affiliate, Lead, Enrollment, Commission, Payout, AffiliateApplication, Conversion, CommissionStatus
router=APIRouter(prefix="/admin",tags=["Admin"])
@router.get("/overview")
def overview(db:Session=Depends(get_db),_:User=Depends(require_roles("ADMIN"))):
    return {"success":True,"data":{"applications":db.query(func.count(AffiliateApplication.id)).scalar() or 0,"active_affiliates":db.query(func.count(Affiliate.id)).filter(Affiliate.status=="ACTIVE").scalar() or 0,"leads":db.query(func.count(Lead.id)).scalar() or 0,"enrollments":db.query(func.count(Enrollment.id)).scalar() or 0,"commissions":db.query(func.count(Commission.id)).scalar() or 0,"payouts":db.query(func.count(Payout.id)).scalar() or 0,
            "conversions":db.query(func.count(Conversion.id)).scalar() or 0,"approved_conversions":db.query(func.count(Conversion.id)).filter(Conversion.status==CommissionStatus.APPROVED).scalar() or 0,"reversed_conversions":db.query(func.count(Conversion.id)).filter(Conversion.status==CommissionStatus.REVERSED).scalar() or 0,"pending_conversions":db.query(func.count(Conversion.id)).filter(Conversion.status==CommissionStatus.PENDING).scalar() or 0}}
from pydantic import BaseModel, Field
from ...core.security import hash_password
from ...core.exceptions import BusinessError
class PasswordSet(BaseModel): password:str=Field(min_length=8,max_length=128)
@router.patch("/affiliates/{affiliate_id}/password")
def set_affiliate_password(affiliate_id:str,payload:PasswordSet,db:Session=Depends(get_db),_:User=Depends(require_roles("ADMIN"))):
    a=db.query(Affiliate).filter(Affiliate.affiliate_id==affiliate_id).first()
    if not a: raise BusinessError("NOT_FOUND","Affiliate not found.",404)
    u=db.query(User).filter(User.id==a.user_id).first();u.password_hash=hash_password(payload.password);u.is_verified=True;db.commit();return {"success":True,"message":"Affiliate credentials updated."}
