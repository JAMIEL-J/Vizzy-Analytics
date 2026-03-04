"""
Intent classifier module.

Belongs to: LLM services layer
Responsibility: Classify user queries into structured intents using LLM
Restrictions: Returns validated AnalysisIntent only
"""

import re
from typing import Dict, Any

from app.core.llm_client import get_llm_client, parse_json_response
from app.core.logger import get_logger
from app.services.llm.intent_schema import AnalysisIntent, IntentType, Aggregation


logger = get_logger(__name__)


# Keywords that indicate user wants a visualization/chart
VISUALIZATION_KEYWORDS = [
    # Action words
    "show", "show me", "display", "visualize", "plot", "graph", "chart",
    "create", "create a", "generate", "draw", "render", "build",
    # Chart type words
    "bar chart", "line chart", "pie chart", "histogram", "scatter",
    "heatmap", "treemap", "funnel", "gauge", "map",
    # Visual phrases
    "give me a chart", "make a graph", "visually", "visualization",
    "breakdown", "distribution", "compare visually", "trend chart",
    # Dashboard triggers
    "dashboard", "overview", "summary dashboard", "report",
]

# Keywords that indicate text-only response (no chart)
TEXT_QUERY_KEYWORDS = [
    # Question words
    "what is", "what's", "how many", "how much", "tell me",
    "explain", "describe", "define", "summarize", "list",
    # Information requests
    "total", "average", "count", "minimum", "maximum", "sum",
    "mean", "median", "percentage", "ratio", "difference",
    # Descriptive queries
    "why", "when", "which", "who", "where",
    "about", "regarding", "concerning",
]


def _detect_visualization_intent(query: str) -> bool:
    """
    Detect if query requires a visualization based on keywords.
    
    Returns True if visualization keywords are found.
    """
    query_lower = query.lower()
    
    for keyword in VISUALIZATION_KEYWORDS:
        if keyword in query_lower:
            return True
    
    return False


def _detect_dashboard_intent(query: str) -> bool:
    """Detect if query asks for a dashboard/overview."""
    dashboard_keywords = ["dashboard", "overview", "summary", "report", "all metrics"]
    query_lower = query.lower()
    
    for keyword in dashboard_keywords:
        if keyword in query_lower:
            return True
    
    return False


# System prompt for intent classification
INTENT_CLASSIFICATION_SYSTEM_PROMPT = """
You are a production-grade analytical intent classifier for a BI copilot.

Your job is to classify user queries into structured JSON for data analysis.

Rules:
- If user EXPLICITLY asks for a visualization (show, plot, chart, graph, visualize) → intent_type = "analysis"
- If user asks a specific question about a number (what is, how many, total, count, list) WITHOUT asking for a chart → intent_type = "text_query"
- If user asks for dashboard, overview, summary → intent_type = "dashboard"
- Do NOT guess column names - use exact names from schema
- Always return valid JSON

Intent Type Guidelines:
1. "analysis" = User wants a CHART (bar, line, pie, etc.)
   - "Show sales by region"
   - "Plot revenue trend"
   - "Graph the distribution"

2. "text_query" = User wants a TEXT ANSWER only (no chart)
   - "What is the total revenue?" (Single number)
   - "How many customers do we have?" (Single number)
   - "List the top 5 products" (Table/List)
   - "Who is the best customer?" (Single entity)

3. "dashboard" = User wants multiple charts/overview
   - "Give me an overview"
   - "Dashboard for sales"

Output format:
{
  "intent_type": "analysis" | "dashboard" | "text_query",
  "aggregation": "count" | "sum" | "average" | "min" | "max" | null,
  "metric": "<column_name>" | null,
  "group_by": ["<column_name>"] | null,
  "time_column": "<column_name>" | null,
  "time_granularity": "day" | "week" | "month" | "year" | null
}
"""


def build_user_prompt(query: str, schema: Dict[str, Any]) -> str:
    """Build user prompt with query and schema context."""
    schema_str = "\n".join([
        f"- {col['name']}: {col['dtype']}"
        for col in schema.get("columns", [])
    ]) if schema else "No schema available"

    return f"""
User Query:
{query}

Dataset Schema:
{schema_str}

Return ONLY the JSON object, no explanations.
"""


async def classify_intent(
    query: str,
    schema: Dict[str, Any],
) -> AnalysisIntent:
    """
    Classify user query into structured AnalysisIntent using LLM.
    
    Uses multi-provider LLM client with automatic fallback.
    Pre-filters using keyword detection for faster response.
    """
    # Quick keyword-based detection first
    is_dashboard = _detect_dashboard_intent(query)
    is_visualization = _detect_visualization_intent(query)
    
    client = get_llm_client()

    user_prompt = build_user_prompt(query, schema)

    response = await client.complete(
        system_prompt=INTENT_CLASSIFICATION_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.0,  # Deterministic output
    )

    logger.info(f"LLM response from {response.provider.value}: {response.content[:100]}...")

    # Parse JSON response
    data = parse_json_response(response.content)

    # Override with keyword detection if LLM misses it
    llm_intent = data.get("intent_type", "analysis")
    
    # Force dashboard if clearly detected
    if is_dashboard:
        llm_intent = "dashboard"
    # Force analysis if visualization keywords detected
    elif is_visualization and llm_intent == "text_query":
        llm_intent = "analysis"
    # Keep text_query if no visualization keywords
    elif not is_visualization and llm_intent == "analysis":
        llm_intent = "text_query"

    # Handle null aggregation
    if data.get("aggregation") is None:
        data["aggregation"] = "count"

    # Validate and create AnalysisIntent
    intent = AnalysisIntent(
        intent_type=IntentType(llm_intent),
        aggregation=Aggregation(data["aggregation"]),
        metric=data.get("metric"),
        group_by=data.get("group_by"),
        time_column=data.get("time_column"),
        time_granularity=data.get("time_granularity"),
    )

    logger.info(f"Classified intent: {intent.intent_type.value}, aggregation: {intent.aggregation.value}")

    return intent

