from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator
from typing import Any
class ApplicationCreate(BaseModel):
    name: str = Field(min_length=2,max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8,max_length=40)
    instagram: str|None = None; youtube: str|None = None; linkedin: str|None = None; website: str|None = None
    audienceSize: str|None = None; socialMediaFollowers: str|None = None; contentCategory: str|None = None
    platforms: list[str] = Field(default_factory=list)
    category: str = Field(min_length=2,max_length=160)
    targetAudience: str = Field(min_length=2)
    audienceType: str|None = None; audienceLocation: str = Field(min_length=2,max_length=160)
    mainPlatform: str = Field(min_length=2,max_length=80); averageReach: str|None = None
    affiliateExperience: str = Field(pattern="^(Yes|No)$")
    previousExperience: str|None = None
    idempotencyKey: str|None = Field(default=None,max_length=100)
    @field_validator("platforms")
    @classmethod
    def platforms_not_empty(cls,v):
        if not v: raise ValueError("Select at least one platform.")
        return v
class ApplicationOut(BaseModel):
    public_id: str; status: str; message: str
