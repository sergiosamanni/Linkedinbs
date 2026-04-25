
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime

class ApiKeys(BaseModel):
    gemini: Optional[str] = None
    openai: Optional[str] = None
    anthropic: Optional[str] = None
    openrouter: Optional[str] = None
    deepseek: Optional[str] = None

class UserSettings(BaseModel):
    preferredModel: str = "gemini-pro" # gemini-pro, gemini-flash, openai, anthropic, openrouter, deepseek
    useCustomKeys: bool = False

class LinkedinAuth(BaseModel):
    clientId: Optional[str] = None
    clientSecret: Optional[str] = None
    accessToken: Optional[str] = None
    expiresAt: Optional[datetime] = None
    personUrn: Optional[str] = None # L'ID unico dell'utente su LinkedIn

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "user" # "admin" or "user"
    avatarUrl: Optional[str] = None
    apiKeys: ApiKeys = Field(default_factory=ApiKeys)
    settings: UserSettings = Field(default_factory=UserSettings)
    linkedinAuth: Optional[LinkedinAuth] = Field(default_factory=LinkedinAuth)

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UserOut(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Modello per aggiornare solo i settings/keys
class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatarUrl: Optional[str] = None
    apiKeys: Optional[ApiKeys] = None
    settings: Optional[UserSettings] = None
    linkedinAuth: Optional[LinkedinAuth] = None
