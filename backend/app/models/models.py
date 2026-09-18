from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base
from .enums import *

def now(): return datetime.now(timezone.utc)

def enum_col(enum_cls): return SAEnum(enum_cls, native_enum=False, validate_strings=True)

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)

class User(TimestampMixin, Base):
    __tablename__="users"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str|None] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(enum_col(Role), default=Role.AFFILIATE, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    affiliate: Mapped["Affiliate|None"] = relationship(back_populates="user", uselist=False)

class AffiliateApplication(TimestampMixin, Base):
    __tablename__="affiliate_applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), index=True)
    phone: Mapped[str] = mapped_column(String(40), index=True)
    instagram: Mapped[str|None] = mapped_column(String(500))
    youtube: Mapped[str|None] = mapped_column(String(500))
    linkedin: Mapped[str|None] = mapped_column(String(500))
    website: Mapped[str|None] = mapped_column(String(500))
    audience_size: Mapped[str|None] = mapped_column(String(80))
    social_media_followers: Mapped[str|None] = mapped_column(String(80))
    content_category: Mapped[str|None] = mapped_column(String(160))
    platforms: Mapped[str] = mapped_column(Text, default="[]")
    category: Mapped[str] = mapped_column(String(160))
    target_audience: Mapped[str] = mapped_column(Text)
    audience_type: Mapped[str|None] = mapped_column(String(160))
    audience_location: Mapped[str] = mapped_column(String(160))
    main_platform: Mapped[str] = mapped_column(String(80))
    average_reach: Mapped[str|None] = mapped_column(String(80))
    affiliate_experience: Mapped[str] = mapped_column(String(10))
    previous_experience: Mapped[str|None] = mapped_column(Text)
    status: Mapped[ApplicationStatus] = mapped_column(enum_col(ApplicationStatus), default=ApplicationStatus.PENDING, index=True)
    review_notes: Mapped[str|None] = mapped_column(Text)
    reviewed_by: Mapped[int|None] = mapped_column(ForeignKey("users.id"), nullable=True)

class Affiliate(TimestampMixin, Base):
    __tablename__="affiliates"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    affiliate_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[ApplicationStatus] = mapped_column(enum_col(ApplicationStatus), default=ApplicationStatus.APPROVED, index=True)
    category: Mapped[str] = mapped_column(String(160))
    user: Mapped[User] = relationship(back_populates="affiliate")
    links: Mapped[list["AffiliateLink"]] = relationship(back_populates="affiliate")

class Course(TimestampMixin, Base):
    __tablename__="courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str|None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12,2), default=Decimal("0"))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Campaign(TimestampMixin, Base):
    __tablename__="campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    start_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class AffiliateLink(TimestampMixin, Base):
    __tablename__="affiliate_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    referral_code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    campaign_id: Mapped[int|None] = mapped_column(ForeignKey("campaigns.id"), nullable=True, index=True)
    course_id: Mapped[int|None] = mapped_column(ForeignKey("courses.id"), nullable=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    affiliate: Mapped[Affiliate] = relationship(back_populates="links")

class Referral(TimestampMixin, Base):
    __tablename__="referrals"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    affiliate_link_id: Mapped[int] = mapped_column(ForeignKey("affiliate_links.id"), index=True)
    session_id: Mapped[str] = mapped_column(String(100), index=True)
    landing_path: Mapped[str|None] = mapped_column(String(500))
    referrer: Mapped[str|None] = mapped_column(String(500))
    utm_source: Mapped[str|None] = mapped_column(String(200))
    utm_medium: Mapped[str|None] = mapped_column(String(200))
    utm_campaign: Mapped[str|None] = mapped_column(String(200))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__=(Index("ix_referrals_affiliate_session","affiliate_id","session_id"),)

class TrackingEvent(TimestampMixin, Base):
    __tablename__="tracking_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[EventType] = mapped_column(enum_col(EventType), index=True)
    affiliate_id: Mapped[int|None] = mapped_column(ForeignKey("affiliates.id"), index=True)
    referral_id: Mapped[int|None] = mapped_column(ForeignKey("referrals.id"), index=True)
    session_id: Mapped[str|None] = mapped_column(String(100), index=True)
    entity_id: Mapped[str|None] = mapped_column(String(100))
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    __table_args__=(Index("ix_tracking_event_type_created","event_type","created_at"),)

class Lead(TimestampMixin, Base):
    __tablename__="leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    course_interest: Mapped[str|None] = mapped_column(String(200))
    student_professional_status: Mapped[str|None] = mapped_column(String(100))
    location: Mapped[str|None] = mapped_column(String(160))
    affiliate_id: Mapped[int|None] = mapped_column(ForeignKey("affiliates.id"), index=True)
    referral_id: Mapped[int|None] = mapped_column(ForeignKey("referrals.id"), index=True)
    campaign_id: Mapped[int|None] = mapped_column(ForeignKey("campaigns.id"), index=True)
    source: Mapped[str] = mapped_column(String(80), default="DIRECT")
    status: Mapped[LeadStatus] = mapped_column(enum_col(LeadStatus), default=LeadStatus.NEW, index=True)
    __table_args__=(Index("ix_leads_affiliate_created","affiliate_id","created_at"),)

class Counselling(TimestampMixin, Base):
    __tablename__="counsellings"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), index=True)
    counsellor_user_id: Mapped[int|None] = mapped_column(ForeignKey("users.id"), nullable=True)
    scheduled_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    status: Mapped[CounsellingStatus] = mapped_column(enum_col(CounsellingStatus), default=CounsellingStatus.SCHEDULED, index=True)
    notes: Mapped[str|None] = mapped_column(Text)
    outcome: Mapped[str|None] = mapped_column(String(200))

