import json
import asyncio
import logging
import groq
import warnings
from typing import Dict, Any, Optional, Union

# Silence the google-generativeai deprecation warning for now
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class LLMRouter:
    def __init__(self):
        """Initialize the router with available API keys for the fallback chain."""
        settings = get_settings().llm
        self.groq_api_key = settings.groq_api_key.get_secret_value()
        self.groq_model = settings.groq_model
        
        self.gemini_api_key = settings.gemini_api_key.get_secret_value()
        self.gemini_model = settings.gemini_model

    async def generate_sql(self, prompt: str, schema: str) -> Dict[str, Any]:
        """
        Specialized method for SQL generation.
        """
        return await self.generate_response(prompt, json_mode=True)

    async def generate_response(self, prompt: str, json_mode: bool = True) -> Union[Dict[str, Any], str]:
        """
        Attempt to generate a response via Groq first, then Gemini.
        Returns a JSON object (if json_mode=True) or raw string.
        """
        try:
            # First attempt with Groq (Fastest) -> 8s timeout
            logger.info(f"Attempting LLM generation via primary provider (Groq: {self.groq_model})")
            result = await asyncio.wait_for(self._call_groq(prompt, json_mode), timeout=8.0)
            logger.info("Groq generation successful")
            return result
        except (asyncio.TimeoutError, Exception) as groq_err:
            logger.warning(f"Groq API skipped/failed due to: {str(groq_err)}. Falling back to Gemini.")
            
            # Fallback to Gemini
            try:
                logger.info(f"Attempting LLM generation via fallback provider (Gemini: {self.gemini_model})")
                result = await asyncio.wait_for(self._call_gemini(prompt, json_mode), timeout=12.0)
                logger.info("Gemini generation successful")
                return result
            except Exception as gemini_err:
                logger.error(f"Gemini Fallback failed: {str(gemini_err)}")
                raise ValueError(f"All LLM providers failed. Last error: {str(gemini_err)}")

    async def _call_groq(self, prompt: str, json_mode: bool) -> Union[dict, str]:
        if not self.groq_api_key:
            raise ValueError("Groq API key missing")
            
        client = groq.AsyncGroq(api_key=self.groq_api_key)
        
        args = {
            "model": self.groq_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }
        
        if json_mode:
            args["response_format"] = {"type": "json_object"}
            
        completion = await client.chat.completions.create(**args)
        response_text = completion.choices[0].message.content
        
        return self._parse_json(response_text) if json_mode else response_text
        
    async def _call_gemini(self, prompt: str, json_mode: bool) -> Union[dict, str]:
        if not self.gemini_api_key:
            raise ValueError("Gemini API key missing")
            
        genai.configure(api_key=self.gemini_api_key)
        model = genai.GenerativeModel(self.gemini_model)
        
        config_args = {"temperature": 0.0}
        if json_mode:
            config_args["response_mime_type"] = "application/json"
            
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(**config_args)
        )
        
        return self._parse_json(response.text) if json_mode else response.text
        
    def _parse_json(self, response_text: str) -> dict:
        # Failsafe cleaner for possible markdown block leakage
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback attempt: if it's not JSON, maybe it's text wrapped in one
            if not cleaned.startswith("{"):
                return {"text": cleaned}
            raise ValueError(f"LLM returned invalid JSON: {cleaned[:100]}...")
