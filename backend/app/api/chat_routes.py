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


router = APIRouter()


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
            # ── Intent Detection ──
            query_lower = request.content.lower()
            dashboard_keywords = ["dashboard", "overview", "summary dashboard", "report", "all metrics"]
            is_dashboard = any(kw in query_lower for kw in dashboard_keywords)

            if is_dashboard:
                # ══════════════════════════════════════════════════
                # DASHBOARD → Legacy Orchestrator (multi-widget)
                # NL2SQL generates ONE SQL query — dashboards need
                # multiple widgets from different column analyses.
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
                        
                        # Try to load CSV directly (More efficient for 200MB+ files)
                        try:
                            db_engine.load_csv("data", data_path)
                        except Exception as csv_err:
                            # Fallback to Pandas if DuckDB's direct read fails
                            logging.getLogger(__name__).warning(f"Direct CSV load failed, falling back to Pandas: {csv_err}")
                            df = pd.read_csv(data_path)
                            db_engine.load_dataframe("data", df)

                        # Apply memory management to conversation context
                        context_messages = chat_service.get_recent_context(
                            session=session,
                            session_id=session_id,
                            max_messages=5,
                        )
                        memory = MemoryManager()
                        if memory.should_summarize(context_messages):
                            context_messages = await memory.summarize(context_messages)

                        # Build contextual query with conversation history
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

                    # Build proper chart spec from raw NL2SQL data
                    chart_output = build_chart_from_nl2sql(nl2sql_result)
                    chart_spec = chart_output.get("chart", {})
                    explanation = chart_output.get("explanation", {})
                    followups = chart_output.get("followup_suggestions", [])

                    # Format response based on chart type
                    if chart_type == "kpi":
                        # KPI / text response
                        kpi_value = chart_spec.get("data", {}).get("value", "")
                        kpi_label = chart_spec.get("data", {}).get("label", "Result")
                        
                        # Format value: whole if int, 2 decimal if float
                        formatted_val = f"{kpi_value:,}" if isinstance(kpi_value, int) else (f"{kpi_value:,.2f}".rstrip('0').rstrip('.') if isinstance(kpi_value, float) else str(kpi_value))
                        
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
                            "followup_suggestions": followups,
                        }
                    else:
                        # Chart response (bar, line, pie, table)
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
                            "followup_suggestions": followups,
                        }
                else:
                    reason = nl2sql_result.get("error") if nl2sql_result else "Unknown crash"
                    logger.warning(f"NL2SQL Engine failed to produce result ({reason}). Falling back to Legacy Orchestrator.")
                    # ── Fallback to legacy orchestrator ──
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


