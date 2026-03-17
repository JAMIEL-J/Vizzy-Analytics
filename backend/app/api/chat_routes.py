"""
Chat API routes.

Belongs to: API layer
Responsibility: HTTP interfaces for chat operations
Restrictions: Thin controller - all logic delegated to services
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

from app.api.deps import DBSession, AuthenticatedUser, RateLimitedUser
from app.services import chat_service
from app.services.analysis_orchestrator import run_analysis_orchestration
from app.core.exceptions import ResourceNotFound, AuthorizationError, InvalidOperation
from app.services.llm.intent_classifier import classify_intent_fast, FAST_INTENT_LABELS


router = APIRouter()


def _is_currency_kpi(kpi_label: str, chart_spec: dict) -> bool:
    """Detect whether KPI should be rendered as currency."""
    column_metadata = chart_spec.get("column_metadata", {}) if isinstance(chart_spec, dict) else {}
    for meta in column_metadata.values():
        if isinstance(meta, dict) and isinstance(meta.get("display_format"), dict):
            if meta["display_format"].get("type") == "currency":
                return True

    label = (kpi_label or "").lower()
    currency_keywords = [
        "revenue", "profit", "income", "earnings", "cost", "expense",
        "price", "charges", "payment", "budget", "salary", "wage",
        "fee", "sales", "discount", "amount", "value",
    ]
    return any(kw in label for kw in currency_keywords)


def _currency_symbol_from_code(code: str) -> str:
    mapping = {
        "USD": "$",
        "GBP": "£",
        "EUR": "€",
        "INR": "₹",
        "JPY": "¥",
        "CNY": "¥",
        "KRW": "₩",
        "AUD": "A$",
        "CAD": "C$",
        "SGD": "S$",
        "NZD": "NZ$",
        "BRL": "R$",
        "MXN": "Mex$",
    }
    return mapping.get((code or "").upper(), "$")


def _kpi_currency_symbol(chart_spec: dict) -> str:
    column_metadata = chart_spec.get("column_metadata", {}) if isinstance(chart_spec, dict) else {}
    for meta in column_metadata.values():
        display_format = meta.get("display_format", {}) if isinstance(meta, dict) else {}
        if isinstance(display_format, dict) and display_format.get("type") == "currency":
            return _currency_symbol_from_code(display_format.get("currency", "USD"))
    return "$"


def _format_compact_value(value: object, is_currency: bool = False, currency_symbol: str = "$") -> str:
    """Format numeric values into compact K/M form for readability."""
    if not isinstance(value, (int, float)):
        return str(value)

    abs_value = abs(float(value))
    sign = "-" if float(value) < 0 else ""

    if abs_value >= 1_000_000_000:
        num = abs_value / 1_000_000_000
        suffix = "B"
    elif abs_value >= 1_000_000:
        num = abs_value / 1_000_000
        suffix = "M"
    elif abs_value >= 1_000:
        num = abs_value / 1_000
        suffix = "K"
    else:
        if isinstance(value, int) or float(value).is_integer():
            base = f"{int(value):,}"
        else:
            base = f"{float(value):,.2f}".rstrip("0").rstrip(".")
        return f"{currency_symbol}{base}" if is_currency else base

    decimals = 2 if num < 10 else (1 if num < 100 else 0)
    compact = f"{sign}{num:.{decimals}f}".rstrip("0").rstrip(".") + suffix
    return f"{currency_symbol}{compact}" if is_currency else compact


# =============================================================================
# Request/Response Schemas
# =============================================================================


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session."""
    dataset_id: Optional[UUID] = None
    dataset_version_id: Optional[UUID] = None
    title: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    """Request to update session title."""
    title: str = Field(..., min_length=1, max_length=255)


