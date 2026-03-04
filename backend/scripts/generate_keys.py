#!/usr/bin/env python3
"""
Generate secure random keys for environment variables.

Usage:
    python scripts/generate_keys.py
"""

import secrets


def generate_secret_key(length: int = 32) -> str:
    """Generate a URL-safe random key."""
    return secrets.token_urlsafe(length)


def main():
    print("=" * 60)
    print("Secure Key Generator for Vizzy Backend")
    print("=" * 60)
    print()
    
    # Generate auth secret key
    auth_key = generate_secret_key(32)
    print("Generated AUTH_SECRET_KEY:")
    print(f"   {auth_key}")
    print()
    
    # Generate additional keys if needed
    print("Copy the key above and paste it in your .env file:")
    print(f'   AUTH_SECRET_KEY={auth_key}')
    print()
    
    # Show example .env configuration
    print("Example .env configuration:")
    print("-" * 60)
    print(f"""
# Authentication
AUTH_SECRET_KEY={auth_key}
AUTH_ALGORITHM=HS256
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (SQLite for development)
DB_TYPE=sqlite
DB_SQLITE_PATH=./data/vizzy.db

# LLM Providers
LLM_GEMINI_API_KEY=your_gemini_api_key_here
LLM_GROQ_API_KEY=your_groq_api_key_here
    """.strip())
    print("-" * 60)
    print()
    print("IMPORTANT:")
    print("   - Never commit .env to version control")
    print("   - Keep your API keys secure")
    print("   - Use different keys for dev/staging/production")
    print()


if __name__ == "__main__":
    main()
