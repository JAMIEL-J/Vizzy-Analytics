import sys
import os
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append("e:/Vizzy Redesign/backend")

# Force reload of environment variables from .env
# This helps debug if the issue is pydantic not picking up changes or system envs overriding
print("Loading .env file directly...")
load_dotenv("e:/Vizzy Redesign/backend/.env", override=True)

from app.core.config import get_settings

def mask_key(key: str) -> str:
    if not key:
        return "Not Set"
    if len(key) < 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"

def check_config():
    print("\n--- Checking Loaded Configuration ---")
    
    # 1. Check System Environment Variables (Highest Priority usually)
    print("\n[System Environment Variables]")
    gemini_env = os.environ.get("LLM_GEMINI_API_KEY")
    groq_env = os.environ.get("LLM_GROQ_API_KEY")
    print(f"LLM_GEMINI_API_KEY: {mask_key(gemini_env)}")
    print(f"LLM_GROQ_API_KEY:   {mask_key(groq_env)}")

    # 2. Check Pydantic Settings (What the app actually uses)
    print("\n[App Settings (Pydantic)]")
    try:
        settings = get_settings()
        gemini_app = settings.llm.gemini_api_key.get_secret_value()
        groq_app = settings.llm.groq_api_key.get_secret_value()
        
        print(f"Gemini API Key:     {mask_key(gemini_app)}")
        print(f"Groq API Key:       {mask_key(groq_app)}")
        print(f"Primary Provider:   {settings.llm.primary_provider}")
        
        # Check for mismatch
        if gemini_env and gemini_env != gemini_app:
             print("\n⚠️ WARNING: System environment variable differs from App Settings!")
             print("Pydantic might be prioritizing one over the other or .env is not being read correctly.")
             
    except Exception as e:
        print(f"Error loading settings: {e}")

if __name__ == "__main__":
    check_config()
