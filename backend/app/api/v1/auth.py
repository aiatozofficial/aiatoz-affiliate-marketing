import hashlib, secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ...core.config import settings
from ...core.database import get_db
from ...core.security import verify_password, create_access_token, hash_password
from ...core.exceptions import BusinessError
from ...dependencies.auth import current_user
from ...models import User, Role, Affiliate, AffiliateApplication, ApplicationStatus, AffiliateLink, PasswordResetToken
from ...schemas.auth import LoginRequest, TokenResponse, UserOut, AffiliateRegisterRequest, ForgotPasswordRequest, ResetPasswordRequest
from ...utils.ids import public_id, short_code
from ...utils.json import dumps
router=APIRouter(prefix="/auth",tags=["Authentication"])

def _authenticate(db: Session, payload: LoginRequest, allowed_roles: set[str] | None = None):
    user=db.query(User).filter(User.email==payload.email.lower()).first()
    if not user or not verify_password(payload.password,user.password_hash):
        raise BusinessError("INVALID_CREDENTIALS","Email or password is incorrect.",401)
    if not user.is_active:
        raise BusinessError("ACCOUNT_INACTIVE","This account is inactive.",403)
    if allowed_roles is not None and user.role.value not in allowed_roles:
        # Separate authentication: role mismatch should be explicit
        if "ADMIN" in allowed_roles or "STAFF" in allowed_roles:
            raise BusinessError("FORBIDDEN","This login is for admin accounts only. Please use the affiliate login if you are an affiliate.",403)
        if "AFFILIATE" in allowed_roles:
            raise BusinessError("FORBIDDEN","This login is for affiliate accounts only. Please use the admin login if you are an admin.",403)
        raise BusinessError("FORBIDDEN","You do not have permission for this login.",403)
    user.last_login_at=datetime.now(timezone.utc); db.commit()
    return TokenResponse(access_token=create_access_token(user.public_id,user.role.value),user=UserOut.model_validate(user))

@router.post("/login",response_model=TokenResponse)
def login(payload:LoginRequest,db:Session=Depends(get_db)):
    return _authenticate(db, payload, allowed_roles=None)

@router.post("/affiliate/login",response_model=TokenResponse)
def affiliate_login(payload:LoginRequest,db:Session=Depends(get_db)):
    return _authenticate(db, payload, allowed_roles={"AFFILIATE"})

@router.post("/admin/login",response_model=TokenResponse)
def admin_login(payload:LoginRequest,db:Session=Depends(get_db)):
    return _authenticate(db, payload, allowed_roles={"ADMIN","STAFF"})
