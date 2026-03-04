import sys
import pandas as pd
import numpy as np
from typing import Dict, Any

try:
    from app.services.analysis_execution.analysis_executor import execute_analysis
    print("✅ Successfully imported execute_analysis.")
except ImportError:
    print("⚠️ Import failed. Ensure you run this from the project root.")
    sys.exit(1)

def test_row_level_math():
    print("\n--- Testing Row-Level Metric Math ---")
    
    # Scenario: Calculate Weighted Revenue = Price * Qty
    # Row 1: 10 * 2 = 20
    # Row 2: 5 * 4 = 20
    # Sum = 40
    # If we did Sum(Price) * Sum(Qty) -> (15) * (6) = 90 (WRONG)
    
    df = pd.DataFrame({
        "price": [10, 5],
        "qty": [2, 4],
        "category": ["A", "A"]
    })
    
    spec = {
        "operation": "sum",
        "metric": "revenue", # New derived metric
        "metric_expression": "price * qty"
    }
    
    try:
        result = execute_analysis(df.copy(), spec)
        val = result.get("value")
        
        print(f"Result Value: {val}")
        
        if val == 40.0:
            print("✅ Row-Level Math Success: Calculated 40.0 (Correct)")
        else:
            print(f"❌ Row-Level Math Failed: Got {val}, expected 40.0")
            
        # Check Code Gen
        code = result.get("generated_code", "")
        if "df['revenue'] = price * qty" in code or "df['revenue'] = df.eval" in code: # implementation detail
             print("✅ Generated code contains math step")
        else:
             print(f"⚠️ Generated code might be missing math step: {code}")

    except Exception as e:
        print(f"❌ Execution failed: {e}")

def test_data_health_warning():
    print("\n--- Testing Data Health Warning (>2% NULLs) ---")
    
    # Scenario: 100 rows. 3 NULLs. 3% > 2% threshold. Should warn.
    data = {"sales": [100.0] * 97 + [None, None, None]} # 97 numbers, 3 NaNs
    df = pd.DataFrame(data)
    
    spec = {
        "operation": "sum",
        "metric": "sales"
    }
    
    result = execute_analysis(df, spec)
    warnings = result.get("health_warnings", [])
    
    print(f"Warnings: {warnings}")
    
    if any("3.0%" in w for w in warnings):
        print("✅ Data Health Warning Success: Detected 3.0% NULLs")
    else:
        print("❌ Data Health Warning Failed: Warning not found or pct incorrect")

def test_code_generation_authenticity():
    print("\n--- Testing Code Generation Authenticity ---")
    
    df = pd.DataFrame({"sales": [100, 200], "region": ["A", "B"]})
    
    spec = {
        "operation": "sum",
        "metric": "sales",
        "filters": [{"column": "region", "operator": "=", "value": "A"}]
    }
    
    result = execute_analysis(df, spec)
    code = result.get("generated_code", "")
    
    print(f"Generated Code:\n{code}")
    
    # Check for Filter
    if "df['region']" in code and "==" in code and "'a'" in code.lower():
         print("✅ Code Generation: Filter present")
    else:
         print("❌ Code Generation: Filter missing")
         
    # Check Aggregation
    if ".sum()" in code:
         print("✅ Code Generation: Aggregation present")
    else:
         print("❌ Code Generation: Aggregation missing")

if __name__ == "__main__":
    test_row_level_math()
    test_data_health_warning()
    test_code_generation_authenticity()
