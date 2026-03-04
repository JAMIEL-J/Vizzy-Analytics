"""
Business Questions Framework - Defines domain-specific business questions.

Maps business questions to their associated KPIs and chart recommendations.
This drives the dashboard to answer real business problems rather than
just displaying automated charts.
"""

from enum import Enum
from typing import Dict, List, Any
from dataclasses import dataclass, field


@dataclass
class BusinessQuestion:
    """Represents a business question with its analytics components."""
    key: str
    display_name: str
    description: str
    priority: int  # 1 = highest priority
    kpi_keys: List[str] = field(default_factory=list)
    chart_types: List[str] = field(default_factory=list)
    relevant_columns: List[str] = field(default_factory=list)


# =============================================================================
# CHURN DOMAIN - Business Questions
# =============================================================================

CHURN_QUESTIONS: Dict[str, BusinessQuestion] = {
    "churn_overview": BusinessQuestion(
        key="churn_overview",
        display_name="What's our churn situation?",
        description="Overall churn rate and customer status",
        priority=1,
        kpi_keys=["churn_rate", "total_customers", "churned_count"],
        chart_types=["donut"],
        relevant_columns=["churn", "status"]
    ),
    "who_is_leaving": BusinessQuestion(
        key="who_is_leaving",
        display_name="Who is leaving?",
        description="Customer segments with highest churn risk",
        priority=2,
        kpi_keys=["tenure_at_churn", "high_risk_contract_pct"],
        chart_types=["hbar", "donut"],
        relevant_columns=["contract", "tenure", "seniorcitizen", "gender", "partner", "dependents"]
    ),
    "why_leaving": BusinessQuestion(
        key="why_leaving",
        display_name="Why are they leaving?",
        description="Service and payment factors driving churn",
        priority=3,
        kpi_keys=["avg_monthly_churned", "service_churn_rate"],
        chart_types=["hbar", "bar"],
        relevant_columns=["internetservice", "phoneservice", "paymentmethod", "paperlessbilling",
                         "onlinesecurity", "techsupport", "streamingmovies", "streamingtv"]
    ),
    "financial_impact": BusinessQuestion(
        key="financial_impact",
        display_name="What's the financial impact?",
        description="Revenue and customer lifetime value analysis",
        priority=4,
        kpi_keys=["revenue_at_risk", "clv_churned", "clv_retained"],
        chart_types=["bar", "treemap"],
        relevant_columns=["monthlycharges", "totalcharges", "tenure"]
    ),
    "when_leaving": BusinessQuestion(
        key="when_leaving",
        display_name="When do they leave?",
        description="Tenure patterns and contract renewal risks",
        priority=5,
        kpi_keys=["tenure_at_churn"],
        chart_types=["bar", "hbar"],
        relevant_columns=["tenure", "contract"]
    )
}


# =============================================================================
# SALES DOMAIN - Business Questions  
# =============================================================================

SALES_QUESTIONS: Dict[str, BusinessQuestion] = {
    "sales_overview": BusinessQuestion(
        key="sales_overview",
        display_name="How are we performing?",
        description="Overall sales and revenue metrics",
        priority=1,
        kpi_keys=["total_revenue", "total_orders", "aov"],
        chart_types=["bar", "line"],
        relevant_columns=["sales", "revenue", "amount", "order"]
    ),
    "top_performers": BusinessQuestion(
        key="top_performers",
        display_name="What's selling best?",
        description="Top products and categories by revenue",
        priority=2,
        kpi_keys=["best_seller", "total_products"],
        chart_types=["hbar", "treemap"],
        relevant_columns=["product", "category", "subcategory"]
    ),
    "profitability": BusinessQuestion(
        key="profitability",
        display_name="Where's the profit?",
        description="Profit margins and profitability analysis",
        priority=3,
        kpi_keys=["profit_margin", "total_profit"],
        chart_types=["bar", "hbar"],
        relevant_columns=["profit", "margin", "cost"]
    ),
    "regional_performance": BusinessQuestion(
        key="regional_performance",
        display_name="How are regions performing?",
        description="Geographic sales distribution",
        priority=4,
        kpi_keys=["top_region"],
        chart_types=["treemap", "bar"],
        relevant_columns=["region", "state", "city", "country"]
    )
}


