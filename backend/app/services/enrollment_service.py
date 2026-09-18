from decimal import Decimal
from sqlalchemy.orm import Session
from ..models import Lead, Course, Enrollment, EnrollmentStatus, Affiliate
from ..core.exceptions import BusinessError
from ..utils.ids import public_id
from .commission_service import create_for_enrollment

def create_enrollment(db:Session,payload):
    lead=db.query(Lead).filter(Lead.public_id==payload.lead_id).first()
    if not lead: raise BusinessError("NOT_FOUND","Lead not found.",404)
    course=db.query(Course).filter(Course.public_id==payload.course_id,Course.active.is_(True)).first()
    if not course: raise BusinessError("NOT_FOUND","Course not found.",404)
    if payload.external_reference and db.query(Enrollment).filter(Enrollment.external_reference==payload.external_reference).first(): raise BusinessError("DUPLICATE_ENROLLMENT","This enrollment reference already exists.",409)
    price=Decimal(payload.course_price) if payload.course_price is not None else Decimal(course.price)
    enrollment=Enrollment(public_id=public_id(),lead_id=lead.id,affiliate_id=lead.affiliate_id,course_id=course.id,campaign_id=None,external_reference=payload.external_reference,status=EnrollmentStatus.CONFIRMED,course_price_snapshot=price,currency=course.currency)
    db.add(enrollment); db.flush()
    if lead.affiliate_id:
        affiliate=db.query(Affiliate).filter(Affiliate.id==lead.affiliate_id).first(); commission=create_for_enrollment(db,enrollment,affiliate,lead,course)
    else: commission=None
    db.commit(); return enrollment,commission
