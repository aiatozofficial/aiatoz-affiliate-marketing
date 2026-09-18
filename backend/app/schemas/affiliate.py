from pydantic import BaseModel
class AffiliateProfile(BaseModel): public_id: str; affiliate_id: str; name: str; status: str; category: str; referral_code: str|None = None; referral_link: str|None = None; aiatoz_referral_link: str|None = None; referral_code_status: str|None = None
class DashboardSummary(BaseModel):
    clicks:int=0; leads:int=0; connected_leads:int=0; qualified_leads:int=0; counselling:int=0; enrollments:int=0
    pending_commission:float=0; approved_commission:float=0; paid_commission:float=0; total_payout:float=0
    # conversion metrics (AI AtoZ integration)
    conversions:int=0; conversions_total:int=0; reversed_conversions:int=0
    total_sales:float=0; total_revenue:float=0
    pending_conversions:int=0; approved_conversions:int=0
    reversed_commission:float=0
