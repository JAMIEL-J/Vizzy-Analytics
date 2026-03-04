import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.llm.llm_router import LLMRouter
from app.services.llm.memory_manager import MemoryManager

@pytest.mark.asyncio
async def test_llm_router_fallback():
    """Test that the router falls back to Gemini if Groq fails."""
    router = LLMRouter()
    
    # Mock _call_groq to raise an exception
    with patch.object(router, '_call_groq', side_effect=Exception("Groq Failed")):
        # Mock _call_gemini to succeed
        with patch.object(router, '_call_gemini', new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = {"sql": "SELECT 1", "explanation": "Fallback worked"}
            
            result = await router.generate_sql("query", "schema")
            
            assert result["sql"] == "SELECT 1"
            mock_gemini.assert_called_once()

@pytest.mark.asyncio
async def test_llm_router_timeout():
    """Test router handles timeouts correctly."""
    router = LLMRouter()
    
    # Patch asyncio.wait_for inside the module
    # First call to wait_for (Groq) will raise TimeoutError
    # Second call to wait_for (Gemini) will return the success dictionary
    with patch('app.services.llm.llm_router.asyncio.wait_for', side_effect=[asyncio.TimeoutError(), {"sql": "SELECT 2"}]):
        result = await router.generate_sql("query", "schema")
        assert result["sql"] == "SELECT 2"

@pytest.mark.asyncio
async def test_memory_manager_summarization():
    """Test that memory manager triggers summarization when token limit is exceeded."""
    memory = MemoryManager()
    memory.MAX_TOKENS = 50  # Artificially low for testing
    
    messages = [
        {"role": "user", "content": "Help me with my sales data please."},
        {"role": "assistant", "content": "I can help with that. What metrics do you want?"},
        {"role": "user", "content": "Show me total revenue by region for last year."},
        {"role": "assistant", "content": "Sure, here is the bar chart for revenue by region."},
        {"role": "user", "content": "Now filter it for the West region only."}
    ]
    
    # Verify it should summarize
    assert memory.should_summarize(messages) == True
    
    # Mock the router for summarization
    with patch('app.services.llm.llm_router.LLMRouter.generate_response', new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "The user asked for sales data and filtered revenue by region."
        
        summarized = await memory.summarize(messages)
        
        # Should keep KEEP_RECENT (4) messages plus one summary message
        assert len(summarized) == 5 
        assert summarized[0]["role"] == "system"
        assert "[Conversation Summary]" in summarized[0]["content"]

if __name__ == "__main__":
    asyncio.run(test_llm_router_fallback())
    asyncio.run(test_llm_router_timeout())
    asyncio.run(test_memory_manager_summarization())
