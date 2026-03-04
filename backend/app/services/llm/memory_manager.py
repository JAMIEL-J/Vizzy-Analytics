import logging
import tiktoken
from typing import List, Dict

from app.services.llm.llm_router import LLMRouter

logger = logging.getLogger(__name__)


SUMMARIZATION_PROMPT = """You are a conversation summarizer for a BI analytics chatbot.

Compress the following conversation history into a single, dense paragraph.
Preserve:
- Key data questions asked and answers given
- Any column names, metrics, or filters mentioned
- The user's analytical intent and context

Do NOT add any preamble. Return ONLY the summary paragraph."""


class MemoryManager:
    MAX_TOKENS = 2000
    KEEP_RECENT = 4  # Always keep the last N messages unsummarized

    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        """Initialize tiktoken encoder."""
        self.encoder = tiktoken.encoding_for_model(model_name)

    def count_tokens(self, messages: List[Dict[str, str]]) -> int:
        """Count tokens accurately to avoid API limit errors."""
        text_content = " ".join([m.get('content', '') for m in messages])
        return len(self.encoder.encode(text_content))

    def should_summarize(self, messages: List[Dict[str, str]]) -> bool:
        """Check if message context exceeds token budget limit."""
        return self.count_tokens(messages) > self.MAX_TOKENS

    async def summarize(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Compress old messages via LLM and keep recent ones intact.

        Strategy:
        1. Split into old_messages (to compress) and recent_messages (to keep).
        2. Send old_messages to LLM for paragraph-level compression.
        3. Return [summary_message] + recent_messages.
        """
        if len(messages) <= self.KEEP_RECENT:
            return messages

        old_messages = messages[:-self.KEEP_RECENT]
        recent_messages = messages[-self.KEEP_RECENT:]

        # Build conversation text for summarization
        conversation_text = "\n".join(
            f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
            for m in old_messages
        )

        try:
            router = LLMRouter()
            prompt = f"{SUMMARIZATION_PROMPT}\n\n---\n{conversation_text}\n---"
            summary_text = await router.generate_response(prompt, json_mode=False)

            # LLM may return raw text or str - clean it
            summary_text = str(summary_text).strip()

            summary_message = {
                "role": "system",
                "content": f"[Conversation Summary]: {summary_text}",
            }

            token_count = self.count_tokens([summary_message] + recent_messages)
            logger.info(f"Summarized {len(old_messages)} messages → {token_count} tokens")

            return [summary_message] + recent_messages

        except Exception as e:
            logger.warning(f"Summarization failed, falling back to truncation: {e}")
            # Fallback: just keep recent messages
            return recent_messages