class SendMessageRequest(BaseModel):
    """Request to send a message in a chat session."""
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    """Response for a single message."""
    id: UUID
    role: str
    content: str
    output_data: Optional[dict] = None
    intent_type: Optional[str] = None
    sequence: int

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    """Response for a chat session."""
    id: UUID
    user_id: UUID
    dataset_id: Optional[UUID] = None
    title: str
    message_count: int
    is_active: bool

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """Response after sending a message."""
    user_message: MessageResponse
    assistant_message: MessageResponse


class SessionListResponse(BaseModel):
    """Response for listing sessions."""
    sessions: List[SessionResponse]


class MessageListResponse(BaseModel):
    """Response for listing messages."""
    messages: List[MessageResponse]


# =============================================================================
# Session Routes
# =============================================================================


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
)
def create_session(
    request: CreateSessionRequest,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> SessionResponse:
    """
    Create a new chat session.
    
    Optionally tie to a dataset for context-aware conversations.
    """
    chat_session = chat_service.create_chat_session(
        session=session,
        user_id=UUID(current_user.user_id),
        dataset_id=request.dataset_id,
        dataset_version_id=request.dataset_version_id,
        title=request.title,
    )
    return SessionResponse.model_validate(chat_session)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="List all chat sessions",
)
def list_sessions(
    session: DBSession,
    current_user: AuthenticatedUser,
    limit: int = 50,
) -> SessionListResponse:
    """
    List all chat sessions for the current user.
    """
    sessions = chat_service.list_user_sessions(
        session=session,
        user_id=UUID(current_user.user_id),
        limit=limit,
    )
    return SessionListResponse(
        sessions=[SessionResponse.model_validate(s) for s in sessions]
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Get a chat session",
)
def get_session(
    session_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> SessionResponse:
    """
    Get a specific chat session.
    """
    try:
        chat_session = chat_service.get_chat_session(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
        )
        return SessionResponse.model_validate(chat_session)
    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Update session title",
)
def update_session(
    session_id: UUID,
    request: UpdateSessionRequest,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> SessionResponse:
    """
    Update the title of a chat session.
    """
    try:
        chat_session = chat_service.update_session_title(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
            title=request.title,
        )
        return SessionResponse.model_validate(chat_session)
    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
)
def delete_session(
    session_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> None:
    """
    Delete (soft-delete) a chat session.
    """
    try:
        chat_service.delete_chat_session(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
        )
    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


# =============================================================================
# Message Routes
# =============================================================================


@router.get(
    "/sessions/{session_id}/messages",
    response_model=MessageListResponse,
    summary="Get all messages in a session",
)
def get_messages(
    session_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
    limit: int = 100,
) -> MessageListResponse:
    """
    Get all messages in a chat session.
    """
    try:
        messages = chat_service.get_session_messages(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
            limit=limit,
        )
        return MessageListResponse(
            messages=[MessageResponse.model_validate(m) for m in messages]
        )
    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and get AI response",
)
async def send_message(
    session_id: UUID,
    request: SendMessageRequest,
    session: DBSession,
    current_user: RateLimitedUser,
) -> ChatResponse:
    """
    Send a message to the chat and get AI response.
    
    Pipeline (Intent-Based Routing):
    1. Save user message
    2. Detect intent: dashboard | chart/text
    3. Dashboard → legacy orchestrator (multi-widget generation)
    4. Chart/Text → NL2SQL engine → chart spec builder
    5. Fallback to legacy orchestrator if NL2SQL fails
    6. Apply memory management (token compression)
    7. Save and return assistant response
    """
    try:
        # Get session and validate ownership
        chat_session = chat_service.get_chat_session(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
        )

        # Add user message
        user_msg = chat_service.add_user_message(
            session=session,
            session_id=session_id,
            user_id=UUID(current_user.user_id),
            content=request.content,
        )

        # Auto-generate title from first message
        if chat_session.message_count == 1:
            chat_service.auto_generate_title(
                session=session,
                session_id=session_id,
                first_message=request.content,
            )

        # Run analysis if dataset is attached
        if chat_session.dataset_version_id:
            # ── Intent Detection (6-type heuristic) ──
            detected_intent, intent_confidence, intent_label = classify_intent_fast(request.content)
            is_dashboard = detected_intent == 'dashboard'

            if is_dashboard:
                # ══════════════════════════════════════════════════
                # DASHBOARD → Legacy Orchestrator (multi-widget)
                # ══════════════════════════════════════════════════
                result = await run_analysis_orchestration(
                    session=session,
                    dataset_version_id=chat_session.dataset_version_id,
                    user_id=UUID(current_user.user_id),
                    role=current_user.role,
                    query=request.content,
                )

                assistant_content = result.get("message", "Here is your dashboard.")
                metadata = result.get("metadata", {})
                intent_type = metadata.get("intent_type", "dashboard")
                output_data = result.get("dashboard") or result.get("chart") or result.get("data")
                if output_data and isinstance(output_data, dict):
                    output_data["detected_intent"] = intent_label

            else:
                # ══════════════════════════════════════════════════
                # CHART / TEXT / KPI → NL2SQL Engine (Primary)
                # ══════════════════════════════════════════════════
                nl2sql_result = None
                db_engine = None

                try:
                    import pandas as pd
                    from app.models.dataset_version import DatasetVersion
                    from app.services.analytics.db_engine import DBEngine
                    from app.services.analytics.executor import Executor
                    from app.services.llm.memory_manager import MemoryManager
                    from app.services.visualization.nl2sql_chart_builder import build_chart_from_nl2sql

                    # Load dataset
                    version = session.get(DatasetVersion, chat_session.dataset_version_id)
                    if version:
                        data_path = version.cleaned_reference or version.source_reference
                        
                        # Initialize DuckDB engine
                        db_engine = DBEngine()
                        
                        try:
                            db_engine.load_csv("data", data_path)
                        except Exception as csv_err:
                            logging.getLogger(__name__).warning(f"Direct CSV load failed, falling back to Pandas: {csv_err}")
                            df = pd.read_csv(data_path)
                            db_engine.load_dataframe("data", df)

                        # Apply memory management
                        context_messages = chat_service.get_recent_context(
                            session=session,
                            session_id=session_id,
                            max_messages=5,
                        )
                        memory = MemoryManager()
                        if memory.should_summarize(context_messages):
                            context_messages = await memory.summarize(context_messages)

                        context_prefix = ""
                        if context_messages:
                            history = "\n".join(
                                f"{m['role'].upper()}: {m['content']}" for m in context_messages[:-1]
                            )
                            if history:
                                context_prefix = f"[Conversation Context]:\n{history}\n\n"

                        contextual_query = f"{context_prefix}[Current Question]: {request.content}"

                        # Execute via self-healing NL2SQL engine
                        executor = Executor()
                        nl2sql_result = await executor.run_query(
                            user_query=contextual_query,
                            db=db_engine,
                            table_name="data",
                        )

                except Exception as e:
                    logger.warning(f"NL2SQL engine error: {e}")
                    nl2sql_result = None
                finally:
                    if db_engine is not None:
                        db_engine.close()

                # ── Use NL2SQL result if successful ──
                if nl2sql_result and nl2sql_result.get("success"):
                    logger.info(f"NL2SQL Engine Success: Generated SQL '{nl2sql_result.get('sql')}'")
                    chart_type = nl2sql_result.get("chart_type", "table")
                    timing = nl2sql_result.get("timing", {})

                    # Build proper chart spec from raw NL2SQL data
                    chart_output = build_chart_from_nl2sql(nl2sql_result)
                    chart_spec = chart_output.get("chart", {})
                    explanation = chart_output.get("explanation", {})
                    followups = chart_output.get("followup_suggestions", [])

                    if chart_type == "kpi":
                        kpi_value = chart_spec.get("data", {}).get("value", "")
                        kpi_label = chart_spec.get("data", {}).get("label", "Result")
                        is_currency_kpi = _is_currency_kpi(kpi_label, chart_spec)
                        currency_symbol = _kpi_currency_symbol(chart_spec)
                        formatted_val = _format_compact_value(kpi_value, is_currency=is_currency_kpi, currency_symbol=currency_symbol)
                        
                        assistant_content = (
                            explanation.get("summary", "")
                            or f"**{kpi_label}:** {formatted_val}"
                        )
                        intent_type = "text_query"
                        output_data = {
                            "type": "nl2sql",
                            "response_type": "text",
                            "chart": chart_spec,
                            "data": chart_spec.get("data"),
                            "sql": nl2sql_result.get("sql", ""),
                            "timing": timing,
                            "detected_intent": intent_label,
                            "followup_suggestions": followups,
                        }
                    else:
                        assistant_content = explanation.get("summary", "Here is your analysis.")
                        key_insight = explanation.get("key_insight", "")
                        if key_insight:
                            assistant_content = f"{assistant_content}\n\n**Key Insight:** {key_insight}"

                        intent_type = "analysis"
                        output_data = {
                            "type": "nl2sql",
                            "response_type": "chart",
                            "chart": chart_spec,
                            "explanation": explanation,
                            "sql": nl2sql_result.get("sql", ""),
                            "timing": timing,
                            "detected_intent": intent_label,
                            "followup_suggestions": followups,
                        }

                elif nl2sql_result and nl2sql_result.get("ambiguity"):
                    # ── Ambiguity Clarification ──
                    ambiguity = nl2sql_result["ambiguity"]
                    term = ambiguity.get("term", "")
                    candidates = ambiguity.get("candidates", [])
                    question = ambiguity.get("question", f"Which '{term}' column did you mean?")

                    assistant_content = f"Your query mentions **\"{term}\"** which could refer to multiple columns. Please select the one you meant:"
                    intent_type = "clarification"
                    output_data = {
                        "type": "clarification",
                        "ambiguity": {
                            "term": term,
                            "candidates": candidates,
                            "question": question,
                            "original_query": request.content,
                        },
                        "timing": nl2sql_result.get("timing", {}),
                        "detected_intent": intent_label,
                    }

                else:
                    # ── NL2SQL failed — surface diagnostics then fallback ──
                    diagnostics = nl2sql_result.get("diagnostics") if nl2sql_result else None
                    failed_timing = nl2sql_result.get("timing") if nl2sql_result else None
                    reason = nl2sql_result.get("error") if nl2sql_result else "Unknown crash"
                    logger.warning(f"NL2SQL Engine failed ({reason}). Falling back to Legacy Orchestrator.")

                    result = await run_analysis_orchestration(
                        session=session,
                        dataset_version_id=chat_session.dataset_version_id,
                        user_id=UUID(current_user.user_id),
                        role=current_user.role,
                        query=request.content,
                    )

                    assistant_content = result.get("message", "Here is your analysis.")
                    metadata = result.get("metadata", {})
                    intent_type = metadata.get("intent_type")
                    output_data = result.get("chart") or result.get("dashboard") or result.get("data")

                    # Attach diagnostics for the frontend to optionally display
                    if output_data and isinstance(output_data, dict) and diagnostics:
                        output_data["nl2sql_diagnostics"] = diagnostics
                        output_data["nl2sql_timing"] = failed_timing
                        output_data["detected_intent"] = intent_label


        else:
            # No dataset - just acknowledge
            assistant_content = "Please attach a dataset to this conversation to analyze data."
            output_data = None
            intent_type = None

        # Add assistant message
        assistant_msg = chat_service.add_assistant_message(
            session=session,
            session_id=session_id,
            content=assistant_content,
            output_data=output_data,
            intent_type=intent_type,
        )

        return ChatResponse(
            user_message=MessageResponse.model_validate(user_msg),
            assistant_message=MessageResponse.model_validate(assistant_msg),
        )

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except InvalidOperation as e:
        raise HTTPException(status_code=400, detail=e.message)


