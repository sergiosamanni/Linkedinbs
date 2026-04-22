import os
import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from database import connect_to_mongo, close_mongo_connection, get_db
from services.llm_service import llm_service
from routes import auth, projects

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eseguito all'avvio
    await connect_to_mongo()
    yield
    # Eseguito allo spegnimento
    await close_mongo_connection()

app = FastAPI(title="Linkedin Brand Strategist API", lifespan=lifespan)

# Configurazione CORS Universale
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion dei router
app.include_router(auth.router)
app.include_router(projects.router)

@app.get("/")
async def root():
    return {"status": "online", "message": "Linkedin Brand Strategist API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Endpoint per la generazione AI con supporto a chiavi utente
@app.post("/api/generate")
async def generate(data: dict, current_user: dict = Depends(auth.get_current_user)):
    prompt = data.get("prompt")
    system_instruction = data.get("system_instruction", "")
    is_pro = data.get("is_pro", False)
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt richiesto")
        
    try:
        # Passiamo l'utente corrente per usare le sue API Key e preferenze
        result = await llm_service.generate_content(prompt, system_instruction, is_pro, user=current_user)
        return result
    except Exception as e:
        print(f"Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
