from pydantic import BaseModel, EmailStr, Field
class LeadCreate(BaseModel):
    name:str=Field(min_length=2,max_length=120); phone:str=Field(min_length=8,max_length=40); email:EmailStr
    course_interest:str|None=None; student_professional_status:str|None=None; location:str|None=None
    referral_code:str|None=None; session_id:str|None=None
class LeadOut(BaseModel): public_id:str; name:str; email:EmailStr; phone:str; status:str; affiliate_id:str|None=None; source:str
