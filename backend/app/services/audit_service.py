import json
from sqlalchemy.orm import Session
from ..models import AuditLog

def audit(db:Session, actor_user_id:int|None, action:str, entity_type:str, entity_id:str|None, metadata:dict|None=None):
    db.add(AuditLog(actor_user_id=actor_user_id, action=action, entity_type=entity_type, entity_id=entity_id, metadata_json=json.dumps(metadata or {}, default=str)))
