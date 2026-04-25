
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from routes.auth import get_current_user
from models.user import UserInDB
import os
import urllib.parse
from bson import ObjectId

router = APIRouter()

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USER_INFO_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"

@router.get("/auth_url")
async def get_linkedin_auth_url(project_id: str, current_user: dict = Depends(get_current_user)):
    # Le chiavi dell'app rimangono a livello utente (globali per la piattaforma)
    li_auth = current_user.get("linkedinAuth", {})
    if not li_auth or not li_auth.get("clientId"):
        raise HTTPException(status_code=400, detail="Configura prima Client ID e Client Secret nelle impostazioni generali.")
    
    origin = os.getenv("FRONTEND_URL", "https://linkedinbs.vercel.app")
    redirect_uri = f"{origin}/api/linkedin/callback"
    
    # Lo 'state' ora contiene sia l'utente che il progetto specifico
    state = f"{current_user['id']}:{project_id}"
    
    params = {
        "response_type": "code",
        "client_id": li_auth.get("clientId"),
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": "w_member_social r_liteprofile" # Possiamo aggiungere w_organization_social se serve
    }
    
    query_string = urllib.parse.urlencode(params)
    return {"url": f"{LINKEDIN_AUTH_URL}?{query_string}"}

@router.get("/callback")
async def linkedin_callback(code: str, state: str):
    db = get_db()
    
    try:
        user_id, project_id = state.split(":")
    except ValueError:
        return {"error": "Stato non valido"}

    user = await db.users.find_one({"_id": user_id})
    if not user:
        return {"error": "Utente non trovato"}
    
    user_obj = UserInDB(**user)
    if not user_obj.linkedinAuth or not user_obj.linkedinAuth.clientId or not user_obj.linkedinAuth.clientSecret:
        return {"error": "Credenziali LinkedIn App mancanti nell'utente"}

    origin = os.getenv("FRONTEND_URL", "https://linkedinbs.vercel.app")
    redirect_uri = f"{origin}/api/linkedin/callback"

    async with httpx.AsyncClient() as client:
        # 1. Ottieni il Token
        token_resp = await client.post(LINKEDIN_TOKEN_URL, data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": user_obj.linkedinAuth.clientId,
            "client_secret": user_obj.linkedinAuth.clientSecret
        })
        
        if token_resp.status_code != 200:
            return {"error": f"Errore token: {token_resp.text}"}
        
        token_data = token_resp.json()
        access_token = token_data["access_token"]
        expires_in = token_data["expires_in"]
        
        # 2. Ottieni Info Profilo per il Person URN
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_resp = await client.get(LINKEDIN_USER_INFO_URL, headers=headers)
        if user_info_resp.status_code != 200:
            return {"error": "Errore recupero info profilo"}
        
        user_info = user_info_resp.json()
        person_urn = f"urn:li:person:{user_info['id']}"
        
        # 3. Salva nel PROGETTO (Brand)
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        await db.projects.update_one(
            {"_id": project_id},
            {"$set": {
                "linkedinAuth": {
                    "accessToken": access_token,
                    "expiresAt": expires_at.isoformat(),
                    "personUrn": person_urn,
                    "connectedAs": user_info.get("localizedFirstName", "User")
                }
            }}
        )
    
    # Redirect al progetto specifico nel frontend
    return RedirectResponse(url=f"{origin}/calendar?project={project_id}&linkedin=success")

@router.post("/publish")
async def publish_to_linkedin(
    project_id: str,
    post_data: dict, 
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    project = await db.projects.find_one({"_id": project_id})
    if not project or project.get("userId") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    
    li_auth = project.get("linkedinAuth")
    if not li_auth or not li_auth.get("accessToken"):
        raise HTTPException(status_code=401, detail="LinkedIn non connesso per questo brand.")
    
    text = post_data.get("text")
    
    payload = {
        "author": li_auth.get("personUrn"),
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    headers = {
        "Authorization": f"Bearer {li_auth.get('accessToken')}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202305"
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(LINKEDIN_POSTS_URL, json=payload, headers=headers)
        if resp.status_code not in [200, 201]:
            raise HTTPException(status_code=resp.status_code, detail=f"Errore LinkedIn: {resp.text}")
        
    return {"status": "success"}

@router.get("/status/{project_id}")
async def get_linkedin_status(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        return {"connected": False}
    
    li_auth = project.get("linkedinAuth")
    connected = False
    if li_auth and li_auth.get("accessToken"):
        # Verifica scadenza (ISO string to datetime)
        expires_at = datetime.fromisoformat(li_auth["expiresAt"])
        if expires_at > datetime.utcnow():
            connected = True
            
    return {
        "connected": connected,
        "connectedAs": li_auth.get("connectedAs") if connected else None
    }
