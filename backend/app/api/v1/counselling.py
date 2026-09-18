from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...models import Counselling, Lead, CounsellingStatus, LeadStatus
from ...core.exceptions import BusinessError
from ...utils.ids import public_id
router=APIRouter(prefix="/counselling",tags=["Counselling"])
@router.post("",dependencies=[Depends(require_roles("ADMIN","SALES","STAFF"))],status_code=201)
def create(lead_id:str,scheduled_at:datetime|None=None,db:Session=Depends(get_db)):
    lead=db.query(Lead).filter(Lead.public_id==lead_id).first()
    if not lead: raise BusinessError("NOT_FOUND","Lead not found.",404)
    x=Counselling(public_id=public_id(),lead_id=lead.id,scheduled_at=scheduled_at,status=CounsellingStatus.SCHEDULED);lead.status=LeadStatus.COUNSELLING;db.add(x);db.commit();return {"success":True,"data":{"public_id":x.public_id,"status":x.status.value}}
@router.patch("/{public_id}",dependencies=[Depends(require_roles("ADMIN","SALES","STAFF"))])
def update(public_id:str,status:CounsellingStatus,notes:str|None=None,outcome:str|None=None,db:Session=Depends(get_db)):
    x=db.query(Counselling).filter(Counselling.public_id==public_id).first()
    if not x: raise BusinessError("NOT_FOUND","Counselling record not found.",404)
    x.status=status;x.notes=notes;x.outcome=outcome
    if status==CounsellingStatus.COMPLETED:x.completed_at=datetime.now(timezone.utc)
    db.commit();return {"success":True,"data":{"public_id":x.public_id,"status":x.status.value}}
