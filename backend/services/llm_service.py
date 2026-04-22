
import os
import json
import asyncio
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

    async def generate_content(self, prompt: str, system_instruction: str = "", is_pro: bool = False, user: dict = None):
        user_keys = user.get("apiKeys", {}) if user else {}
        user_settings = user.get("settings", {}) if user else {}
        preferred_provider = user_settings.get("preferredModel", "gemini")
        
        providers_order = ["gemini", "openai", "anthropic", "openrouter", "deepseek"]
        if preferred_provider in providers_order:
            providers_order.remove(preferred_provider)
            providers_order.insert(0, preferred_provider)
            
        errors = []
        for provider_name in providers_order:
            try:
                api_key = user_keys.get(provider_name) or self.system_keys.get(provider_name)
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

llm_service = LLMService()
