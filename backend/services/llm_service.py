import os
import json
import asyncio
import base64
import io
from PyPDF2 import PdfReader
from docx import Document
from google import genai
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        # Chiavi di sistema (default)
        self.system_keys = {
            "gemini": os.getenv("GEMINI_API_KEY"),
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "openrouter": os.getenv("OPENROUTER_API_KEY"),
            "deepseek": os.getenv("DEEPSEEK_API_KEY")
        }

    async def _get_gemini_client(self):
        admin_keys = await self._get_admin_api_keys()
        api_key = admin_keys.get("gemini") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("Gemini API Key non configurata.")
        return genai.Client(api_key=api_key)

    async def generate_content(self, prompt: str, system_instruction: str = "", is_pro: bool = False, user: dict = None):
        user_keys = user.get("apiKeys", {}) if user else {}
        user_settings = user.get("settings", {}) if user else {}
        preferred_provider = user_settings.get("preferredModel", "gemini")
        
        # Recupera chiavi Admin se necessario
        admin_keys = {}
        from database import get_db
        db = get_db()
        if db is not None:
            admin = await db.users.find_one({"role": "admin"})
            if admin:
                admin_keys = admin.get("apiKeys", {})

        providers_order = ["gemini", "openai", "anthropic", "openrouter", "deepseek"]
        if preferred_provider in providers_order:
            providers_order.remove(preferred_provider)
            providers_order.insert(0, preferred_provider)
            
        errors = []
        for provider_name in providers_order:
            try:
                # Priorità: Utente > Admin > Sistema (.env)
                api_key = user_keys.get(provider_name) or admin_keys.get(provider_name) or self.system_keys.get(provider_name)
                
                if not api_key:
                    continue

                print(f"Tentativo generazione con {provider_name}...")
                # Timeout di 60 secondi per evitare blocchi infiniti
                result = await asyncio.wait_for(
                    self._call_provider(provider_name, api_key, prompt, system_instruction, is_pro, user_settings),
                    timeout=60.0
                )
                
                if result:
                    print(f"Generazione riuscita con {provider_name}!")
                    return {"text": result, "provider": provider_name}
            except asyncio.TimeoutError:
                error_msg = f"{provider_name} timed out (60s)"
                print(f"ERRORE: {error_msg}")
                errors.append(error_msg)
            except Exception as e:
                error_msg = f"{provider_name} failed: {str(e)}"
                print(f"ERRORE: {error_msg}")
                errors.append(error_msg)
                continue
        
        error_summary = f"Tutti i provider LLM hanno fallito: {'; '.join(errors)}"
        print(f"ERRORE FINALE: {error_summary}")
        raise Exception(error_summary)

    async def _call_provider(self, name: str, api_key: str, prompt: str, system: str, is_pro: bool, settings: dict = None):
        if name == "gemini":
            return await self._call_gemini(api_key, prompt, system, is_pro)
        elif name == "openai":
            return await self._call_openai(api_key, prompt, system, is_pro)
        elif name == "anthropic":
            return await self._call_anthropic(api_key, prompt, system, is_pro)
        elif name == "openrouter":
            custom_model = settings.get("openrouterModel") if settings else None
            return await self._call_openai(api_key, prompt, system, is_pro, base_url="https://openrouter.ai/api/v1", custom_model=custom_model)
        elif name == "deepseek":
            custom_model = settings.get("deepseekModel") if settings else None
            return await self._call_openai(api_key, prompt, system, is_pro, base_url="https://api.deepseek.com", custom_model=custom_model)
        return None

    async def _call_gemini(self, api_key: str, prompt: str, system: str, is_pro: bool):
        client = genai.Client(api_key=api_key)
        model_name = 'gemini-2.0-flash' if not is_pro else 'gemini-2.0-pro'
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        
        # Usa il client asincrono di google-genai
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json" if "JSON" in (system or "") or "JSON" in prompt else "text/plain"
            )
        )
        return response.text

    async def _call_openai(self, api_key: str, prompt: str, system: str, is_pro: bool, base_url: str = None, custom_model: str = None):
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        
        if custom_model:
            model = custom_model
        else:
            model = "gpt-4o" if is_pro else "gpt-4o-mini"
            if base_url and "deepseek" in base_url:
                model = "deepseek-chat"
            elif base_url and "openrouter" in base_url:
                model = "anthropic/claude-3.5-sonnet" if is_pro else "google/gemini-flash-1.5"

        print(f"  -> Modello selezionato: {model}")
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system or "Sei un assistente utile."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"} if "JSON" in (system or "") or "JSON" in prompt else {"type": "text"}
        )
        return response.choices[0].message.content

    async def _call_anthropic(self, api_key: str, prompt: str, system: str, is_pro: bool):
        client = AsyncAnthropic(api_key=api_key)
        model = "claude-3-5-sonnet-20240620" if is_pro else "claude-3-haiku-20240307"
        response = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=system or "Sei un assistente utile.",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def _extract_text_from_file(self, file_data: str, mime_type: str) -> str:
        try:
            # Rimuovi prefisso base64 se presente
            if "," in file_data:
                file_data = file_data.split(",")[1]
            
            file_bytes = base64.b64decode(file_data)
            
            if "pdf" in mime_type:
                reader = PdfReader(io.BytesIO(file_bytes))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
            elif "word" in mime_type or "docx" in mime_type:
                doc = Document(io.BytesIO(file_bytes))
                return "\n".join([para.text for para in doc.paragraphs])
            elif "text" in mime_type or "plain" in mime_type or "csv" in mime_type:
                return file_bytes.decode("utf-8", errors="ignore")
            return ""
        except Exception as e:
            print(f"Errore estrazione testo ({mime_type}): {str(e)}")
            return ""

    async def ask_brand_brain(self, question: str, brand_files: list, is_pro: bool = False, user: dict = None):
        if not brand_files:
            return {"text": "Nessun documento caricato nella Knowledge Base. Carica dei file per usare il Brand Brain."}

        # Estrai testo dai documenti e prepara le immagini
        context_parts = []
        image_parts = []
        
        for f in brand_files:
            mime = f.get("mimeType", "")
            data = f.get("data", "")
            if not data: continue

            if "image" in mime:
                # Per le immagini, le passiamo come parti multimodali
                image_parts.append({
                    "mime_type": mime,
                    "data": data.split(",")[1] if "," in data else data
                })
            else:
                # Per i documenti, estraiamo il testo
                text = self._extract_text_from_file(data, mime)
                if text:
                    context_parts.append(f"--- DOCUMENTO: {f.get('name')} ---\n{text}")

        brain_context = "\n\n".join(context_parts)
        
        system_instruction = f"""Agisci come un analista esperto di Brand Strategy e Ricerca Multimodale.
Il tuo compito è rispondere alla domanda dell'utente basandoti sui documenti E sulle immagini fornite.
Analizza i testi e osserva attentamente le immagini per fornire una risposta accurata.

DOCUMENTI TESTUALI CARICATI:
{brain_context}"""

        prompt = f"DOMANDA: {question}"
        
        # Se abbiamo immagini, usiamo Gemini direttamente per la multimodalità
        # Se non abbiamo immagini, usiamo il flusso standard (che potrebbe usare OpenAI/Anthropic come fallback)
        if image_parts and not is_pro: # is_pro force might use other models, but here we want vision
            try:
                client = await self._get_gemini_client()
                contents = []
                for img in image_parts:
                    contents.append(genai.types.Part.from_bytes(data=base64.b64decode(img["data"]), mime_type=img["mime_type"]))
                
                contents.append(genai.types.Part.from_text(text=prompt))
                
                response = await client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=contents,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7
                    )
                )
                return {"text": response.text}
            except Exception as e:
                print(f"Errore Vision Brain: {str(e)}")
                # Fallback al testo se la visione fallisce
        
        return await self.generate_content(prompt, system_instruction, is_pro, user)

    async def generate_with_image_and_context(self, image_data: str, mime_type: str, base_text: str, brand_kb: dict, platform: str, contentType: str = "post", is_pro: bool = False, user: dict = None):
        # 1. Estrai testo dalla KB (i file caricati nel Vault)
        brand_files = brand_kb.get("files", [])
        kb_context_parts = []
        for f in brand_files:
            text = self._extract_text_from_file(f.get("data", ""), f.get("mimeType", ""))
            if text:
                kb_context_parts.append(f"--- DOC: {f.get('name')} ---\n{text}")
        
        kb_context = "\n\n".join(kb_context_parts)
        
        # 2. Costruisci le istruzioni di sistema con il contesto completo
        system_instruction = f"""Agisci come un Copywriter e Content Strategist multimodale.
Il tuo compito è analizzare l'immagine fornita e scrivere un {contentType} per {platform} basandoti:
1. Su ciò che vedi nell'immagine.
2. Sulla strategia e i dati contenuti nella Knowledge Base qui sotto.

KNOWLEDGE BASE DEL BRAND (DOCUMENTI):
{kb_context}

BRAND INFO:
- Nome: {brand_kb.get('name')}
- Descrizione: {brand_kb.get('description')}
- Tono di Voce: {brand_kb.get('toneOfVoice')}

REGOLE MANDATORIE:
- NO MARKDOWN asterischi. Usa Unicode Bold per enfasi (es: 𝗕𝗼𝗹𝗱).
- Sii specifico, usa dati reali estratti dai documenti se pertinenti all'immagine.
"""
        
        prompt = f"NOTE DELL'UTENTE: {base_text}\n\nAnalizza l'immagine e scrivi il contenuto ottimizzato."

        # 3. Chiamata Multimodale a Gemini
        try:
            client = await self._get_gemini_client()
            contents = [
                genai.types.Part.from_bytes(data=base64.b64decode(image_data), mime_type=mime_type),
                genai.types.Part.from_text(text=prompt)
            ]
            
            response = await client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                )
            )
            return {"text": response.text}
        except Exception as e:
            print(f"Error in multimodal generation: {str(e)}")
            raise e

llm_service = LLMService()
