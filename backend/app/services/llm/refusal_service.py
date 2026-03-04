from typing import List, Dict, Any, Optional
from app.core.logger import get_logger
from app.models.analysis_contract import AnalysisContract

logger = get_logger(__name__)

class RefusalService:
    """
    Service to handle refusal of vague prompts and suggest clearer alternatives.
    """
    
    def check_refusal(
        self, 
        query: str, 
        contract: AnalysisContract,
        intent_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if the query should be refused.
        
        Returns:
            Dict with refusal message and suggestions if refused, None otherwise.
        """
        query_lower = query.lower().strip()
        
        # 1. Vague "How is business" type queries
        vague_patterns = [
            "how is business", "how is the business", "how are we doing",
            "what's up", "status report", "tell me about data",
            "how is performance", "analyze data", "show insights"
        ]
        
        if any(p in query_lower for p in vague_patterns) and len(query.split()) < 5:
            return self._build_refusal_response(contract, "vague")

        # 2. Vague "Best/Worst" without dimension
        # e.g. "Who is the best?" (Best what? Sales? Profit?)
        ambiguous_patterns = [
            "who is the best", "who is the worst", "what is the best", "what is the worst",
            "top performing", "worst performing"
        ]
        
        if any(p in query_lower for p in ambiguous_patterns):
            # If the query is JUST "Who is the best" without specifying metric/dimension
            # heuristic: short query
            if len(query.split()) < 6:
                return self._build_refusal_response(contract, "ambiguous")
        
        return None

    def _build_refusal_response(self, contract: AnalysisContract, reason: str) -> Dict[str, Any]:
        """Build a structured refusal response with suggestions."""
        
        suggestions = self._generate_suggestions(contract)
        
        if reason == "vague":
            message = (
                "To give you the most accurate answer, could you be more specific? "
                "For example, you can ask about a specific metric or dimension."
            )
        elif reason == "ambiguous":
            message = (
                "I'm not sure which metric you'd like to use to define 'best' or 'worst'. "
                "Could you specify a metric like Sales, Profit, or Quantity?"
            )
        else:
            message = "I need a bit more detail to answer that."

        return {
            "refusal": True,
            "message": message,
            "suggestions": suggestions,
            "followup_questions": suggestions
        }

    def _generate_suggestions(self, contract: AnalysisContract) -> List[str]:
        """Generate smart suggestions based on the contract."""
        suggestions = []
        
        # safely access allowed_metrics/dimensions 
        metrics = []
        if contract.allowed_metrics:
             # handle both list and dict formats if legacy
             m_data = contract.allowed_metrics.get("metrics", [])
             if isinstance(m_data, list):
                 metrics = m_data
             elif isinstance(m_data, dict):
                 metrics = list(m_data.keys())

        dimensions = []
        if contract.allowed_dimensions:
             d_data = contract.allowed_dimensions.get("dimensions", [])
             if isinstance(d_data, list):
                 dimensions = d_data
             elif isinstance(d_data, dict):
                 dimensions = list(d_data.keys())
        
        # 1. Suggest top 2 metrics
        for m in metrics[:2]:
            friendly = m.replace("_", " ").title()
            suggestions.append(f"Show me Total {friendly}")
            
        # 2. Suggest top dimension breakdown
        if metrics and dimensions:
            m = metrics[0].replace("_", " ").title()
            d = dimensions[0].replace("_", " ").title()
            suggestions.append(f"Show {m} by {d}")
            
        # 3. Suggest trend if time valid
        # (Assuming 'date' or 'time' logic elsewhere, but generic fallback)
        if metrics:
             m = metrics[0].replace("_", " ").title()
             suggestions.append(f"{m} trend over time")
             
        # Fallbacks if contract is empty
        if not suggestions:
            suggestions = [
                "Show total sales",
                "Show sales by region",
                "Count of orders"
            ]
            
        return suggestions[:3]
