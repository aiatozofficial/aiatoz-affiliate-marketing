from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import current_affiliate
from ...models import ContentAsset, Affiliate
router=APIRouter(prefix="/content",tags=["Content Kit"])
@router.get("/kit")
def kit(db:Session=Depends(get_db),affiliate:Affiliate=Depends(current_affiliate)):
    items=db.query(ContentAsset).filter(ContentAsset.active.is_(True)).order_by(ContentAsset.created_at.desc()).all()
    return {"success":True,"data":{"items":[{"public_id":x.public_id,"title":x.title,"description":x.description,"asset_type":x.asset_type,"url":x.url} for x in items]}}
