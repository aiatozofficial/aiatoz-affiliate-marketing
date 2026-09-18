from pydantic import BaseModel, ConfigDict
class ApiResponse(BaseModel):
    success: bool = True
    data: object | None = None
    message: str | None = None
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
