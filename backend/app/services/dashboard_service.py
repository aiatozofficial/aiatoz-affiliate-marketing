from sqlalchemy import func
from sqlalchemy.orm import Session
from ..models import Affiliate, TrackingEvent, EventType, Lead, LeadStatus, Counselling, CounsellingStatus, Enrollment, EnrollmentStatus, Commission, CommissionStatus, Payout, PayoutStatus, Conversion

def summary(db:Session,a:Affiliate):
    count=lambda q:int(q.scalar() or 0)
    clicks=count(db.query(func.count(TrackingEvent.id)).filter(TrackingEvent.affiliate_id==a.id,TrackingEvent.event_type==EventType.REFERRAL_CLICK))
    leads=count(db.query(func.count(Lead.id)).filter(Lead.affiliate_id==a.id))
    connected=count(db.query(func.count(Lead.id)).filter(Lead.affiliate_id==a.id,Lead.status==LeadStatus.CONNECTED))
    qualified=count(db.query(func.count(Lead.id)).filter(Lead.affiliate_id==a.id,Lead.status==LeadStatus.QUALIFIED))
    counselling=count(db.query(func.count(Counselling.id)).join(Lead,Counselling.lead_id==Lead.id).filter(Lead.affiliate_id==a.id,Counselling.status==CounsellingStatus.COMPLETED))
    enrollments=count(db.query(func.count(Enrollment.id)).filter(Enrollment.affiliate_id==a.id,Enrollment.status.in_([EnrollmentStatus.CONFIRMED,EnrollmentStatus.COMPLETED])))
    def amount(status): return float(db.query(func.coalesce(func.sum(Commission.amount),0)).filter(Commission.affiliate_id==a.id,Commission.status==status).scalar() or 0)
    paid=float(db.query(func.coalesce(func.sum(Payout.amount),0)).filter(Payout.affiliate_id==a.id,Payout.status==PayoutStatus.PAID).scalar() or 0)
    # Conversion aggregates (new integration)
    conversions=count(db.query(func.count(Conversion.id)).filter(Conversion.affiliate_id==a.id,Conversion.status!=CommissionStatus.REVERSED))
    conversions_total=count(db.query(func.count(Conversion.id)).filter(Conversion.affiliate_id==a.id))
    reversed_conversions=count(db.query(func.count(Conversion.id)).filter(Conversion.affiliate_id==a.id,Conversion.status==CommissionStatus.REVERSED))
    def conv_amount(status): return float(db.query(func.coalesce(func.sum(Conversion.commission_amount),0)).filter(Conversion.affiliate_id==a.id,Conversion.status==status).scalar() or 0)
    def conv_sale(status_filter=None):
        q=db.query(func.coalesce(func.sum(Conversion.sale_amount),0)).filter(Conversion.affiliate_id==a.id)
        if status_filter is not None:
            q=q.filter(Conversion.status==status_filter)
        else:
            q=q.filter(Conversion.status!=CommissionStatus.REVERSED)
        return float(q.scalar() or 0)
    total_sales = conv_sale()
    pending_c = conv_amount(CommissionStatus.PENDING) + amount(CommissionStatus.PENDING)
    approved_c = conv_amount(CommissionStatus.APPROVED) + amount(CommissionStatus.APPROVED)
    paid_c = conv_amount(CommissionStatus.PAID) + amount(CommissionStatus.PAID)
    reversed_c = conv_amount(CommissionStatus.REVERSED)
    # Prefer conversion commission if present; keep backward keys but enriched
    return dict(clicks=clicks,leads=leads,connected_leads=connected,qualified_leads=qualified,counselling=counselling,enrollments=enrollments,pending_commission=pending_c,approved_commission=approved_c,paid_commission=paid_c,total_payout=paid,
                conversions=conversions, conversions_total=conversions_total, reversed_conversions=reversed_conversions,
                total_sales=total_sales, total_revenue=total_sales,
                pending_conversions=count(db.query(func.count(Conversion.id)).filter(Conversion.affiliate_id==a.id,Conversion.status==CommissionStatus.PENDING)),
                approved_conversions=count(db.query(func.count(Conversion.id)).filter(Conversion.affiliate_id==a.id,Conversion.status==CommissionStatus.APPROVED)),
                reversed_commission=reversed_c)
