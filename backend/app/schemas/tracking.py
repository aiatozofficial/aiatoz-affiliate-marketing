from pydantic import BaseModel, Field
class ReferralClick(BaseModel): referral_code:str=Field(min_length=3,max_length=80); session_id:str|None=None; landing_path:str|None=None; referrer:str|None=None; utm_source:str|None=None; utm_medium:str|None=None; utm_campaign:str|None=None
class TrackingEventCreate(BaseModel): event_type:str; referral_code:str|None=None; session_id:str|None=None; entity_id:str|None=None; metadata:dict={}
