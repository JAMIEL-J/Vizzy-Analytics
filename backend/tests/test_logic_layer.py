import py_compile
import sys
import pandas as pd
from typing import Dict, Any

# Mocking the dependency structure
class MockAnalysisContract:
    def __init__(self, metrics: Dict[str, Any], dimensions: list):
        self.allowed_metrics = {"metrics": metrics}
        self.allowed_dimensions = {"dimensions": dimensions}

# Import the services to test
# We need to ensure the path is correct or mock the imports if running outside app context
# For this test script, we will mock the imports by defining the classes locally if they depend on app structure
# But since we want to test the ACTUAL files, we should assume the environment is set up or adjust python path.

try:
    from app.services.llm.refusal_service import RefusalService
    from app.services.llm.text_answer_generator import generate_text_answer
    from app.services.llm.intent_schema import AnalysisIntent, IntentType, Aggregation
    print("✅ Successfully imported services.")
except ImportError:
    # If imports fail due to path, we might be running this script directly without app context.
    # In a real scenario we'd use pytest. For now, let's assume this is run from root.
    print("⚠️ Import failed. Ensure you run this from the project root with 'python -m tests.test_logic_layer'")
    sys.exit(1)

def test_refusal_service():
    print("\n--- Testing Refusal Service ---")
    service = RefusalService()
    
    # Contract with defined metrics
    contract = MockAnalysisContract(
        metrics={"total_sales": {"name": "Total Sales", "expression": "price * qty"}}, 
        dimensions=["region"]
    )
    
    # Test 1: Vague Prompt
    vague_query = "how is business"
    result = service.check_refusal(vague_query, contract, "text_query")
    
    if result and result.get("refusal") is True:
        print("✅ Correctly refused 'how is business'")
        if "Total Sales" in str(result.get("suggestions")):
            print("✅ Suggestions include 'Total Sales'")
        else:
            print(f"❌ Suggestions failed: {result.get('suggestions')}")
    else:
        print(f"❌ Failed to refuse vague prompt: {result}")

    # Test 2: Valid Prompt
    valid_query = "total sales by region"
    result_valid = service.check_refusal(valid_query, contract, "analysis")
    
    if result_valid is None:
        print("✅ Correctly allowed specific prompt")
    else:
        print(f"❌ Incorrectly refused valid prompt: {result_valid}")

def test_methodology_exposure():
    print("\n--- Testing Methodology Exposure ---")
    
    # Setup data
    df = pd.DataFrame({"total_sales": [100, 200, 300], "region": ["A", "A", "B"]})
    
    # Intent
    intent = AnalysisIntent(
        intent_type=IntentType.TEXT_QUERY,
        aggregation=Aggregation.SUM,
        metric="total_sales",
        group_by=None
    )
    
    # Contract with formula
    contract = MockAnalysisContract(
        metrics={"total_sales": {"name": "Total Sales", "expression": "price * quantity"}},
        dimensions=["region"]
    )
    
    # Run Generation
    result = generate_text_answer(df, intent, "total sales", contract)
    
    # Check methodology
    methodology = result.get("methodology", [])
    print(f"Generated Methodology: {methodology}")
    
    found_formula = any("price * quantity" in step for step in methodology)
    found_agg = any("Summed values" in step for step in methodology)
    
    if found_formula:
        print("✅ Methodology correctly shows row-level formula")
    else:
        print("❌ Missing row-level formula in methodology")
        
    if found_agg:
        print("✅ Methodology correctly shows aggregation step")
    else:
        print("❌ Missing aggregation step in methodology")

if __name__ == "__main__":
    test_refusal_service()
    test_methodology_exposure()
