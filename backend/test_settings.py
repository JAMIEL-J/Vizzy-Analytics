
from app.core.config import get_settings
import os

settings = get_settings()
print(f"DEBUG: gemini_api_key length: {len(settings.llm.gemini_api_key.get_secret_value())}")
print(f"DEBUG: ENV LLM_GEMINI_API_KEY: {os.environ.get('LLM_GEMINI_API_KEY')}")
