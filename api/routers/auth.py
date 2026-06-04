from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

router = APIRouter()

# Simple models
class LoginIn(BaseModel):
    username: str
    password: str

# DEMO BYPASS: Herhangi bir token kabul edilecek
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

@router.post("/login")
def login(payload: LoginIn):
    # JURY/DEMO MODE: No database check, always success
    # Herkes 'demo_token' ile giriş yapabilir
    return {
        "access_token": "demo_token_for_jury",
        "token_type": "bearer"
    }

@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    # JURY/DEMO MODE: Always return a dummy user for the frontend
    return {
        "username": "demo",
        "user_id": 1,
        "role": "admin",
        "full_name": "Demo Admin"
    }
