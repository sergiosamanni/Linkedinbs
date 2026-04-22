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

# Configurazione CORS
# Nota: Quando allow_credentials è True, allow_origins non può essere "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://linkedinbs.vercel.app",
        # Questo permette tutte le preview di Vercel (molto utile)
    ],
    allow_origin_regex="https://.*vercel\.app",
    allow_credentials=True,
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

# Esempio di endpoint per la generazione AI
@app.post("/api/generate")
async def generate(data: dict):
    prompt = data.get("prompt")
    system_instruction = data.get("system_instruction", "")
    is_pro = data.get("is_pro", False)
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    try:
        result = await llm_service.generate_content(prompt, system_instruction, is_pro)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
