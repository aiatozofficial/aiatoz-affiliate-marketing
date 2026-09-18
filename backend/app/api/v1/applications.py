from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import require_roles
from ...models import AffiliateApplication, ApplicationStatus, User
from ...schemas.application import ApplicationCreate, ApplicationOut
from ...services.application_service import create_application, update_status
from ...services.affiliate_service import approve_application
from ...utils.json import loads
router=APIRouter(prefix="/applications",tags=["Applications"])
def _to_detail(x: AffiliateApplication):
    try:
        pls=loads(x.platforms) if x.platforms else []
        if not isinstance(pls, list): pls=[]
    except: pls=[]
    return {
        "public_id": x.public_id,
        "name": x.name,
        "email": x.email,
        "phone": x.phone,
        "instagram": x.instagram,
        "youtube": x.youtube,
        "linkedin": x.linkedin,
        "website": x.website,
        "audienceSize": x.audience_size,
        "audience_size": x.audience_size,
        "socialMediaFollowers": x.social_media_followers,
        "contentCategory": x.content_category,
        "content_category": x.content_category,
        "platforms": pls,
        "category": x.category,
        "targetAudience": x.target_audience,
        "target_audience": x.target_audience,
        "audienceType": x.audience_type,
        "audience_type": x.audience_type,
        "audienceLocation": x.audience_location,
        "audience_location": x.audience_location,
        "mainPlatform": x.main_platform,
        "main_platform": x.main_platform,
        "averageReach": x.average_reach,
        "average_reach": x.average_reach,
        "affiliateExperience": x.affiliate_experience,
        "affiliate_experience": x.affiliate_experience,
        "previousExperience": x.previous_experience,
        "previous_experience": x.previous_experience,
        "status": x.status.value,
        "created_at": x.created_at.isoformat(),
        "review_notes": x.review_notes,
    }
@router.post("",status_code=201)
def submit(payload:ApplicationCreate,db:Session=Depends(get_db)):
    obj=create_application(db,payload); return {"success":True,"data":{"public_id":obj.public_id,"status":obj.status.value},"message":"Application received. Your application is currently under review."}
@router.get("/{public_id}")
def get_status(public_id:str,db:Session=Depends(get_db)):
    obj=db.query(AffiliateApplication).filter(AffiliateApplication.public_id==public_id).first()
    if not obj: return {"success":False,"error":{"code":"NOT_FOUND","message":"Application not found."}}
    messages={ApplicationStatus.PENDING:"Application received. Your application is currently under review.",ApplicationStatus.APPROVED:"Congratulations! Your affiliate application has been approved.",ApplicationStatus.ACTIVE:"Your affiliate account is active.",ApplicationStatus.REJECTED:"Your application was not approved at this time.",ApplicationStatus.ON_HOLD:"Your application requires additional review/action."}
    detail=_to_detail(obj)
    detail["message"]=messages[obj.status]
    return {"success":True,"data":detail}
@router.get("",dependencies=[Depends(require_roles("ADMIN","STAFF"))])
def list_applications(db:Session=Depends(get_db),status:ApplicationStatus|None=None,page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100)):
    q=db.query(AffiliateApplication)
    if status:q=q.filter(AffiliateApplication.status==status)
    total=q.count(); items=q.order_by(AffiliateApplication.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"success":True,"data":{"items":[_to_detail(x) for x in items],"page":page,"page_size":page_size,"total":total}}
@router.patch("/{public_id}/status")
def status_update(public_id:str,status:ApplicationStatus,notes:str|None=None,db:Session=Depends(get_db),actor:User=Depends(require_roles("ADMIN","STAFF"))):
    obj=db.query(AffiliateApplication).filter(AffiliateApplication.public_id==public_id).first()
    if not obj: from ...core.exceptions import BusinessError; raise BusinessError("NOT_FOUND","Application not found.",404)
    if status==ApplicationStatus.APPROVED:
        affiliate,link=approve_application(db,obj,actor); return {"success":True,"data":{"status":"APPROVED","affiliate_id":affiliate.affiliate_id,"referral_code":link.referral_code},"message":"Affiliate approved."}
    obj=update_status(db,obj,status,actor.id,notes); return {"success":True,"data":{"status":obj.status.value},"message":"Application status updated."}

@router.patch("/{public_id}/activate")
def activate(public_id:str,db:Session=Depends(get_db),actor:User=Depends(require_roles("ADMIN","STAFF"))):
    from ...core.exceptions import BusinessError
    from ...models import Affiliate
    obj=db.query(AffiliateApplication).filter(AffiliateApplication.public_id==public_id).first()
    if not obj: raise BusinessError("NOT_FOUND","Application not found.",404)
    if obj.status!=ApplicationStatus.APPROVED: raise BusinessError("INVALID_STATE_TRANSITION","Only approved applications can be activated.",409)
    affiliate=db.query(Affiliate).join(User,Affiliate.user_id==User.id).filter(User.email==obj.email).first()
    if not affiliate: raise BusinessError("AFFILIATE_NOT_FOUND","Affiliate profile not found.",404)
    affiliate.status=ApplicationStatus.ACTIVE; obj.status=ApplicationStatus.ACTIVE
    from ...services.audit_service import audit
    audit(db,actor.id,"AFFILIATE_ACTIVATED","Affiliate",affiliate.public_id); db.commit()
    return {"success":True,"data":{"status":"ACTIVE","affiliate_id":affiliate.affiliate_id},"message":"Your affiliate account is active."}
