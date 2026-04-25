
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from routes.auth import get_current_user
from models.user import UserInDB, LinkedinAuth
import os
import urllib.parse

router = APIRouter()

# Nota: Questi dovrebbero essere configurati nell'interfaccia o nelle variabili d'ambiente
# Per ora, li prenderemo dal database dell'utente (linkedinAuth)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USER_INFO_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"

@router.get("/auth_url")
async def get_linkedin_auth_url(current_user: UserInDB = Depends(get_current_user)):
    if not current_user.linkedinAuth or not current_user.linkedinAuth.clientId:
        raise HTTPException(status_code=400, detail="Configura prima Client ID e Client Secret nelle impostazioni.")
    
    # L'URL di redirect deve corrispondere a quello configurato nel portale LinkedIn
    # Usiamo un URL relativo o dinamico basato sull'ambiente
    origin = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = f"{origin}/api/linkedin/callback"
    
    params = {
        "response_type": "code",
        "client_id": current_user.linkedinAuth.clientId,
        "redirect_uri": redirect_uri,
        "state": current_user.id, # Usiamo l'ID utente come stato per sicurezza
        "scope": "w_member_social r_liteprofile" # Permessi necessari per postare e leggere profilo
    }
    
    query_string = urllib.parse.urlencode(params)
    return {"url": f"{LINKEDIN_AUTH_URL}?{query_string}"}

@router.get("/callback")
async def linkedin_callback(code: str, state: str):
    db = get_db()
    # 'state' contiene l'ID utente
    user = await db.users.find_one({"_id": state})
    if not user:
        return {"error": "Utente non trovato"}
    
    user_obj = UserInDB(**user)
    if not user_obj.linkedinAuth or not user_obj.linkedinAuth.clientId or not user_obj.linkedinAuth.clientSecret:
        return {"error": "Credenziali LinkedIn mancanti"}

    origin = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = f"{origin}/api/linkedin/callback"

    # Scambia il codice con un access token
    async with httpx.AsyncClient() as client:
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
        
        # Recupera il Person URN (l'ID unico dell'utente su LinkedIn)
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_resp = await client.get(LINKEDIN_USER_INFO_URL, headers=headers)
        if user_info_resp.status_code != 200:
            return {"error": "Errore recupero info utente"}
        
        user_info = user_info_resp.json()
        person_urn = f"urn:li:person:{user_info['id']}"
        
        # Salva nel DB
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        await db.users.update_one(
            {"_id": state},
            {"$set": {
                "linkedinAuth.accessToken": access_token,
                "linkedinAuth.expiresAt": expires_at,
                "linkedinAuth.personUrn": person_urn
            }}
        )
    
    # Redirect al frontend
    return RedirectResponse(url=f"{origin}/settings?linkedin=success")

@router.post("/publish")
async def publish_to_linkedin(
    post_data: dict, 
    current_user: UserInDB = Depends(get_current_user)
):
    if not current_user.linkedinAuth or not current_user.linkedinAuth.accessToken:
        raise HTTPException(status_code=401, detail="LinkedIn non connesso.")
    
    text = post_data.get("text")
    scheduled_time = post_data.get("scheduled_time") # Timestamp in millisecondi se presente

    payload = {
        "author": current_user.linkedinAuth.personUrn,
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

    # Se vogliamo programmarlo (richiede permessi specifici e API v2023+)
    if scheduled_time:
        # Nota: La programmazione richiede campi specifici nell'API Versioned
        # Per ora pubblichiamo direttamente, implementeremo lo scheduling se le API lo permettono
        pass

    headers = {
        "Authorization": f"Bearer {current_user.linkedinAuth.accessToken}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202305" # Specifica la versione dell'API
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(LINKEDIN_POSTS_URL, json=payload, headers=headers)
        if resp.status_code not in [200, 201]:
            raise HTTPException(status_code=resp.status_code, detail=f"Errore LinkedIn: {resp.text}")
        
    return {"status": "success", "data": resp.json() if resp.text else {}}

@router.get("/status")
async def get_linkedin_status(current_user: UserInDB = Depends(get_current_user)):
    connected = False
    if current_user.linkedinAuth and current_user.linkedinAuth.accessToken:
        # Verifica se è scaduto
        if current_user.linkedinAuth.expiresAt > datetime.utcnow():
            connected = True
            
    return {
        "connected": connected,
        "hasCredentials": bool(current_user.linkedinAuth and current_user.linkedinAuth.clientId),
        "personUrn": current_user.linkedinAuth.personUrn if connected else None
    }
