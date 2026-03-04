import pandas as pd
import numpy as np
from app.services.analysis_execution.analysis_executor import execute_analysis

def test_debug_health():
    print("Debugging Data Health Check...")
    
    # Recreate the exact scenario
    df = pd.DataFrame({
        "price": np.random.uniform(10, 100, size=1000),
        "qty": np.random.randint(1, 5, size=1000),
        "category": ["A"] * 1000
    })
    
    # 31 NaNs
    df.loc[:30, "price"] = np.nan
    
    print(f"Price NaNs: {df['price'].isnull().sum()}")
    
    spec = {
        "operation": "sum",
        "metric": "revenue",
        "metric_expression": "price * qty",
        "group_by": ["category"]
    }
    
    result = execute_analysis(df.copy(), spec)
    
    print(f"Result Keys: {result.keys()}")
    print(f"Warnings: {result.get('health_warnings')}")
    
    # Check if calculation happened correctly
    # If price is nan, revenue should be nan
    calc_df = df.copy()
    calc_df['revenue'] = calc_df.eval("price * qty")
    print(f"Manual Revenue NaNs: {calc_df['revenue'].isnull().sum()}")

if __name__ == "__main__":
    test_debug_health()
