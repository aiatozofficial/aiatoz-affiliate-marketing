import hmac
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.security import decode_access_token
from ..core.exceptions import BusinessError
from ..models import User, Affiliate

def current_user(authorization: str|None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise BusinessError("AUTHENTICATION_REQUIRED","Authentication is required.",401)
    try: payload=decode_access_token(authorization.split(" ",1)[1])
    except Exception: raise BusinessError("INVALID_TOKEN","Session is invalid or expired.",401)
    user=db.query(User).filter(User.public_id==payload.get("sub"), User.is_active.is_(True)).first()
    if not user: raise BusinessError("AUTHENTICATION_REQUIRED","Authentication is required.",401)
    return user

def require_roles(*roles):
    def dependency(user: User = Depends(current_user)):
        if user.role.value not in roles: raise BusinessError("FORBIDDEN","You do not have permission for this action.",403)
        return user
    return dependency

def current_affiliate(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Affiliate:
    affiliate=db.query(Affiliate).filter(Affiliate.user_id==user.id).first()
    if not affiliate: raise BusinessError("AFFILIATE_NOT_FOUND","Affiliate profile not found.",404)
    return affiliate

def verify_aiatoz_api_key(authorization: str|None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise BusinessError("AUTHENTICATION_REQUIRED","Server-to-server authentication required.",401)
    token=authorization.split(" ",1)[1].strip()
    expected=(settings.aiatoz_api_key or "").strip()
    if not expected or expected=="replace-with-secure-production-secret":
        # In development, warn but still enforce: missing key means reject
        raise BusinessError("SERVER_CONFIGURATION_ERROR","AIATOZ API key is not configured.",500)
    if not hmac.compare_digest(token, expected):
        raise BusinessError("INVALID_API_KEY","Invalid API key.",401)
    return True
