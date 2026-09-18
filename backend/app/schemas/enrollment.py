from decimal import Decimal
from pydantic import BaseModel, Field
class EnrollmentCreate(BaseModel): lead_id:str; course_id:str; campaign_id:str|None=None; external_reference:str|None=None; course_price:Decimal|None=None
class CommissionOut(BaseModel): public_id:str; amount:Decimal; currency:str; status:str
