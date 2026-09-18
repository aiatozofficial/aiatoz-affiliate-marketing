from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import current_affiliate
from ...models import Affiliate, AffiliateLink
from ...schemas.affiliate import AffiliateProfile, DashboardSummary
from ...services.dashboard_service import summary
from ...core.config import settings
router=APIRouter(prefix="/affiliate",tags=["Affiliate Dashboard"])
@router.get("/profile",response_model=AffiliateProfile)
def profile(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)):
    link=db.query(AffiliateLink).filter(AffiliateLink.affiliate_id==a.id,AffiliateLink.active.is_(True)).first()
    code=link.referral_code if link else None
    return AffiliateProfile(public_id=a.public_id,affiliate_id=a.affiliate_id,name=a.name,status=a.status.value,category=a.category,referral_code=code,referral_link=f"{settings.public_app_url}/r/{code}" if code else None,aiatoz_referral_link=f"{settings.aiatoz_referral_base_url}/?ref={code}" if code else None,referral_code_status="active" if link and link.active else None)
@router.get("/dashboard",response_model=DashboardSummary)
def dashboard(a:Affiliate=Depends(current_affiliate),db:Session=Depends(get_db)): return DashboardSummary(**summary(db,a))
