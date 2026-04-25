import os
import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from database import connect_to_mongo, close_mongo_connection, get_db
from services.llm_service import llm_service
from routes import auth, projects, linkedin

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eseguito all'avvio
    await connect_to_mongo()
    yield
    # Eseguito allo spegnimento
    await close_mongo_connection()

app = FastAPI(title="Linkedin Brand Strategist API", lifespan=lifespan)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"ERRORE VALIDAZIONE: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# Configurazione CORS Avanzata
origins = [
    "https://linkedinbs.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Inclusion dei router
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(linkedin.router, prefix="/api/linkedin", tags=["linkedin"])

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

@app.post("/api/brain/query")
async def query_brain(data: dict, current_user: dict = Depends(auth.get_current_user)):
    question = data.get("question")
    files = data.get("files", []) # I file possono essere passati o presi dal brand corrente
    is_pro = data.get("is_pro", False)
    
    if not question:
        raise HTTPException(status_code=400, detail="Domanda richiesta")
        
    try:
        result = await llm_service.ask_brand_brain(question, files, is_pro, user=current_user)
        return result
    except Exception as e:
        print(f"Brain Query Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-multimodal")
async def generate_multimodal(data: dict, current_user: dict = Depends(auth.get_current_user)):
    image_data = data.get("image_data")
    mime_type = data.get("mime_type")
    base_text = data.get("base_text", "")
    brand_kb = data.get("brand_kb", {})
    platform = data.get("platform", "linkedin")
    content_type = data.get("content_type", "post")
    is_pro = data.get("is_pro", False)
    
    if not image_data or not mime_type:
        raise HTTPException(status_code=400, detail="Immagine richiesta")
        
    try:
        result = await llm_service.generate_with_image_and_context(
            image_data, mime_type, base_text, brand_kb, platform, content_type, is_pro, user=current_user
        )
        return result
    except Exception as e:
        print(f"Multimodal Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