# =============================================================================
# Helper Functions
# =============================================================================

def get_business_questions(domain: str) -> Dict[str, BusinessQuestion]:
    """Get business questions for a specific domain."""
    questions_map = {
        "churn": CHURN_QUESTIONS,
        "sales": SALES_QUESTIONS,
    }
    return questions_map.get(domain.lower(), {})


def get_prioritized_questions(domain: str) -> List[BusinessQuestion]:
    """Get business questions sorted by priority."""
    questions = get_business_questions(domain)
    return sorted(questions.values(), key=lambda q: q.priority)


def get_question_for_chart(domain: str, column: str) -> str:
    """Get the business question that a chart answers based on column."""
    questions = get_business_questions(domain)
    col_lower = column.lower().replace("_", "")
    
    for q in questions.values():
        for rel_col in q.relevant_columns:
            if rel_col.lower().replace("_", "") in col_lower or col_lower in rel_col.lower():
                return q.display_name
    
    return ""


# =============================================================================
# Smart Chart Title Generator
# =============================================================================

BUSINESS_FRIENDLY_TITLES = {
    # Churn domain
    "churn_by_contract": "Contract Types Driving Churn",
    "churn_by_internetservice": "Internet Service Impact on Churn", 
    "churn_by_paymentmethod": "Payment Methods & Churn Risk",
    "churn_by_tenure": "Customer Tenure & Churn Patterns",
    "churn_by_gender": "Churn by Demographics",
    "churn_by_seniorcitizen": "Senior Citizens Churn Analysis",
    "churn_by_phoneservice": "Phone Service Churn Impact",
    "churn_by_partner": "Partner Status & Churn",
    "churn_by_dependents": "Dependents Impact on Retention",
    "churn_by_onlinesecurity": "Online Security Service Effect",
    "churn_by_techsupport": "Tech Support & Customer Retention",
    "churn_by_streamingtv": "Streaming TV Service Correlation",
    "churn_by_streamingmovies": "Streaming Movies Effect",
    "churn_by_paperlessbilling": "Paperless Billing Churn Risk",
    
    # Revenue charts
    "totalcharges_by_contract": "Revenue by Contract Type",
    "monthlycharges_by_contract": "Monthly Revenue by Segment",
    "tenure_by_contract": "Customer Tenure by Contract",
    
    # Distribution charts
    "contract_distribution": "Customer Contract Distribution",
    "internetservice_distribution": "Internet Service Breakdown",
    "paymentmethod_distribution": "Payment Method Distribution",
}


def get_smart_chart_title(chart_key: str, default_title: str) -> str:
    """Get a business-friendly chart title."""
    key_lower = chart_key.lower().replace(" ", "_").replace("-", "_")
    
    # Check direct match
    if key_lower in BUSINESS_FRIENDLY_TITLES:
        return BUSINESS_FRIENDLY_TITLES[key_lower]
    
    # Check partial match
    for pattern, title in BUSINESS_FRIENDLY_TITLES.items():
        if pattern in key_lower or key_lower in pattern:
            return title
    
    return default_title


# =============================================================================
# Tenure Grouping for Analysis
# =============================================================================

def get_tenure_group(tenure_months: int) -> str:
    """Categorize customer tenure into business-meaningful groups."""
    if tenure_months <= 12:
        return "New (0-12 mo)"
    elif tenure_months <= 24:
        return "Growing (1-2 yr)"
    elif tenure_months <= 48:
        return "Established (2-4 yr)"
    else:
        return "Loyal (4+ yr)"


def get_tenure_group_order() -> List[str]:
    """Get the correct order for tenure groups."""
    return ["New (0-12 mo)", "Growing (1-2 yr)", "Established (2-4 yr)", "Loyal (4+ yr)"]
