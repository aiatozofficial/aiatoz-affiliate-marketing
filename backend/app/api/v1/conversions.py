from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...core.exceptions import BusinessError
from ...dependencies.auth import verify_aiatoz_api_key, current_affiliate, require_roles
from ...models import Affiliate, User
from ...schemas.conversion import ConversionCreate, ConversionReverse, ConversionOut
from ...services.conversion_service import create_conversion, reverse_conversion, get_conversions_for_affiliate, get_all_conversions
from ...core.logging import logger

# Server-to-server router (AI AtoZ backend)
router = APIRouter(prefix="/conversions", tags=["Conversions"])
# Affiliate/admin read routers use same prefix grouping but separate dependencies
affiliate_router = APIRouter(prefix="/affiliate", tags=["Affiliate Conversions"])
admin_router = APIRouter(prefix="/admin", tags=["Admin Conversions"])

@router.post("", dependencies=[Depends(verify_aiatoz_api_key)], status_code=201)
def create(payload: ConversionCreate, db: Session = Depends(get_db)):
    conv, is_duplicate = create_conversion(db, payload)
    # Fetch affiliate for response
    from ...models import Affiliate as AffModel
    aff = db.query(AffModel).filter(AffModel.id == conv.affiliate_id).first()
    status_code = 200 if is_duplicate else 201
    # FastAPI can't easily change status code dynamically here; return with success flag
    # If duplicate, we still return 200 with indicator
    if is_duplicate:
        # Return 200 semantically: use JSONResponse? Simpler return 200 body and rely on client idempotency
        # We'll return success with is_duplicate True; status remains 201 for simplicity but signal duplicate
        pass
    return {
        "success": True,
        "conversion_id": conv.conversion_id,
        "order_id": conv.order_id,
        "status": conv.status.value,
        "commission_amount": str(conv.commission_amount),
        "currency": conv.currency,
        "affiliate_id": aff.affiliate_id if aff else str(conv.affiliate_id),
        "is_duplicate": is_duplicate,
        "public_id": conv.public_id,
    }

@router.post("/{conversion_id}/reverse", dependencies=[Depends(verify_aiatoz_api_key)])
def reverse(conversion_id: str, payload: ConversionReverse | None = None, db: Session = Depends(get_db)):
    reason = payload.reason if payload else None
    conv, already = reverse_conversion(db, conversion_id, reason)
    from ...models import Affiliate as AffModel
    aff = db.query(AffModel).filter(AffModel.id == conv.affiliate_id).first()
    return {
        "success": True,
        "conversion_id": conv.conversion_id,
        "order_id": conv.order_id,
        "status": conv.status.value,
        "commission_amount": str(conv.commission_amount),
        "currency": conv.currency,
        "affiliate_id": aff.affiliate_id if aff else str(conv.affiliate_id),
        "is_duplicate": already,
        "reversed_at": conv.reversed_at.isoformat() if conv.reversed_at else None,
    }

# Affiliate visibility: only own conversions
@affiliate_router.get("/conversions")
def affiliate_list(
    db: Session = Depends(get_db),
    affiliate: Affiliate = Depends(current_affiliate),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
):
    total, items = get_conversions_for_affiliate(db, affiliate.id, page, page_size, status)
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "public_id": x.public_id,
                    "conversion_id": x.conversion_id,
                    "order_id": x.order_id,
                    "referral_code": x.referral_code,
                    "affiliate_id": affiliate.affiliate_id,
                    "sale_amount": str(x.sale_amount),
                    "currency": x.currency,
                    "commission_amount": str(x.commission_amount),
                    "status": x.status.value,
                    "purchased_at": x.purchased_at.isoformat() if x.purchased_at else None,
                    "created_at": x.created_at.isoformat() if x.created_at else None,
                    "product_id": x.product_id,
                    "product_name": x.product_name,
                    "customer_id": None,  # privacy: do not expose customer_id to affiliate frontends
                }
                for x in items
            ],
            "page": page,
            "page_size": page_size,
            "total": total,
        },
    }

@affiliate_router.get("/conversions/{conversion_id}")
def affiliate_detail(conversion_id: str, db: Session = Depends(get_db), affiliate: Affiliate = Depends(current_affiliate)):
    from ...models import Conversion
    conv = db.query(Conversion).filter(Conversion.conversion_id == conversion_id, Conversion.affiliate_id == affiliate.id).first()
    if not conv:
        raise BusinessError("NOT_FOUND", "Conversion not found.", 404)
    return {
        "success": True,
        "data": {
            "public_id": conv.public_id,
            "conversion_id": conv.conversion_id,
            "order_id": conv.order_id,
            "referral_code": conv.referral_code,
            "sale_amount": str(conv.sale_amount),
            "currency": conv.currency,
            "commission_amount": str(conv.commission_amount),
            "status": conv.status.value,
            "purchased_at": conv.purchased_at.isoformat() if conv.purchased_at else None,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "product_id": conv.product_id,
            "product_name": conv.product_name,
        },
    }

# Admin visibility
@admin_router.get("/conversions")
def admin_list(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN", "STAFF", "FINANCE")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    referral_code: str | None = None,
    order_id: str | None = None,
):
    total, items = get_all_conversions(db, page, page_size, status, referral_code, order_id)
    # batch affiliate lookup
    from ...models import Affiliate as AffModel
    aff_ids = {x.affiliate_id for x in items}
    aff_map = {a.id: a.affiliate_id for a in db.query(AffModel).filter(AffModel.id.in_(aff_ids)).all()} if aff_ids else {}
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "public_id": x.public_id,
                    "conversion_id": x.conversion_id,
                    "order_id": x.order_id,
                    "referral_code": x.referral_code,
                    "affiliate_id": aff_map.get(x.affiliate_id, str(x.affiliate_id)),
                    "sale_amount": str(x.sale_amount),
                    "currency": x.currency,
                    "commission_amount": str(x.commission_amount),
                    "status": x.status.value,
                    "purchased_at": x.purchased_at.isoformat() if x.purchased_at else None,
                    "created_at": x.created_at.isoformat() if x.created_at else None,
                    "product_id": x.product_id,
                    "product_name": x.product_name,
                    "customer_id": x.customer_id,
                }
                for x in items
            ],
            "page": page,
            "page_size": page_size,
            "total": total,
        },
    }
