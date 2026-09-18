from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..models import CommissionRule, Commission, Enrollment, EnrollmentStatus, CommissionStatus, Affiliate, Lead, Course
from ..core.exceptions import BusinessError
from ..utils.ids import public_id

def select_rule(db:Session, course_id:int, campaign_id:int|None):
    q=db.query(CommissionRule).filter(CommissionRule.active.is_(True),or_(CommissionRule.course_id==course_id,CommissionRule.course_id.is_(None)))
    if campaign_id: q=q.filter(or_(CommissionRule.campaign_id==campaign_id,CommissionRule.campaign_id.is_(None)))
    return q.order_by(CommissionRule.priority.asc()).first()

def calculate_amount(price:Decimal, rule:CommissionRule):
    if rule.fixed_amount is not None: return Decimal(rule.fixed_amount).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)
    pct=Decimal(rule.percentage or 0)
    return (price*pct/Decimal(100)).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)

def create_for_enrollment(db:Session,enrollment:Enrollment,affiliate:Affiliate,lead:Lead,course:Course):
    if enrollment.status not in (EnrollmentStatus.CONFIRMED,EnrollmentStatus.COMPLETED): raise BusinessError("COMMISSION_NOT_ELIGIBLE","Commission is created only for confirmed/completed enrollments.",409)
    if db.query(Commission).filter(Commission.enrollment_id==enrollment.id).first(): return db.query(Commission).filter(Commission.enrollment_id==enrollment.id).first()
    rule=select_rule(db,course.id,enrollment.campaign_id)
    if not rule: raise BusinessError("COMMISSION_RULE_NOT_FOUND","No active commission rule is configured for this enrollment.",422)
    amount=calculate_amount(enrollment.course_price_snapshot,rule)
    commission=Commission(public_id=public_id(),affiliate_id=affiliate.id,lead_id=lead.id,enrollment_id=enrollment.id,course_id=course.id,commission_rule_id=rule.id,course_price_snapshot=enrollment.course_price_snapshot,percentage_snapshot=rule.percentage,fixed_amount_snapshot=rule.fixed_amount,amount=amount,currency=enrollment.currency,status=CommissionStatus.PENDING)
    db.add(commission); db.commit(); return commission
