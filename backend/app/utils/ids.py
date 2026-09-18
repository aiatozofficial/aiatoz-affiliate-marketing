import secrets, string, uuid

def public_id() -> str: return str(uuid.uuid4())
def short_code(prefix: str, length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return f"{prefix}-{''.join(secrets.choice(alphabet) for _ in range(length))}"
