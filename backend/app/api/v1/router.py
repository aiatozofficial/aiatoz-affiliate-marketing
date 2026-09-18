from fastapi import APIRouter
from .auth import router as auth
from .applications import router as applications
from .referrals import router as referrals
from .tracking import router as tracking
from .leads import router as leads
from .dashboard import router as dashboard
from .enrollments import router as enrollments
from .finance import router as finance
from .content import router as content
from .counselling import router as counselling
from .performance import router as performance
from .affiliate_lists import router as affiliate_lists
from .admin import router as admin
from .conversions import router as conversions, affiliate_router as affiliate_conversions, admin_router as admin_conversions
api_router=APIRouter(prefix="/api/v1")
for r in (auth,applications,referrals,tracking,leads,dashboard,enrollments,finance,content,counselling,performance,affiliate_lists,admin,conversions,affiliate_conversions,admin_conversions): api_router.include_router(r)
