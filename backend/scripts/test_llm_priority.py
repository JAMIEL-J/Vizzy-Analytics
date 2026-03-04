import asyncio
import sys
from unittest.mock import MagicMock, patch, AsyncMock

# Add backend directory to path
sys.path.append("e:/Vizzy Redesign/backend")

from app.core.llm_client import LLMClient, LLMProvider
from app.core.config import Settings, LLMSettings
from app.core.llm_client import LLMResponse

async def test_llm_priority():
    print("Testing LLM Priority Logic...")

    # Mock settings
    mock_settings = MagicMock(spec=Settings)
    mock_llm_settings = MagicMock(spec=LLMSettings)
    mock_settings.llm = mock_llm_settings
    
    # Mock LLMClient methods to avoid actual API calls
    with patch("app.core.llm_client.get_settings", return_value=mock_settings), \
         patch.object(LLMClient, "_call_gemini", new_callable=AsyncMock) as mock_gemini, \
         patch.object(LLMClient, "_call_groq", new_callable=AsyncMock) as mock_groq, \
         patch.object(LLMClient, "_call_gemini_fallback", new_callable=AsyncMock) as mock_fallback:

        # Setup mocks to return success
        # We need to return a valid LLMResponse object, not just a string, because the code might expect it?
        # Actually LLMClient.complete returns what _call_gemini returns.
        # But let's check llm_client.py again. complete returns LLMResponse.
        
        mock_response = LLMResponse(content="Response", provider=LLMProvider.GEMINI, model="model")
        mock_gemini.return_value = mock_response
        mock_groq.return_value = mock_response
        mock_fallback.return_value = mock_response

        # TEST 1: Default (Gemini Primary)
        print("\nTest 1: Default (Gemini Primary)")
        mock_llm_settings.primary_provider = "gemini"
        client = LLMClient()
        await client.complete(system_prompt="sys", user_prompt="user")
        
        if mock_gemini.called and not mock_groq.called:
            print("[PASS]: Gemini called first.")
        else:
            print(f"[FAIL]: Gemini called: {mock_gemini.called}, Groq called: {mock_groq.called}")

        # Reset mocks
        mock_gemini.reset_mock()
        mock_groq.reset_mock()

        # TEST 2: Groq Primary
        print("\nTest 2: Groq Primary")
        mock_llm_settings.primary_provider = "groq"
        # We need to re-instantiate or just rely on the fact that complete() reads settings dynamically?
        # In LLMClient.__init__, it does self.settings = get_settings().llm
        # So we need to re-instantiate if we mocked get_settings
        client = LLMClient() 
        await client.complete(system_prompt="sys", user_prompt="user")

        if mock_groq.called and not mock_gemini.called:
            print("[PASS]: Groq called first.")
        else:
            print(f"[FAIL]: Groq called: {mock_groq.called}, Gemini called: {mock_gemini.called}")

        # Reset mocks
        mock_gemini.reset_mock()
        mock_groq.reset_mock()
        
        # TEST 3: Groq Fails -> Fallback to Gemini
        print("\nTest 3: Groq Fails -> Fallback to Gemini")
        mock_llm_settings.primary_provider = "groq"
        mock_groq.side_effect = Exception("Groq Error")
        
        client = LLMClient()
        await client.complete(system_prompt="sys", user_prompt="user")
        
        if mock_groq.called and mock_gemini.called:
            print("[PASS]: Groq failed, then Gemini called.")
        else:
             print(f"[FAIL]: Groq called: {mock_groq.called}, Gemini called: {mock_gemini.called}")

if __name__ == "__main__":
    asyncio.run(test_llm_priority())
