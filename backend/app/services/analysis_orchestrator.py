import pandas as pd
from uuid import UUID
from typing import Dict, Any, Optional, List
import datetime

from sqlmodel import Session, select

from app.core.exceptions import ResourceNotFound, InvalidOperation
from app.core.audit import record_audit_event
from app.core.logger import get_logger
from app.models.dataset_version import DatasetVersion
from app.models.analysis_contract import AnalysisContract
from app.services.llm.intent_classifier import classify_intent
from app.services.llm.intent_validator import validate_intent
from app.services.llm.intent_mapper import map_intent_to_operation
from app.services.llm.intent_schema import IntentType, Aggregation
from app.services.llm.chart_explainer import generate_chart_explanation
from app.services.llm.text_answer_generator import generate_text_answer
from app.services.llm.response_formatter import (
    format_analysis_response,
    format_dashboard_response,
    format_error_response,
    format_text_response,
)
from app.services.analysis_execution.analysis_executor import execute_analysis
from app.services.visualization.dashboard_generator import (
    generate_overview_dashboard,
    build_single_chart,
)
from app.services.analysis_service import create_analysis_result


logger = get_logger(__name__)


def _infer_currency_symbol(df: pd.DataFrame, visualization_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Infer currency symbol based on Country/Region columns or visualization context.
    
    Logic:
    1. Scan visualization data and dataframe for geo-location values.
    2. Map values to currencies.
    3. If all mapped values share the SAME currency, return it.
    4. If mixed currencies (e.g. USA + UK) or unknown, return default '$'.
    """
    
    # Comprehensive Mapping
    # Terms should be lowercase
    COUNTRY_CURRENCY_MAP = {
        # Europe (Euro)
        'germany': '€', 'france': '€', 'italy': '€', 'spain': '€', 'netherlands': '€', 
        'belgium': '€', 'austria': '€', 'ireland': '€', 'finland': '€', 'portugal': '€',
        'greece': '€', 'europe': '€', 'eu': '€', 'euro': '€',
        
        # UK
        'uk': '£', 'united kingdom': '£', 'britain': '£', 'england': '£', 'scotland': '£', 'wales': '£',
        
        # Americas
        'usa': '$', 'united states': '$', 'us': '$', 'america': '$',
        'canada': 'C$', 'can': 'C$',
        'brazil': 'R$', 'brazilian': 'R$',
        'mexico': 'Mex$',
        
        # Asia / Pacific
        'india': '₹', 'indian': '₹',
        'japan': '¥', 'japanese': '¥',
        'china': '¥', 'chinese': '¥', 'cn': '¥',
        'australia': 'A$', 'aus': 'A$',
        'new zealand': 'NZ$',
        'singapore': 'S$',
        'south korea': '₩', 'korea': '₩',
        
        # Valid symbols that might appear as values
        '€': '€', '£': '£', '₹': '₹', '¥': '¥', '₽': '₽'
    }

    detected_currencies = set()
    
    def check_value(val):
        """Helper to check a single value string against the map."""
        s = str(val).lower().strip()
        # Direct match
        if s in COUNTRY_CURRENCY_MAP:
             detected_currencies.add(COUNTRY_CURRENCY_MAP[s])
             return

        # substring match check (slower but helpful for "Paris, France")
        # Optimization: only check if we haven't found a direct match? 
        # Actually for "France", "Germany" we want to find them.
        for places, symbol in COUNTRY_CURRENCY_MAP.items():
            # Check if place name is INSIDE the value (e.g. "Paris, France" contains "france")
            # We use word boundary check approximation by space
            if places in s:
                detected_currencies.add(symbol)
    
    # 1. Check Visualization Data (High Priority)
    if visualization_data and "rows" in visualization_data:
        for row in visualization_data["rows"]:
            for key, value in row.items():
                if value and isinstance(value, str):
                    check_value(value)

    # 2. Check DataFrame Columns (if not enough info from viz)
    # We scan ALL potential geo columns to capture multi-country scenarios
    geo_keywords = ['country', 'region', 'nation', 'state', 'loc', 'geography', 'territory']
    geo_cols = [c for c in df.columns if any(kw in c.lower() for kw in geo_keywords)]

    if geo_cols:
        # Check first 50 unique values from EACH geo column
        for col in geo_cols:
            try:
                unique_vals = df[col].dropna().unique()[:50]
                for val in unique_vals:
                    check_value(val)
            except Exception:
                continue

    # Decision Logic
    if len(detected_currencies) == 1:
        return list(detected_currencies)[0]
    elif len(detected_currencies) > 1:
        # Mixed currencies (e.g. USD and GBP) -> Default to USD to avoid confusion
        return "$"
    else:
        # No currency detected -> Default
        return "$"


def _format_number(value: float) -> str:
    """Helper to format numbers for text responses."""
    if pd.isna(value):
        return "N/A"
    
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if value >= 1_000_000:
                return f"{value / 1_000_000:.2f}M"
            elif value >= 1_000:
                return f"{value / 1_000:.2f}K"
            elif value == int(value):
                return f"{int(value):,}"
            else:
                return f"{value:,.2f}"
        return f"{value:,}"
    return str(value)


def _calculate_pop_change(df: pd.DataFrame, metric: str, date_col: str) -> Optional[Dict[str, Any]]:
    """
    Calculate Period-over-Period change with MTD normalization.
    
    Logic:
    1. Identify max date in dataset (current anchor).
    2. Define Current Period: Start of month to Max Date.
    3. Define Previous Period: Start of PREVIOUS month to (Start of Prev Month + (Max Date Day - 1)).
       - Example: If Max Date is Jan 14, Prev Period is Dec 1 - Dec 14.
    """
    try:
        if date_col not in df.columns:
            return None
            
        # Ensure datetime
        if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
             try:
                 df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
             except:
                 return None

        # Drop NaTs
        dates = df[date_col].dropna()
        if dates.empty:
            return None

        max_date = dates.max()
        if pd.isna(max_date):
            return None
            
        # 1. Current Period (MTD)
        current_start = max_date.replace(day=1)
        current_end = max_date
        
        # 2. Previous Period (MTD Normalized)
        # Calculate previous month start
        if current_start.month == 1:
            prev_start = current_start.replace(year=current_start.year - 1, month=12)
        else:
            prev_start = current_start.replace(month=current_start.month - 1)
            
        # Calculate previous month end point (same day number or last day of prev month)
        # Handle edge case: Jan 31 -> Prev is Dec 31. Mar 31 -> Prev is Feb 28.
        import calendar
        _, last_day_prev = calendar.monthrange(prev_start.year, prev_start.month)
        target_day = min(current_end.day, last_day_prev)
        prev_end = prev_start.replace(day=target_day)
        
        # Filter Data
        current_data = df[(df[date_col] >= current_start) & (df[date_col] <= current_end)]
        prev_data = df[(df[date_col] >= prev_start) & (df[date_col] <= prev_end)]
        
        # Calculate Metric
        current_val = current_data[metric].sum()
        prev_val = prev_data[metric].sum()
        
        # Calculate Growth
        if prev_val == 0:
            growth = None
        else:
            growth = ((current_val - prev_val) / prev_val) * 100
            
        return {
            "current_period": f"{current_start.strftime('%b %d')} - {current_end.strftime('%b %d')}",
            "previous_period": f"{prev_start.strftime('%b %d')} - {prev_end.strftime('%b %d')}",
            "current_value": current_val,
            "previous_value": prev_val,
            "growth_pct": growth,
            "is_mtd": True
        }
    except Exception as e:
        logger.warning(f"PoP calculation failed: {e}")
        return None


async def run_analysis_orchestration(
    *,
    session: Session,
    dataset_version_id: UUID,
    user_id: UUID,
    role,
    query: str,
    context: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Full conversational analytics pipeline with natural language responses.

    Branches based on intent_type:
    - "analysis" → Single chart output with explanation
    - "dashboard" → Multi-widget BI dashboard
    - "text_query" → Text-only response (no chart)

    Args:
        session: Database session
        dataset_version_id: Target dataset version
        user_id: Current user
        role: User role for authorization
        query: User's natural language query
        context: Optional previous messages for conversational context
    
    Returns:
        Formatted response with message, chart, explanation, and suggestions
    """

    # 1. Load dataset version
    version = session.get(DatasetVersion, dataset_version_id)
    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(dataset_version_id))

    # 2. Load data
    data_path = version.cleaned_reference or version.source_reference

    try:
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        raise InvalidOperation(
            operation="run_analysis",
            reason="Data file not found",
            details=f"Path: {data_path}",
        )
    except Exception as e:
        raise InvalidOperation(
            operation="run_analysis",
            reason="Failed to load data file",
            details=str(e),
        )

    # 3. Get analysis contract
    contract = session.exec(
        select(AnalysisContract).where(
            AnalysisContract.dataset_version_id == dataset_version_id,
            AnalysisContract.is_active == True,
        )
    ).first()

    if not contract:
        logger.info(f"No contract found for version {dataset_version_id}. Auto-generating...")
        # Auto-detect domain and build contract
        from app.services.analytics import detect_domain, filter_columns
        from app.services.analysis_contract_service import create_analysis_contract
        
        domain, _ = detect_domain(df)
        classification = filter_columns(df, domain)
        
        contract = create_analysis_contract(
            session=session,
            dataset_version_id=dataset_version_id,
            allowed_metrics={"metrics": classification.metrics},
            allowed_dimensions={
                "dimensions": classification.dimensions,
                "targets": classification.targets,  # binary outcomes (Churn, Status, etc.)
            },
            user_id=user_id,
            role=role,
        )
        logger.info(f"Successfully auto-generated contract with domain: {domain.value}")

    # 4. Build schema with context
    # Combine metrics and dimensions and get dtypes from df
    allowed_cols = set()
    if contract.allowed_metrics and "metrics" in contract.allowed_metrics:
        allowed_cols.update(contract.allowed_metrics["metrics"])
    if contract.allowed_dimensions and "dimensions" in contract.allowed_dimensions:
        allowed_cols.update(contract.allowed_dimensions["dimensions"])
    
    # Build formatted columns list for LLM
    columns_schema = []
    for col in allowed_cols:
        if col in df.columns:
            dtype = str(df[col].dtype)
            columns_schema.append({"name": col, "dtype": dtype})
    
    schema = {"columns": columns_schema}
    
    if context:
        # Add conversation context to help with follow-up questions
        schema["_context"] = context[-5:]  # Last 5 messages

    # 5. Classify intent
    intent = await classify_intent(
        query=query,
        schema=schema,
    )

    logger.info(f"Classified intent: {intent.intent_type.value} for query: {query[:50]}...")

    # [NEW] Refusal Service Check
    from app.services.llm.refusal_service import RefusalService
    refusal_service = RefusalService()
    refusal = refusal_service.check_refusal(query, contract, intent.intent_type.value)
    if refusal:
        # Return refusal response immediately
        return {
            "message": refusal["message"],
            "suggestions": refusal["suggestions"],
            "refused": True
        }

    # [NEW] Staleness Check
    staleness_warning = None
    time_cols = [c for c in df.columns if 'date' in c.lower() or 'time' in c.lower()]
    if time_cols:
        # Use first time col for check
        date_col = time_cols[0]
        try:
             # Ensure datetime
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            
            max_date = df[date_col].max()
            if not pd.isna(max_date):
                now = datetime.datetime.now()
                # Simple naive check
                if (now - max_date).total_seconds() > 48 * 3600:
                    days_old = (now - max_date).days
                    staleness_warning = f"⚠️ Warning: This data is {days_old} days old (Last updated: {max_date.strftime('%Y-%m-%d')})."
        except Exception as ex:
            logger.warning(f"Staleness check failed: {ex}")

    # 6. Branch based on intent_type
    # Map legacy types to new types for backward compatibility
    _LEGACY_MAP = {
        IntentType.ANALYSIS: 'analysis_chart',
        IntentType.VISUALIZATION: 'analysis_chart',
        IntentType.DASHBOARD: 'dashboard',
        IntentType.TEXT_QUERY: 'retrieval',
    }
    _NEW_MAP = {
        IntentType.RETRIEVAL: 'retrieval',
        IntentType.COMPARATIVE: 'analysis_chart',
        IntentType.AGGREGATIVE: 'analysis_chart',
        IntentType.TREND: 'analysis_chart',
        IntentType.INTERPRETIVE: 'interpretive',
        IntentType.AMBIGUOUS: 'retrieval',
    }
    route = _LEGACY_MAP.get(intent.intent_type) or _NEW_MAP.get(intent.intent_type, 'analysis_chart')

    if route == 'dashboard':
        # DASHBOARD MODE: Generate multi-widget overview
        dashboard_output = generate_overview_dashboard(
            df=df,
            schema=contract.allowed_metrics or {},
        )
        
        # Extract inner dashboard spec  (avoid double-nesting)
        dashboard_spec = dashboard_output.get("dashboard", {})
        widget_count = len(dashboard_spec.get("widgets", []))
        
        result_payload = {"type": "dashboard", "widget_count": widget_count}
        
        # Format dashboard response
        formatted_response = format_dashboard_response(
            query=query,
            dashboard_spec=dashboard_spec,  # Pass  the inner spec, not the wrapper
            widget_count=widget_count,
        )

    elif route == 'interpretive':
        # INTERPRETIVE MODE: Multi-query diagnostic battery
        from app.services.analytics.diagnostic_battery import run_diagnostic_battery
        from app.core.llm_client import get_llm_client

        logger.info("Processing interpretive query — running diagnostic battery")

        battery_result = await run_diagnostic_battery(
            df=df,
            query=query,
            target_col=contract.target_column if hasattr(contract, 'target_column') else None,
            metric_col=intent.metric,
        )

        diagnostics = battery_result.get("diagnostics", [])

        if diagnostics:
            # Synthesize findings with LLM
            synthesis_prompt = f"""You are a senior data analyst. Based on the following diagnostic breakdowns,
write a concise explanation answering the user's question.

{battery_result['synthesis_context']}

Rules:
- Start with a direct answer to the question
- Cite the top 2-3 drivers with actual numbers
- Keep it under 200 words
- Use plain English, no jargon
- Do NOT use markdown formatting or bullet points. Plain text with paragraphs only."""

            try:
                llm_client = get_llm_client()
                synthesis_response = await llm_client.complete(
                    system_prompt="You are a data analyst writing a brief diagnostic summary.",
                    user_prompt=synthesis_prompt,
                    temperature=0.3,
                    max_tokens=512,
                )
                synthesis_text = synthesis_response.content.strip()
            except Exception as e:
                logger.warning(f"LLM synthesis failed: {e}")
                synthesis_text = battery_result["synthesis_context"]

            # Build chart specs for each diagnostic
            diag_charts = []
            for diag in diagnostics:
                diag_charts.append({
                    "type": "bar",
                    "title": diag["title"],
                    "data": {
                        "labels": [row.get(diag["dimension"], "") for row in diag["data"]],
                        "rows": diag["data"],
                    },
                })

            result_payload = {
                "type": "interpretive",
                "diagnostics": diagnostics,
                "target": battery_result["target"],
            }

            formatted_response = {
                "content": synthesis_text,
                "output_data": {
                    "type": "interpretive",
                    "response_type": "multi_chart",
                    "charts": diag_charts,
                    "diagnostics_count": len(diagnostics),
                    "detected_intent": "interpretive",
                    "staleness_warning": staleness_warning,
                },
                "intent_type": "interpretive",
                "staleness_warning": staleness_warning,
            }

            if staleness_warning:
                formatted_response["content"] = f"{staleness_warning}\n\n{formatted_response['content']}"
        else:
            # No diagnostics → fall through to analysis chart
            result_payload, formatted_response = await _handle_analysis_chart(
                df=df, query=query, intent=intent, contract=contract, context=context, staleness_warning=staleness_warning
            )

    elif route == 'retrieval':
        # RETRIEVAL MODE: Text-only response without chart (was TEXT_QUERY)
        logger.info("Processing retrieval/text-only query (no visualization)")
        
        # Generate text answer
        text_result = generate_text_answer(
            df=df,
            intent=intent,
            query=query,
            contract=contract,  # Pass contract for metric verification
        )
        
        result_payload = {
            "type": "text_query",
            "value": text_result.get("value"),
            "column": text_result.get("column"),
            "aggregation": text_result.get("aggregation"),
        }
        
        answer_text = text_result.get("answer", "I computed the result for you.")
        
        # Prepend Staleness Warning if exists
        if staleness_warning:
            answer_text = f"{staleness_warning}\n\n{answer_text}"

        # Format text response
        formatted_response = format_text_response(
            query=query,
            answer=answer_text,
            data_summary={
                "value": text_result.get("value"),
                "column": text_result.get("column"),
                "aggregation": text_result.get("aggregation"),
            } if text_result.get("value") else None,
            context={"previous_messages": context} if context else None,
        )

    else:
        # ANALYSIS MODE: Single chart with explanation
        result_payload, formatted_response = await _handle_analysis_chart(
            df=df, query=query, intent=intent, contract=contract, context=context, staleness_warning=staleness_warning
        )

    # 7. Persist result
    create_analysis_result(
        session=session,
        dataset_version_id=dataset_version_id,
        analysis_contract_id=contract.id,
        result_payload=result_payload,
        user_id=user_id,
        role=role,
    )

    # 8. Audit
    record_audit_event(
        event_type="ANALYSIS_EXECUTED",
        user_id=str(user_id),
        resource_type="DatasetVersion",
        resource_id=str(dataset_version_id),
        metadata={
            "query": query,
            "intent_type": intent.intent_type.value,
            "has_context": context is not None,
        },
    )

    return formatted_response


