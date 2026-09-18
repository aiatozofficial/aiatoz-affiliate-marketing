from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...models import Lead, User
from ...schemas.lead import LeadCreate, LeadOut
from ...services.lead_service import create_lead
router=APIRouter(prefix="/leads",tags=["Leads"])
@router.post("",response_model=LeadOut,status_code=201)
def create(payload:LeadCreate,db:Session=Depends(get_db)):
    x=create_lead(db,payload); affiliate_code=None
    if x.affiliate_id:
        from ...models import Affiliate
        a=db.query(Affiliate).filter(Affiliate.id==x.affiliate_id).first(); affiliate_code=a.affiliate_id if a else None
    return LeadOut(public_id=x.public_id,name=x.name,email=x.email,phone=x.phone,status=x.status.value,affiliate_id=affiliate_code,source=x.source)
@router.get("",dependencies=[Depends(require_roles("ADMIN","SALES","STAFF"))])
def list_leads(db:Session=Depends(get_db),status=None,page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100)):
    q=db.query(Lead)
    if status:q=q.filter(Lead.status==status)
    total=q.count(); items=q.order_by(Lead.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"success":True,"data":{"items":[{"public_id":x.public_id,"name":x.name,"email":x.email,"phone":x.phone,"status":x.status.value,"source":x.source} for x in items],"page":page,"page_size":page_size,"total":total}}
