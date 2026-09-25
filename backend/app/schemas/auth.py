from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
class LoginRequest(BaseModel): email: EmailStr; password: str = Field(min_length=8,max_length=128)
class ForgotPasswordRequest(BaseModel): email: EmailStr
class ResetPasswordRequest(BaseModel): token: str = Field(min_length=10); newPassword: str = Field(min_length=8, max_length=128); confirmPassword: str | None = None
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    public_id: str; name: str; email: EmailStr; role: str; is_active: bool
class TokenResponse(BaseModel): access_token: str; token_type: str = "bearer"; user: UserOut
class AffiliateRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=40)
    password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters")
    confirmPassword: str | None = Field(default=None, min_length=8, max_length=128)
    # optional affiliate-profile fields (kept optional for minimal registration)
    instagram: str | None = None
    youtube: str | None = None
    linkedin: str | None = None
    website: str | None = None
    audienceSize: str | None = None
    contentCategory: str | None = None
    platforms: list[str] = Field(default_factory=list)
    category: str | None = Field(default=None, max_length=160)
    targetAudience: str | None = None
    audienceLocation: str | None = None
    mainPlatform: str | None = None
    averageReach: str | None = None
    affiliateExperience: str | None = Field(default=None, pattern="^(Yes|No)$")
    @field_validator("platforms")
    @classmethod
    def validate_platforms(cls, v):
        return v or []
    @field_validator("instagram", "youtube", "linkedin", "website")
    @classmethod
    def validate_url(cls, v):
        if v and v.strip() and not v.strip().startswith("https://"):
            raise ValueError("Use a full URL starting with https://")
        return v.strip() if isinstance(v, str) and v.strip() else None

class AdminRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, min_length=8, max_length=40)
    password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters")
    confirmPassword: str | None = Field(default=None, min_length=8, max_length=128)