@router.post("/affiliate/register", response_model=TokenResponse, status_code=201)
def affiliate_register(payload: AffiliateRegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    phone = payload.phone.strip()
    # confirm password if provided
    if payload.confirmPassword and payload.password != payload.confirmPassword:
        raise BusinessError("VALIDATION_ERROR", "Passwords do not match.", 400)
    # check existing user
    if db.query(User).filter(User.email == email).first():
        raise BusinessError("DUPLICATE_EMAIL", "An account with this email already exists. Please sign in instead.", 409)
    # check duplicate application (pending/active) same email/phone
    existing_app = db.query(AffiliateApplication).filter(
        or_(AffiliateApplication.email == email, AffiliateApplication.phone == phone)
    ).filter(AffiliateApplication.status.in_([ApplicationStatus.PENDING, ApplicationStatus.ON_HOLD, ApplicationStatus.APPROVED, ApplicationStatus.ACTIVE])).first()
    if existing_app:
        raise BusinessError("DUPLICATE_APPLICATION", "An application with this email or phone already exists and is under review.", 409)
    # also check affiliate phone duplicate via users
    if db.query(User).filter(User.phone == phone).first():
        # allow same phone? but flag duplicate
        pass

    # create user
    user = User(
        public_id=public_id(),
        name=payload.name.strip(),
        email=email,
        phone=phone,
        password_hash=hash_password(payload.password),
        role=Role.AFFILIATE,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.flush()

    # create an application record for audit (status ACTIVE since self-registered with password)
    # use provided fields or sensible defaults
    category = (payload.category or "General").strip() if payload.category else "General"
    target_audience = (payload.targetAudience or "General audience").strip() if payload.targetAudience else "General audience"
    audience_location = (payload.audienceLocation or "India").strip() if payload.audienceLocation else "India"
    main_platform = (payload.mainPlatform or (payload.platforms[0] if payload.platforms else "Other"))
    platforms = payload.platforms if payload.platforms else [main_platform]
    content_cat = payload.contentCategory or "General"
    aff_exp = payload.affiliateExperience or "No"

    application = AffiliateApplication(
        public_id=public_id(),
        name=payload.name.strip(),
        email=email,
        phone=phone,
        instagram=payload.instagram,
        youtube=payload.youtube,
        linkedin=payload.linkedin,
        website=payload.website,
        audience_size=payload.audienceSize,
        content_category=content_cat,
        platforms=dumps(platforms),
        category=category,
        target_audience=target_audience,
        audience_location=audience_location,
        main_platform=main_platform,
        average_reach=payload.averageReach,
        affiliate_experience=aff_exp,
        previous_experience=None,
        status=ApplicationStatus.ACTIVE,
    )
    db.add(application)
    db.flush()

    # create affiliate profile + link immediately so user can access dashboard
    affiliate = Affiliate(
        public_id=public_id(),
        user_id=user.id,
        name=payload.name.strip(),
        affiliate_id=short_code("AFF", 8),
        status=ApplicationStatus.ACTIVE,
        category=category,
    )
    db.add(affiliate)
    db.flush()
    link = AffiliateLink(
        public_id=public_id(),
        affiliate_id=affiliate.id,
        referral_code=short_code("AIATOZ", 8),
        active=True,
    )
    db.add(link)
    # audit
    from ...services.audit_service import audit as audit_log
    try:
        audit_log(db, user.id, "AFFILIATE_REGISTERED", "Affiliate", affiliate.public_id, {"email": email})
        audit_log(db, user.id, "APPLICATION_SUBMITTED", "AffiliateApplication", application.public_id)
    except Exception:
        pass
    db.commit()
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return TokenResponse(access_token=create_access_token(user.public_id, user.role.value), user=UserOut.model_validate(user))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def _send_reset_email_bg(email: str, token: str, role: str):
    from ...services.email_service import send_reset_verification_email
    reset_link = f"{settings.public_app_url.rstrip('/')}/reset-password?token={token}"
    ok = send_reset_verification_email(email, reset_link, role)
    return ok

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    # Always return success to avoid email enumeration
    if not user or not user.is_active:
        return {"message": "If an account exists for that email, a verification link has been sent to your registered mail."}
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)
    prt = PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    db.add(prt); db.commit()
    # send synchronously in dev if SMTP not configured so outbox is immediate, else background
    from ...core.config import settings as _s
    from ...services.email_service import _smtp_configured
    if not _smtp_configured():
        # dev: send now so file is available immediately for browser preview
        _send_reset_email_bg(user.email, raw_token, user.role.value if hasattr(user.role, 'value') else str(user.role))
    else:
        background_tasks.add_task(_send_reset_email_bg, user.email, raw_token, user.role.value if hasattr(user.role, 'value') else str(user.role))
    resp = {"message": "If an account exists for that email, a verification link has been sent to your registered mail."}
    # expose reset_link in debug for browser verification (dev only)
    if _s.debug:
        resp["reset_link"] = f"{_s.public_app_url.rstrip('/')}/reset-password?token={raw_token}"
        resp["dev_note"] = "DEV: Gmail SMTP not configured — email saved to sent_emails.json and /api/v1/auth/dev/outbox. Configure SMTP_USER/PASSWORD for real delivery."
    return resp

@router.get("/dev/outbox")
def dev_outbox():
    """Dev only: list last sent reset emails (so browser can verify without real Gmail)."""
    from pathlib import Path
    from ...services.email_service import OUTBOX_PATH
    import json
    if not settings.debug:
        raise BusinessError("NOT_FOUND", "Not available", 404)
    if not OUTBOX_PATH.exists():
        return {"emails": []}
    try:
        data = json.loads(OUTBOX_PATH.read_text())
    except:
        data = []
    return {"emails": data[:10], "smtp_configured": bool(settings.smtp_user and settings.smtp_password), "smtp_host": settings.smtp_host}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.confirmPassword and payload.newPassword != payload.confirmPassword:
        raise BusinessError("VALIDATION_ERROR", "Passwords do not match.", 400)
    token_hash = _hash_token(payload.token)
    prt = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if not prt:
        raise BusinessError("INVALID_TOKEN", "Reset link is invalid or expired.", 400)
    if prt.used_at is not None:
        raise BusinessError("TOKEN_USED", "This reset link has already been used.", 400)
    exp = prt.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise BusinessError("TOKEN_EXPIRED", "Reset link has expired. Please request a new one.", 400)
    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user or not user.is_active:
        raise BusinessError("ACCOUNT_INACTIVE", "Account is inactive.", 403)
    user.password_hash = hash_password(payload.newPassword)
    prt.used_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password has been reset successfully. You can now sign in with your new password."}

@router.get("/me",response_model=UserOut)
def me(user:User=Depends(current_user)): return UserOut.model_validate(user)
