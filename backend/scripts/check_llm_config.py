import sys
import os
from pathlib import Path
import asyncio
import httpx

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.core.config import get_settings

async def check_llm_config():
    print("Checking LLM Configuration...")
    try:
        settings = get_settings()
        llm_settings = settings.llm
        
        print(f"Primary Provider: {llm_settings.primary_provider}")
        print(f"Gemini API Key Configured: {'Yes' if llm_settings.gemini_api_key.get_secret_value() else 'No'}")
        print(f"Groq API Key Configured: {'Yes' if llm_settings.groq_api_key.get_secret_value() else 'No'}")
        print(f"Gemini Fallback API Key Configured: {'Yes' if llm_settings.gemini_fallback_api_key.get_secret_value() else 'No'}")
        
        print("\nModels:")
        print(f"Gemini Model: {llm_settings.gemini_model}")
        print(f"Groq Model: {llm_settings.groq_model}")
        print(f"Gemini Fallback Model: {llm_settings.gemini_fallback_model}")
        
        # Test Groq
        if llm_settings.groq_api_key.get_secret_value():
            print("\nAttempting Groq Connectivity Test...")
            api_key = llm_settings.groq_api_key.get_secret_value().strip()
            model = llm_settings.groq_model
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}"}
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 10
            }
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
                    print(f"Status Code: {resp.status_code}")
                    if resp.status_code != 200:
                        print(f"Response: {resp.text}")
                    else:
                        print("Success!")
                        print(f"Response Content: {resp.json()['choices'][0]['message']['content']}")
                except Exception as e:
                     print(f"Groq Request Failed: {e}")

        else:
            print("\nSkipping Groq test (No Key)")

    except Exception as e:
        print(f"Error checking config: {e}")

if __name__ == "__main__":
    asyncio.run(check_llm_config())
