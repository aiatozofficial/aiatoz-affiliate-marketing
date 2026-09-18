from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..models import Affiliate, AffiliateLink, Conversion, CommissionRule, CommissionStatus, ApplicationStatus, Course
from ..core.exceptions import BusinessError
from ..core.logging import logger
from ..utils.ids import public_id
from ..schemas.conversion import ConversionCreate
from .commission_service import select_rule, calculate_amount

def _now():
    return datetime.now(timezone.utc)

def _find_affiliate_by_referral(db: Session, referral_code: str):
    code = referral_code.strip().upper()
    link = db.query(AffiliateLink).filter(AffiliateLink.referral_code == code, AffiliateLink.active.is_(True)).first()
    if not link:
        raise BusinessError("INVALID_REFERRAL_CODE", "This referral code is invalid or inactive.", 404)
    affiliate = db.query(Affiliate).filter(Affiliate.id == link.affiliate_id).first()
    if not affiliate or affiliate.status not in (ApplicationStatus.APPROVED, ApplicationStatus.ACTIVE):
        raise BusinessError("AFFILIATE_INACTIVE", "Affiliate is not eligible to receive commissions.", 403)
    return affiliate, link

def _resolve_commission(db: Session, payload: ConversionCreate, sale_amount: Decimal):
    # Try to map product_id to Course if exists; else use global rule
    course_id = None
    campaign_id = None
    if payload.product_id:
        course = db.query(Course).filter(
            (Course.public_id == payload.product_id) | (Course.slug == payload.product_id)
        ).first()
        if course:
            course_id = course.id
            # need dummy course for price calc; we use sale_amount as price
            dummy_course = course
        else:
            dummy_course = None
    else:
        dummy_course = None

    # Reuse commission_service select_rule: if we have course_id use it else global
    if course_id is not None:
        rule = select_rule(db, course_id, campaign_id)
    else:
        # fallback: most generic rule (priority order where course_id is null)
        from sqlalchemy import or_
        q = db.query(CommissionRule).filter(CommissionRule.active.is_(True), CommissionRule.course_id.is_(None))
        if campaign_id:
            q = q.filter(or_(CommissionRule.campaign_id == campaign_id, CommissionRule.campaign_id.is_(None)))
        rule = q.order_by(CommissionRule.priority.asc()).first()

    if not rule:
        # If no rule configured, use default 15% fallback and snapshot it without FK
        logger.warning("commission_rule_not_found_using_default", extra={"product_id": payload.product_id})
        class DefaultRule:
            percentage = Decimal("15.00")
            fixed_amount = None
            id = None
        rule = DefaultRule()
        amount = (sale_amount * Decimal("15.00") / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return amount, None, Decimal("15.00"), None
    else:
        amount = calculate_amount(sale_amount, rule)
        return amount, rule.id, rule.percentage, rule.fixed_amount

def create_conversion(db: Session, payload: ConversionCreate):
    # Validate idempotency first: check existing conversion_id or order_id
    existing = db.query(Conversion).filter(Conversion.conversion_id == payload.conversion_id.strip()).first()
    if existing:
        logger.info("conversion_duplicate_conversion_id", extra={"conversion_id": payload.conversion_id})
        return existing, True

    # Also check duplicate order_id (different conversion_id but same order)
    existing_order = db.query(Conversion).filter(Conversion.order_id == payload.order_id.strip()).first()
    if existing_order:
        # order_id must be unique; treat as conflict if different conversion_id
        raise BusinessError("DUPLICATE_ORDER", "This order has already been recorded.", 409)

    affiliate, link = _find_affiliate_by_referral(db, payload.referral_code)

    # Validate purchased_at not in future too far? Just parse already validated by pydantic
    purchased_at = payload.purchased_at or _now()
    if purchased_at.tzinfo is None:
        purchased_at = purchased_at.replace(tzinfo=timezone.utc)

    # Commission calculation is server-side authoritative
    commission_amount, rule_id, pct_snapshot, fixed_snapshot = _resolve_commission(db, payload, payload.sale_amount)

    status = CommissionStatus.APPROVED
    if payload.status:
        s = payload.status.strip().upper()
        if s in (CommissionStatus.PENDING.value, CommissionStatus.APPROVED.value):
            status = CommissionStatus(s)
        else:
            raise BusinessError("VALIDATION_ERROR", "Status must be pending or approved.", 422)

    conversion = Conversion(
        public_id=public_id(),
        conversion_id=payload.conversion_id.strip(),
        order_id=payload.order_id.strip(),
        affiliate_id=affiliate.id,
        affiliate_link_id=link.id,
        referral_code=link.referral_code,
        customer_id=payload.customer_id.strip() if payload.customer_id else None,
        product_id=payload.product_id.strip() if payload.product_id else None,
        product_name=payload.product_name.strip() if payload.product_name else None,
        sale_amount=Decimal(payload.sale_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        currency=payload.currency.upper(),
        commission_amount=commission_amount,
        commission_rule_id=rule_id,
        percentage_snapshot=pct_snapshot,
        fixed_amount_snapshot=fixed_snapshot,
        status=status,
        purchased_at=purchased_at,
    )
    try:
        db.add(conversion)
        db.commit()
        db.refresh(conversion)
        # audit
        from .audit_service import audit
        audit(db, None, "CONVERSION_CREATED", "Conversion", conversion.public_id, {
            "conversion_id": conversion.conversion_id,
            "order_id": conversion.order_id,
            "affiliate_id": affiliate.affiliate_id,
            "sale_amount": str(conversion.sale_amount),
            "commission_amount": str(conversion.commission_amount),
        })
        db.commit()
        logger.info("conversion_created", extra={"conversion_id": conversion.conversion_id, "affiliate": affiliate.affiliate_id})
    except IntegrityError as e:
        db.rollback()
        logger.warning("conversion_integrity_error", extra={"error": str(e.orig)})
        # Race condition: re-check existing
        existing = db.query(Conversion).filter(Conversion.conversion_id == payload.conversion_id.strip()).first()
        if existing:
            return existing, True
        raise BusinessError("CONFLICT", "The requested record conflicts with existing data.", 409)
    return conversion, False

def reverse_conversion(db: Session, conversion_id: str, reason: str | None = None):
    conv = db.query(Conversion).filter(Conversion.conversion_id == conversion_id.strip()).first()
    if not conv:
        raise BusinessError("NOT_FOUND", "Conversion not found.", 404)
    if conv.status == CommissionStatus.REVERSED:
        logger.info("conversion_already_reversed", extra={"conversion_id": conversion_id})
        return conv, True
    if conv.status not in (CommissionStatus.APPROVED, CommissionStatus.PENDING):
        raise BusinessError("INVALID_STATE_TRANSITION", "Only approved or pending conversions can be reversed.", 409)
    conv.status = CommissionStatus.REVERSED
    conv.reversed_at = _now()
    conv.reversal_reason = reason.strip() if reason else None
    from .audit_service import audit
    audit(db, None, "CONVERSION_REVERSED", "Conversion", conv.public_id, {
        "conversion_id": conv.conversion_id,
        "order_id": conv.order_id,
        "reason": reason,
    })
    db.commit()
    logger.info("conversion_reversed", extra={"conversion_id": conversion_id})
    return conv, False

def get_conversions_for_affiliate(db: Session, affiliate_id: int, page: int = 1, page_size: int = 20, status: str | None = None):
    q = db.query(Conversion).filter(Conversion.affiliate_id == affiliate_id)
    if status:
        try:
            st = CommissionStatus(status.upper())
            q = q.filter(Conversion.status == st)
        except ValueError:
            raise BusinessError("VALIDATION_ERROR", f"Invalid status {status}", 422)
    total = q.count()
    items = q.order_by(Conversion.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, items

def get_all_conversions(db: Session, page: int = 1, page_size: int = 20, status: str | None = None, referral_code: str | None = None, order_id: str | None = None):
    q = db.query(Conversion)
    if status:
        try:
            st = CommissionStatus(status.upper())
            q = q.filter(Conversion.status == st)
        except ValueError:
            raise BusinessError("VALIDATION_ERROR", f"Invalid status {status}", 422)
    if referral_code:
        q = q.filter(Conversion.referral_code == referral_code.strip().upper())
    if order_id:
        q = q.filter(Conversion.order_id == order_id.strip())
    total = q.count()
    items = q.order_by(Conversion.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, items
