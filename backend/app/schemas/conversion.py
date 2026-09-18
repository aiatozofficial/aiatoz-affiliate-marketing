from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_CURRENCIES = {"INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"}

class ConversionCreate(BaseModel):
    conversion_id: str = Field(min_length=3, max_length=100, description="Unique idempotency key from AI AtoZ")
    referral_code: str = Field(min_length=3, max_length=80)
    order_id: str = Field(min_length=3, max_length=100)
    customer_id: Optional[str] = Field(default=None, max_length=100)
    product_id: Optional[str] = Field(default=None, max_length=100)
    product_name: Optional[str] = Field(default=None, max_length=200)
    sale_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    status: Optional[str] = Field(default=None, description="approved|pending")
    purchased_at: Optional[datetime] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        up = v.upper()
        if up not in ALLOWED_CURRENCIES:
            raise ValueError(f"Unsupported currency {v}. Allowed: {', '.join(sorted(ALLOWED_CURRENCIES))}")
        return up

    @field_validator("referral_code")
    @classmethod
    def normalize_referral(cls, v):
        return v.strip().upper() if v else v

    @field_validator("conversion_id", "order_id")
    @classmethod
    def strip_ids(cls, v):
        return v.strip() if isinstance(v, str) else v

class ConversionReverse(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)

class ConversionOut(BaseModel):
    public_id: str
    conversion_id: str
    order_id: str
    referral_code: str
    affiliate_id: str
    sale_amount: str
    currency: str
    commission_amount: str
    status: str
    purchased_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    customer_id: Optional[str] = None

class ConversionCreateResponse(BaseModel):
    success: bool = True
    conversion_id: str
    order_id: str
    status: str
    commission_amount: str
    currency: str
    affiliate_id: str
    is_duplicate: bool = False
