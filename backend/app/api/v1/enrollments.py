from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...models import User
from ...schemas.enrollment import EnrollmentCreate
from ...services.enrollment_service import create_enrollment
router=APIRouter(prefix="/enrollments",tags=["Enrollments"])
@router.post("",dependencies=[Depends(require_roles("ADMIN","SALES","STAFF"))],status_code=201)
def create(payload:EnrollmentCreate,db:Session=Depends(get_db)):
    enrollment,commission=create_enrollment(db,payload)
    return {"success":True,"data":{"enrollment_id":enrollment.public_id,"status":enrollment.status.value,"commission":{"public_id":commission.public_id,"amount":str(commission.amount),"currency":commission.currency,"status":commission.status.value} if commission else None}}
