"""
Response formatter module.

Belongs to: LLM services layer
Responsibility: Format analysis results into user-friendly responses
Restrictions: Pure formatting, no LLM calls
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


def format_analysis_response(
    query: str,
    chart_spec: Dict[str, Any],
    explanation: Dict[str, Any],
    intent_type: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format complete analysis response for the frontend.
    
    Args:
        query: Original user question
        chart_spec: Chart specification from visualization
        explanation: Generated explanation from chart_explainer
        intent_type: "analysis" or "dashboard"
        context: Optional session context
        
    Returns:
        {
            "message": "Natural language summary",
            "chart": {chart_spec},
            "explanation": {...},
            "followup_suggestions": [...],
            "metadata": {...}
        }
    """
    # Build natural language message
    summary = explanation.get("summary", "")
    detailed = explanation.get("explanation", "")
    
    # Combine summary and detailed insights for a richer chat response
    message = _build_response_message(
        query=query,
        chart_type=chart_spec.get("type", "chart"),
        summary=summary,
    )
    
    if detailed and detailed != summary:
        message = f"{message}\n\n{detailed}"
    
    if explanation.get("key_insight"):
        message = f"{message}\n\n**Key Insight:** {explanation['key_insight']}"
    
    # Get follow-up suggestions
    followups = explanation.get("followup_questions", [])
    if not followups:
        followups = _generate_default_followups(chart_spec.get("type", ""))
    
    return {
        "message": message,
        "chart": chart_spec,
        "explanation": {
            "summary": explanation.get("summary", ""),
            "detailed": explanation.get("explanation", ""),
            "key_insight": explanation.get("key_insight", ""),
        },
        "followup_suggestions": followups[:3],  # Limit to 3 suggestions
        "metadata": {
            "query": query,
            "intent_type": intent_type,
            "chart_type": chart_spec.get("type", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


def format_dashboard_response(
    query: str,
    dashboard_spec: Dict[str, Any],
    widget_count: int,
) -> Dict[str, Any]:
    """
    Format dashboard response for the frontend.
    
    Args:
        query: Original user question
        dashboard_spec: Dashboard specification with widgets
        widget_count: Number of widgets generated
        
    Returns:
        Formatted dashboard response
    """
    message = (
        f"I've created a dashboard with {widget_count} visualizations "
        f"to give you a comprehensive overview of your data."
    )
    
    return {
        "message": message,
        "dashboard": dashboard_spec,
        "explanation": {
            "summary": f"Dashboard with {widget_count} widgets",
            "detailed": "This dashboard provides an overview of your dataset with key metrics and visualizations.",
            "key_insight": "Use the individual charts to explore different aspects of your data.",
        },
        "followup_suggestions": [
            "Can you show me more details on any specific metric?",
            "What trends do you see in this data?",
            "Which areas need attention?",
        ],
        "metadata": {
            "query": query,
            "intent_type": "dashboard",
            "widget_count": widget_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


def format_error_response(
    query: str,
    error_message: str,
    suggestions: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Format error response for the frontend.
    """
    return {
        "message": f"I couldn't complete your request: {error_message}",
        "error": True,
        "error_details": error_message,
        "followup_suggestions": suggestions or [
            "Could you rephrase your question?",
            "Try asking about a specific metric or column.",
            "Ask 'What data is available?' to see your options.",
        ],
        "metadata": {
            "query": query,
            "intent_type": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


def format_text_response(
    query: str,
    answer: str,
    data_summary: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format text-only response (no chart) for the frontend.
    
    Used when user asks simple questions like:
    - "What is total sales?"
    - "How many customers?"
    - "Summarize the data"
    
    Args:
        query: Original user question
        answer: Text answer to the question
        data_summary: Optional data details (e.g., {value: 1000, column: "sales"})
        context: Optional session context
        
    Returns:
        {
            "message": "Answer text",
            "response_type": "text",
            "data": {optional data details},
            "followup_suggestions": [...],
            "metadata": {...}
        }
    """
    # Build follow-up suggestions
    followups = _generate_text_followups(query, data_summary)
    
    response = {
        "message": answer,
        "response_type": "text",
        "chart": None,  # Explicitly no chart
        "followup_suggestions": followups[:3],
        "metadata": {
            "query": query,
            "intent_type": "text_query",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
    
    # Add data details if provided
    if data_summary:
        # Enrich data summary with display properties
        formatted_data = data_summary.copy()
        formatted_data["type"] = "kpi"
        
        # logical label based on aggregation and column
        if "label" not in formatted_data:
            col = (formatted_data.get("column") or "").replace("_", " ").title()
            agg = formatted_data.get("aggregation", "").lower()
            
            # Map aggregation to natural language
            agg_map = {
                "sum": "Total",
                "avg": "Average",
                "mean": "Average",
                "count": "Total",
                "min": "Minimum",
                "max": "Maximum",
            }
            
            prefix = agg_map.get(agg, agg.title())
            formatted_data["label"] = f"{prefix} {col}"
            
        response["data"] = formatted_data
    
    return response


def _generate_text_followups(
    query: str,
    data_summary: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """Generate follow-up suggestions for text responses."""
    query_lower = query.lower()
    
    # Context-aware suggestions
    if "total" in query_lower or "sum" in query_lower:
        return [
            "Show me this as a chart",
            "Break this down by category",
            "How does this compare to last period?",
        ]
    elif "count" in query_lower or "how many" in query_lower:
        return [
            "Visualize this distribution",
            "Show me the breakdown",
            "What's the trend over time?",
        ]
    elif "average" in query_lower or "mean" in query_lower:
        return [
            "Show me the distribution",
            "What are the outliers?",
            "Compare averages by group",
        ]
    elif "describe" in query_lower or "summarize" in query_lower:
        return [
            "Show me an overview dashboard",
            "What are the key insights?",
            "Visualize the top metrics",
        ]
    
    # Default suggestions
    return [
        "Show me this visually",
        "Create a chart for this",
        "Give me more details",
    ]



def _build_response_message(
    query: str,
    chart_type: str,
    summary: str,
) -> str:
    """Build the main response message."""
    
    if summary:
        return summary
    
    # Fallback messages by chart type
    messages = {
        "bar": "Here's a breakdown of your data by category.",
        "line": "Here's how your data changes over time.",
        "pie": "Here's the distribution across different categories.",
        "kpi": "Here's the metric you asked about.",
        "table": "Here's the data in table format.",
        "scatter": "Here's the correlation between your selected variables.",
        "heatmap": "Here's the comparison matrix.",
        "area": "Here's the cumulative trend over time.",
    }
    
    return messages.get(chart_type, "Here's what I found in your data.")


def _generate_default_followups(chart_type: str) -> List[str]:
    """Generate default follow-up suggestions based on chart type."""
    
    followups = {
        "bar": [
            "Which category performs best?",
            "Can you compare the top 3?",
            "Show me this over time.",
        ],
        "line": [
            "What's the overall trend?",
            "Are there any anomalies?",
            "Break this down by category.",
        ],
        "pie": [
            "Which segment is growing fastest?",
            "Show me historical changes.",
            "What drives the largest segment?",
        ],
        "kpi": [
            "How has this changed over time?",
            "What factors affect this metric?",
            "Compare this to last period.",
        ],
        "table": [
            "Visualize this as a chart.",
            "Filter to show only the top items.",
            "What patterns do you see?",
        ],
    }
    
    return followups.get(chart_type, [
        "Tell me more about this data.",
        "What insights can you find?",
        "Break this down differently.",
    ])


def format_message_for_storage(
    role: str,
    content: str,
    chart_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format a message for storage in chat history.
    
    Args:
        role: "user" or "assistant"
        content: Message text
        chart_data: Optional chart data for assistant messages
        
    Returns:
        Formatted message dict for storage
    """
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    if chart_data:
        message["chart"] = chart_data
    
    return message
