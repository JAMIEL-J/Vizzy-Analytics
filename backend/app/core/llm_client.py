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
    GROQ_NARRATIVE = "groq_narrative"
    GROQ_CHAT = "groq_chat"


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
            purpose="sql"
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
        should_recreate = (
            self._http_client is None or 
            self._http_client.is_closed or
            not hasattr(self, "_loop") or
            self._loop != loop
        )

        if should_recreate:
            if self._http_client and not self._http_client.is_closed:
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
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        purpose: str = "narrative",
    ) -> LLMResponse:
        """
        Send completion request using Groq with internal fallback based on purpose.
        
        Purpose 'sql' or 'chat' uses Account 2 (Kimi K2).
        Purpose 'narrative' (default) uses Account 1 (Llama 3.3).
        """
        temp = temperature if temperature is not None else self.settings.temperature
        tokens = max_tokens if max_tokens is not None else self.settings.max_tokens

        if purpose in ["sql", "chat"]:
            # SQL Priority: Kimi K2 -> Llama 3.3 (Fallback)
            providers = [
                (LLMProvider.GROQ_CHAT, self._call_groq_chat),
                (LLMProvider.GROQ_NARRATIVE, self._call_groq_narrative),
            ]
        else:
            # Narrative Priority: Llama 3.3 -> Kimi K2 (Fallback)
            providers = [
                (LLMProvider.GROQ_NARRATIVE, self._call_groq_narrative),
                (LLMProvider.GROQ_CHAT, self._call_groq_chat),
            ]

        last_error: Optional[Exception] = None

        for provider, call_fn in providers:
            try:
                logger.info(f"Attempting LLM call with {provider.value} for purpose: {purpose}")
                response = await call_fn(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temp,
                    max_tokens=tokens,
                )
                logger.info(f"LLM call successful with {provider.value}")
                return response
            except Exception as e:
                logger.error(f"LLM call failed with {provider.value}: {e}", exc_info=True)
                last_error = e
                continue

        raise InvalidOperation(
            operation="llm_complete",
            reason=f"All LLM providers failed for purpose: {purpose}",
            details=str(last_error) if last_error else "Unknown error",
        )

    async def _call_groq_internal(
        self,
        api_key_str: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        provider: LLMProvider,
    ) -> LLMResponse:
        """Internal helper for Groq API calls."""
        if not api_key_str:
            raise ValueError(f"API key missing for {provider.value}")

        url = "https://api.groq.com/openai/v1/chat/completions"
        client = await self._get_client()
        
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key_str}"},
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
            provider=provider,
            model=model,
            usage=data.get("usage"),
        )

    async def _call_groq_narrative(self, **kwargs) -> LLMResponse:
        """Call Account 1 (Llama)."""
        return await self._call_groq_internal(
            api_key_str=self.settings.groq_api_key.get_secret_value(),
            model=self.settings.groq_model,
            provider=LLMProvider.GROQ_NARRATIVE,
            **kwargs,
        )

    async def _call_groq_chat(self, **kwargs) -> LLMResponse:
        """Call Account 2 (Kimi K2)."""
        # Fallback to Account 1 key if Account 2 key is not configured yet
        # (Though user says they are giving us another)
        chat_key = self.settings.groq_chat_api_key.get_secret_value()
        final_key = chat_key if chat_key else self.settings.groq_api_key.get_secret_value()
        
        return await self._call_groq_internal(
            api_key_str=final_key,
            model=self.settings.groq_chat_model,
            provider=LLMProvider.GROQ_CHAT,
            **kwargs,
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