class CommissionRule(TimestampMixin, Base):
    __tablename__="commission_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    course_id: Mapped[int|None] = mapped_column(ForeignKey("courses.id"), index=True)
    campaign_id: Mapped[int|None] = mapped_column(ForeignKey("campaigns.id"), index=True)
    percentage: Mapped[Decimal|None] = mapped_column(Numeric(7,4), nullable=True)
    fixed_amount: Mapped[Decimal|None] = mapped_column(Numeric(12,2), nullable=True)
    effective_from: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    effective_until: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)

class Enrollment(TimestampMixin, Base):
    __tablename__="enrollments"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), index=True)
    affiliate_id: Mapped[int|None] = mapped_column(ForeignKey("affiliates.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    campaign_id: Mapped[int|None] = mapped_column(ForeignKey("campaigns.id"), index=True)
    external_reference: Mapped[str|None] = mapped_column(String(160), unique=True, nullable=True)
    status: Mapped[EnrollmentStatus] = mapped_column(enum_col(EnrollmentStatus), default=EnrollmentStatus.PENDING, index=True)
    course_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12,2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Commission(TimestampMixin, Base):
    __tablename__="commissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), index=True)
    enrollment_id: Mapped[int] = mapped_column(ForeignKey("enrollments.id"), unique=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    commission_rule_id: Mapped[int|None] = mapped_column(ForeignKey("commission_rules.id"), nullable=True)
    course_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12,2))
    percentage_snapshot: Mapped[Decimal|None] = mapped_column(Numeric(7,4), nullable=True)
    fixed_amount_snapshot: Mapped[Decimal|None] = mapped_column(Numeric(12,2), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12,2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[CommissionStatus] = mapped_column(enum_col(CommissionStatus), default=CommissionStatus.PENDING, index=True)
    approved_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))

class Payout(TimestampMixin, Base):
    __tablename__="payouts"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12,2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[PayoutStatus] = mapped_column(enum_col(PayoutStatus), default=PayoutStatus.PENDING, index=True)
    period_start: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    transaction_reference: Mapped[str|None] = mapped_column(String(160), unique=True, nullable=True)
    failure_reason: Mapped[str|None] = mapped_column(Text)

class PayoutCommission(Base):
    __tablename__="payout_commissions"
    payout_id: Mapped[int] = mapped_column(ForeignKey("payouts.id"), primary_key=True)
    commission_id: Mapped[int] = mapped_column(ForeignKey("commissions.id"), primary_key=True)

class ContentAsset(TimestampMixin, Base):
    __tablename__="content_assets"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    campaign_id: Mapped[int|None] = mapped_column(ForeignKey("campaigns.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str|None] = mapped_column(Text)
    asset_type: Mapped[str] = mapped_column(String(80))
    url: Mapped[str|None] = mapped_column(String(1000))
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class PerformanceEvent(TimestampMixin, Base):
    __tablename__="performance_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    affiliate_id: Mapped[int|None] = mapped_column(ForeignKey("affiliates.id"), index=True)
    event_type: Mapped[EventType] = mapped_column(enum_col(EventType), index=True)
    entity_id: Mapped[str|None] = mapped_column(String(100))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

class Conversion(TimestampMixin, Base):
    __tablename__="conversions"
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    conversion_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    order_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    affiliate_link_id: Mapped[int|None] = mapped_column(ForeignKey("affiliate_links.id"), nullable=True, index=True)
    referral_code: Mapped[str] = mapped_column(String(80), index=True)
    customer_id: Mapped[str|None] = mapped_column(String(100), nullable=True)
    product_id: Mapped[str|None] = mapped_column(String(100), nullable=True)
    product_name: Mapped[str|None] = mapped_column(String(200), nullable=True)
    sale_amount: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    commission_amount: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False)
    commission_rule_id: Mapped[int|None] = mapped_column(ForeignKey("commission_rules.id"), nullable=True)
    percentage_snapshot: Mapped[Decimal|None] = mapped_column(Numeric(7,4), nullable=True)
    fixed_amount_snapshot: Mapped[Decimal|None] = mapped_column(Numeric(12,2), nullable=True)
    status: Mapped[CommissionStatus] = mapped_column(enum_col(CommissionStatus), default=CommissionStatus.APPROVED, index=True)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reversed_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    reversal_reason: Mapped[str|None] = mapped_column(Text, nullable=True)
    affiliate: Mapped[Affiliate] = relationship(back_populates=None)
    __table_args__=(
        Index("ix_conversions_affiliate_created","affiliate_id","created_at"),
        Index("ix_conversions_status_created","status","created_at"),
        Index("ix_conversions_purchased_at","purchased_at"),
    )

class AuditLog(TimestampMixin, Base):
    __tablename__="audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int|None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120), index=True)
    entity_id: Mapped[str|None] = mapped_column(String(120), index=True)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")

class PasswordResetToken(TimestampMixin, Base):
    __tablename__="password_reset_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Index("ix_reset_user_expires", "user_id", "expires_at"),)

class Notification(TimestampMixin, Base):
    __tablename__="notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(80))
    read_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
