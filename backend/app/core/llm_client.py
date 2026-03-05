"""
Multi-provider LLM client with fallback support.

Belongs to: core layer
Responsibility: LLM API calls with retry and fallback
Restrictions: No business logic, returns raw responses only

Providers:
1. Groq (Primary)
2. Groq Fallback (Secondary)
"""

import json
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import httpx

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.exceptions import InvalidOperation


logger = get_logger(__name__)


class LLMProvider(str, Enum):
    """Available LLM providers."""
    GROQ = "groq"
    GROQ_FALLBACK = "groq_fallback"


@dataclass
class LLMResponse:
    """Structured LLM response."""
    content: str
    provider: LLMProvider
    model: str
    usage: Optional[Dict[str, int]] = None


class LLMClient:
    """
    Multi-provider LLM client with automatic fallback.
    
    Usage:
        client = LLMClient()
        response = await client.complete(
            system_prompt="You are...",
            user_prompt="Classify this...",
        )
    """

    def __init__(self):
        self.settings = get_settings().llm
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        import asyncio
        loop = asyncio.get_running_loop()
        
        # Check if we need to create or recreate the client
        # Recreate if it doesn't exist, is closed, or belongs to a different loop
        should_recreate = (
            self._http_client is None or 
            self._http_client.is_closed or
            not hasattr(self, "_loop") or
            self._loop != loop
        )

        if should_recreate:
            if self._http_client and not self._http_client.is_closed:
                # Close old client if loop changed
                await self._http_client.aclose()
            
            self._http_client = httpx.AsyncClient(
                timeout=self.settings.timeout_seconds
            )
            self._loop = loop
            
        return self._http_client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def complete(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """
        Send completion request using Groq with internal fallback.
        
        Tries:
        1. Groq (Llama 3.3 70B)
        2. Groq Fallback (Llama 3.1 70B)
        """
        providers = [
            (LLMProvider.GROQ, self._call_groq),
            (LLMProvider.GROQ_FALLBACK, self._call_groq_fallback),
        ]

        last_error: Optional[Exception] = None

        for provider, call_fn in providers:
            try:
                logger.info(f"Attempting LLM call with {provider.value}")
                response = await call_fn(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                logger.info(f"LLM call successful with {provider.value}")
                return response
            except Exception as e:
                logger.error(f"LLM call failed with {provider.value}: {e}", exc_info=True)
                last_error = e
                continue

        raise InvalidOperation(
            operation="llm_complete",
            reason="All LLM providers failed",
            details=str(last_error) if last_error else "Unknown error",
        )


    async def _call_groq(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> LLMResponse:
        """Call Groq API."""
        api_key = self.settings.groq_api_key.get_secret_value()
        if not api_key:
            raise ValueError("Groq API key not configured")

        model = self.settings.groq_model
        url = "https://api.groq.com/openai/v1/chat/completions"

        client = await self._get_client()
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()

        content = data["choices"][0]["message"]["content"]
        return LLMResponse(
            content=content,
            provider=LLMProvider.GROQ,
            model=model,
            usage=data.get("usage"),
        )

    async def _call_groq_fallback(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> LLMResponse:
        """Call Groq API (Fallback Model)."""
        api_key = self.settings.groq_api_key.get_secret_value()
        if not api_key:
            raise ValueError("Groq API key not configured")

        model = self.settings.groq_fallback_model
        url = "https://api.groq.com/openai/v1/chat/completions"

        client = await self._get_client()
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()

        content = data["choices"][0]["message"]["content"]
        return LLMResponse(
            content=content,
            provider=LLMProvider.GROQ_FALLBACK,
            model=model,
            usage=data.get("usage"),
        )



def parse_json_response(content: str) -> Dict[str, Any]:
    """
    Parse JSON from LLM response, handling markdown code blocks.
    """
    # Remove markdown code blocks if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise InvalidOperation(
            operation="parse_json_response",
            reason="LLM response is not valid JSON",
            details=str(e),
        )


# Singleton instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get singleton LLM client instance."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
