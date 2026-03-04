from typing import Optional
from pydantic import BaseModel

class MetricDefinition(BaseModel):
    """
    Definition of a metric including its calculation logic.
    
    Used to define row-level math formulas before aggregation.
    Example: 
        name="Sales"
        expression="price * quantity" (Row level)
        aggregation="sum" (Aggregation level)
    """
    name: str
    description: Optional[str] = None
    expression: Optional[str] = None  # Row-level formula, e.g., "price * quantity"
    aggregation: str = "sum"  # sum, avg, count, min, max
    format: str = "number"  # number, currency, percent
    column: Optional[str] = None  # Direct column mapping (if no expression)
