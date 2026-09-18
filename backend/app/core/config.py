from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    database_url: str = "sqlite:///./affiliate.db"
    secret_key: str = "dev-secret-key-change-me-please-32chars-minimum!"
    jwt_secret_key: str = "dev-secret-key-change-me-please-32chars-minimum!"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    public_app_url: str = "http://localhost:5173"
    admin_email: str = "admin@example.com"
    admin_password: str = "ChangeMe123!"
    aiatoz_api_key: str = "replace-with-secure-production-secret"
    aiatoz_referral_base_url: str = "https://aiatoz.org"
    # Gmail SMTP for password reset verification
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_from_name: str = "AI A to Z"
    smtp_use_tls: bool = True
    reset_token_expire_minutes: int = 15
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), case_sensitive=False, extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
