"""
Domain Detector - Identifies dataset domain based on column patterns.

Scans column names to detect: Sales, Churn, Marketing, Finance, Healthcare, Generic
"""

from enum import Enum
from typing import List, Dict, Tuple
import logging
import pandas as pd

logger = logging.getLogger(__name__)


class DomainType(str, Enum):
    SALES = "sales"
    CHURN = "churn"
    MARKETING = "marketing"
    FINANCE = "finance"
    HEALTHCARE = "healthcare"
    GENERIC = "generic"


# Domain keyword patterns with weights (Universal Data Engine Strategy)
# Score 5: Primary Keywords (High Intent)
# Score 3: Secondary Aliases (Supportive Intent)
DOMAIN_KEYWORDS: Dict[DomainType, Dict[str, Dict[str, int]]] = {
    DomainType.HEALTHCARE: {
        "primary": {
            "patient": 5, "diagnosis": 5, "treatment": 5, "mortality": 5,
            "admission": 5, "readmission": 5, "discharge": 5, "los": 5,
            "length_of_stay": 5, "clinical": 5, "physician": 5, "hospital": 5
        },
        "secondary": {
            "drg": 3, "icd": 3, "incidence": 3, "prevalence": 3,
            "vital": 3, "outcome": 3, "medication": 3, "blood": 3,
            "victim": 3, "deceased": 3, "died": 3
        }
    },
    DomainType.SALES: {
        "primary": {
            "revenue": 5, "sales": 5, "profit": 5, "order": 5,
            "product": 5, "price": 5, "gmv": 5, "totalsales": 5
        },
        "secondary": {
            "sku": 3, "quantity": 3, "discount": 3, "customer": 3,
            "store": 3, "item": 3, "shipping": 3, "proceeds": 3, "gross": 3, "net": 3
        }
    },
    DomainType.CHURN: {
        "primary": {
            "churn": 15, "exited": 15, "attrition": 15, "tenure": 5, 
            "contract": 5, "subscription": 5, "cancel": 5, "retained": 5,
            "retention": 5
        },
        "secondary": {
            "status": 3, "charges": 3, "monthly": 3, "mrr": 3,
            "billing": 3, "vintage": 3, "exit": 3, "left": 3,
            "complain": 3, "satisfaction": 3, "nps": 3, "loyalty": 3,
            "ticket": 3, "support": 3, "incident": 3, "call": 3
        }
    },
    DomainType.MARKETING: {
        "primary": {
            "ctr": 5, "campaign": 5, "click": 5, "impression": 5,
            "conversion": 5, "roas": 5, "spend": 5
        },
        "secondary": {
            "lead": 3, "roi": 3, "channel": 3, "bounce": 3,
            "creative": 3, "source": 3, "medium": 3, "adgroup": 3,
            "outlay": 3, "investment": 3
        }
    },
    DomainType.FINANCE: {
        "primary": {
            "income": 5, "expense": 5, "balance": 5, "budget": 5,
            "asset": 5, "liability": 5, "equity": 5, "salary": 5,
            "credit": 5, "loan": 5
        },
        "secondary": {
            "roi": 3, "transaction": 3, "margin": 3, "cash": 3,
            "forecast": 3, "payment": 3, "invoice": 3, "allocation": 3,
            "projection": 3, "planned": 3, "card": 3, "dividend": 3,
            "interest": 3, "rate": 3
        }
    }
}


def _calculate_domain_score(columns: List[str], domain: DomainType) -> int:
    """Calculate score for a domain based on hierarchical keyword matches."""
    score = 0
    domain_data = DOMAIN_KEYWORDS.get(domain, {})
    if not domain_data:
        return 0
        
    primary_kws = domain_data.get("primary", {})
    secondary_kws = domain_data.get("secondary", {})
    
    for col in columns:
        col_lower = col.lower().replace("_", " ").replace("-", " ")
        # Match primary keywords (Score 5)
        for keyword, weight in primary_kws.items():
            if keyword in col_lower:
                score += weight
        
        # Match secondary keywords (Score 3)
        for keyword, weight in secondary_kws.items():
            if keyword in col_lower:
                score += weight
    
    return score


def detect_domain(df: pd.DataFrame) -> Tuple[DomainType, Dict[str, int]]:
    """
    Detect the domain of a dataset using vocabulary density analysis.
    
    Returns:
        Tuple of (detected_domain, scores_dict)
    
    Enforces a confidence threshold based on total match frequency relative 
    to column count (Density Scoring).
    """
    columns = df.columns.tolist()
    column_count = len(columns)
    
    scores = {}
    for domain in DomainType:
        if domain != DomainType.GENERIC:
            scores[domain.value] = _calculate_domain_score(columns, domain)
    
    # Find highest scoring domain
    max_domain = DomainType.GENERIC
    max_score = 0
    
    for domain_str, score in scores.items():
        if score > max_score:
            max_score = score
            max_domain = DomainType(domain_str)
    
    # Phase I: Vocabulary Density Check
    # A domain is valid if its aggregate score relative to the theoretical max
    # or its absolute threshold is met.
    
    # Require minimum absolute threshold (Phase I Safety)
    MIN_THRESHOLD = 5 # Lowered because weights are smaller (5/3 instead of 10/12)
    if max_score < MIN_THRESHOLD:
        return DomainType.GENERIC, scores

    # Density Check: Normalize by theoretical max for that domain
    domain_data = DOMAIN_KEYWORDS.get(max_domain, {})
    # Sum of all available weights for the domain
    theoretical_max = sum(domain_data.get("primary", {}).values()) + \
                      sum(domain_data.get("secondary", {}).values())
    
    normalized_confidence = max_score / theoretical_max if theoretical_max > 0 else 0
    CONFIDENCE_FLOOR = 0.2 # Density floor - lower because we rarely match ALL keywords

    if normalized_confidence < CONFIDENCE_FLOOR:
        logger.info(
            f"Domain '{max_domain.value}' rejected: density {normalized_confidence:.2f} < {CONFIDENCE_FLOOR}. "
            f"Falling back to GENERIC."
        )
        max_domain = DomainType.GENERIC
    
    return max_domain, scores


def get_domain_confidence(scores: Dict[str, int]) -> str:
    """Get confidence level based on score distribution."""
    values = list(scores.values())
    if not values:
        return "LOW"
    
    max_score = max(values)
    second_max = sorted(values, reverse=True)[1] if len(values) > 1 else 0
    
    if max_score >= 30 and max_score > second_max * 2:
        return "HIGH"
    elif max_score >= 20:
        return "MEDIUM"
    return "LOW"
