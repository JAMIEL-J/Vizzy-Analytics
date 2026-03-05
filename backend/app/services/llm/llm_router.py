import json
import asyncio
import logging
import groq
import warnings
from typing import Dict, Any, Optional, Union

from app.core.config import get_settings
from app.core.exceptions import InvalidOperation

logger = logging.getLogger(__name__)

class LLMRouter:
    def __init__(self):
        """Initialize the router with available API keys for the Groq fallback chain."""
        settings = get_settings().llm
        self.groq_api_key = settings.groq_api_key.get_secret_value()
        self.groq_model = settings.groq_model
        self.groq_fallback_model = settings.groq_fallback_model

    async def generate_sql(self, prompt: str, schema: str) -> Dict[str, Any]:
        """
        Specialized method for SQL generation.
        """
        return await self.generate_response(prompt, json_mode=True)

    async def generate_response(self, prompt: str, json_mode: bool = True) -> Union[Dict[str, Any], str]:
        """
        Attempt to generate a response via Primary Groq first, then Fallback Groq.
        Returns a JSON object (if json_mode=True) or raw string.
        """
        try:
            # First attempt with Groq (Fastest) -> 15s timeout for complex SQL
            logger.info(f"Attempting LLM generation via primary model (Groq: {self.groq_model})")
            result = await asyncio.wait_for(self._call_groq(prompt, json_mode, model=self.groq_model), timeout=15.0)
            logger.info("Primary Groq generation successful")
            return result
        except (asyncio.TimeoutError, Exception) as groq_err:
            logger.warning(f"Primary Groq failed: {str(groq_err)}. Falling back to {self.groq_fallback_model}.")
            
            # Fallback to secondary Groq model
            try:
                logger.info(f"Attempting LLM generation via fallback model (Groq: {self.groq_fallback_model})")
                result = await asyncio.wait_for(self._call_groq(prompt, json_mode, model=self.groq_fallback_model), timeout=20.0)
                logger.info("Fallback Groq generation successful")
                return result
            except Exception as fallback_err:
                logger.error(f"Groq Fallback chain failed: {str(fallback_err)}")
                raise InvalidOperation(
                    operation="sql_generation",
                    reason="All Groq models failed",
                    details=str(fallback_err)
                )

    async def _call_groq(self, prompt: str, json_mode: bool, model: str) -> Union[dict, str]:
        if not self.groq_api_key:
            raise ValueError("Groq API key missing")
            
        client = groq.AsyncGroq(api_key=self.groq_api_key)
        
        args = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }
        
        if json_mode:
            args["response_format"] = {"type": "json_object"}
            
        completion = await client.chat.completions.create(**args)
        response_text = completion.choices[0].message.content
        
        return self._parse_json(response_text) if json_mode else response_text
        
        
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
