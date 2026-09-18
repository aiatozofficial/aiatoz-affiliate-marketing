from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...core.config import settings
from ...schemas.tracking import ReferralClick
from ...services.referral_service import resolve_click
router=APIRouter(prefix="/referrals",tags=["Referrals"])
@router.post("/click")
def click(payload:ReferralClick,db:Session=Depends(get_db)):
    ref,link=resolve_click(db,payload); return {"success":True,"data":{"session_id":ref.session_id,"referral_code":link.referral_code}}
@router.get("/{code}",include_in_schema=True)
def redirect(code:str,db:Session=Depends(get_db)):
    payload=ReferralClick(referral_code=code,landing_path="/",referrer=None)
    ref,_=resolve_click(db,payload)
    return RedirectResponse(url=f"{settings.public_app_url}/?ref={code}&sid={ref.session_id}",status_code=307)
