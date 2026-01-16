from pydantic import BaseModel, EmailStr
from typing import Optional

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_admin: bool
    locale: Optional[str] = "fr"
    theme: Optional[str] = "dark"
    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "username": "alice",
                "email": "alice@example.com",
                "is_admin": False,
                "locale": "fr",
                "theme": "dark"
            }
        }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }

class RegisterResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    class Config:
        schema_extra = {
            "example": {
                "id": 2,
                "username": "bob",
                "email": "bob@example.com"
            }
        }

class OkResponse(BaseModel):
    ok: bool
    class Config:
        schema_extra = {
            "example": {"ok": True}
        }
