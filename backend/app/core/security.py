from datetime import datetime, timedelta, timezone
import hashlib, hmac, os
import jwt
from .config import settings

ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"

def verify_password(password: str, encoded: str) -> bool:
    try:
        if not isinstance(password, str) or not isinstance(encoded, str):
            return False
        _, salt_hex, digest_hex = encoded.split("$", 2)
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        # Malformed/legacy hashes must fail closed as bad credentials,
        # never bubble up as a 500 during sign in.
        return False

def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "role": role, "type": "access", "iat": now, "exp": now + timedelta(minutes=settings.access_token_expire_minutes)}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
