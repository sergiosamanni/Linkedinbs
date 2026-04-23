
import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Errore: GEMINI_API_KEY non trovata nel file .env")
        return
    
    try:
        client = genai.Client(api_key=api_key)
        print("Modelli disponibili per la tua chiave:")
        for model in client.models.list():
            print(f"- {model.name} (Supporta: {model.supported_methods})")
    except Exception as e:
        print(f"Errore durante il recupero dei modelli: {e}")

if __name__ == "__main__":
    asyncio.run(list_models())
