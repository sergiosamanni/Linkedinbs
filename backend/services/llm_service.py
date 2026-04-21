import os
import json
import asyncio
import google.generativeai as genai
from openai import OpenAI
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        # Configurazione Gemini
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            self.gemini_pro_model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Configurazione OpenAI
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.openai_client = OpenAI(api_key=self.openai_key) if self.openai_key else None
        
        # Configurazione Anthropic
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.anthropic_client = Anthropic(api_key=self.anthropic_key) if self.anthropic_key else None

    async def generate_content(self, prompt: str, system_instruction: str = "", is_pro: bool = False):
        """
        Genera contenuto provando i provider in ordine: Gemini -> OpenAI -> Anthropic
        """
        providers = [
            {"name": "gemini", "func": self._call_gemini},
            {"name": "openai", "func": self._call_openai},
            {"name": "anthropic", "func": self._call_anthropic}
        ]

        errors = []
        for provider in providers:
            try:
                print(f"Tentativo generazione con {provider['name']}...")
                result = await provider["func"](prompt, system_instruction, is_pro)
                if result:
                    return {
                        "text": result,
                        "provider": provider["name"]
                    }
            except Exception as e:
                error_msg = f"{provider['name']} failed: {str(e)}"
                print(error_msg)
                errors.append(error_msg)
                continue
        
        raise Exception(f"Tutti i provider LLM hanno fallito: {'; '.join(errors)}")

    async def _call_gemini(self, prompt: str, system_instruction: str, is_pro: bool):
        if not self.gemini_key:
            raise Exception("Gemini API Key non configurata")
        
        model = self.gemini_pro_model if is_pro else self.gemini_model
        
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        
        # Esecuzione in thread per non bloccare l'async loop (la lib di Google è sincrona in gran parte)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json" if "JSON" in system_instruction or "JSON" in prompt else "text/plain"
                )
            )
        )
        return response.text

    async def _call_openai(self, prompt: str, system_instruction: str, is_pro: bool):
        if not self.openai_client:
            raise Exception("OpenAI API Key non configurata")
        
        model = "gpt-4o" if is_pro else "gpt-4o-mini"
        
        response = self.openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"} if "JSON" in system_instruction or "JSON" in prompt else {"type": "text"}
        )
        return response.choices[0].message.content

    async def _call_anthropic(self, prompt: str, system_instruction: str, is_pro: bool):
        if not self.anthropic_client:
            raise Exception("Anthropic API Key non configurata")
        
        model = "claude-3-5-sonnet-20240620" if is_pro else "claude-3-haiku-20240307"
        
        response = self.anthropic_client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_instruction,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text

llm_service = LLMService()