async def _handle_analysis_chart(
    *,
    df: pd.DataFrame,
    query: str,
    intent: Any,
    contract: Any,
    context: Optional[List[Dict[str, str]]],
    staleness_warning: Optional[str],
) -> tuple:
    """Helper to handle the analysis_chart branch logic recursively/re-dispatchable."""
    from app.services.llm.intent_validator import validate_intent
    from app.services.llm.intent_mapper import map_intent_to_operation
    from app.services.analysis_execution.analysis_executor import execute_analysis
    from app.services.visualization.dashboard_generator import build_single_chart
    from app.services.llm.chart_explainer import generate_chart_explanation
    from app.services.llm.response_formatter import format_analysis_response
    from app.services.llm.intent_schema import Aggregation

    # validate_intent returns intent with resolved/fuzzy-matched column names
    intent = validate_intent(
        intent=intent,
        contract=contract,
        available_columns=list(df.columns),
        time_columns=[col for col in df.columns if "date" in col.lower() or "time" in col.lower()],
    )

    operation = map_intent_to_operation(intent)
    result = execute_analysis(df=df, operation_spec=operation)
    
    # PoP Logic injection
    pop_data = None
    if intent.aggregation in [Aggregation.SUM, Aggregation.COUNT, Aggregation.AVG] and intent.metric:
        # Find date column
        date_col = next((c for c in df.columns if "date" in c.lower()), None)
        if date_col:
            pop_data = _calculate_pop_change(df, intent.metric, date_col)
            if pop_data:
                result["pop_analysis"] = pop_data
    
    chart_output = build_single_chart(result)
    chart_spec = chart_output.get("chart", {})
    
    result_payload = result

    # Infer currency based on the visualization context
    visualization_data = chart_spec.get("data", {})
    currency_symbol = _infer_currency_symbol(df, visualization_data=visualization_data)
    
    # Inject currency into chart spec ONLY if it's EXPLICITLY a financial metric
    explicit_money_keywords = [
        'revenue', 'profit', 'income', 'earnings', 'cost', 'expense', 
        'price', 'charges', 'payment', 'budget', 'fee'
    ]
    
    is_financial = False
    chart_str = str(chart_spec).lower()
    if any(kw in chart_str for kw in explicit_money_keywords):
        is_financial = True
        
    has_sales_only = 'sales' in chart_str and not is_financial
    if has_sales_only:
        is_financial = False
        
    if is_financial:
        chart_spec["currency"] = currency_symbol

    explanation = await generate_chart_explanation(
        chart_type=chart_spec.get("type", "chart"),
        chart_data=chart_spec,
        user_query=query,
        currency_symbol=currency_symbol if is_financial else None,
    )

    # Append Staleness Warning to explanation (At the end)
    if staleness_warning:
        # explanation["summary"] = ... (Do not touch summary)
        explanation["explanation"] = f"{explanation.get('explanation', '')}\n\n{staleness_warning}"
        
    # Append PoP info to explanation if available
    if pop_data:
        growth_str = f"{pop_data['growth_pct']:.1f}%" if pop_data['growth_pct'] is not None else "N/A"
        direction = "increase" if pop_data['growth_pct'] > 0 else "decrease"
        
        # Use currency in PoP if financial
        curr_prefix = currency_symbol if is_financial else ""
        
        pop_text = (
            f"\n\n**Period-over-Period (MTD):**\n"
            f"- **Current Period** ({pop_data['current_period']}): {curr_prefix}{_format_number(pop_data['current_value'])}\n"
            f"- **Previous Period** ({pop_data['previous_period']}): {curr_prefix}{_format_number(pop_data['previous_value'])}\n"
            f"- **Change**: {growth_str} {direction} vs last month."
        )
        explanation["explanation"] = explanation.get("explanation", "") + pop_text

    formatted_response = format_analysis_response(
        query=query,
        chart_spec=chart_spec,
        explanation=explanation,
        intent_type=intent.intent_type.value,
        context={"previous_messages": context} if context else None,
    )
    
    return result_payload, formatted_response


async def run_analysis_with_context(
    *,
    session: Session,
    dataset_version_id: UUID,
    chat_session_id: UUID,
    user_id: UUID,
    role,
    query: str,
) -> Dict[str, Any]:
    """
    Run analysis with conversational context from chat session.
    """
    from app.services.chat_service import get_recent_context
    
    # Get conversation context
    context = get_recent_context(
        session=session,
        session_id=chat_session_id,
        max_messages=5,
    )
    
    # Run analysis with context
    return await run_analysis_orchestration(
        session=session,
        dataset_version_id=dataset_version_id,
        user_id=user_id,
        role=role,
        query=query,
        context=context,
    )
