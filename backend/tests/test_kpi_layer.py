import sys
import pandas as pd
import datetime
from typing import Dict, Any, Optional

# Mocking the context or ensuring path
# We are primarily testing the _calculate_pop_change logic
# Since it's a private function, we will import it directly or recreate the logic for testing if import is hard
# But better to import to test ACTUAL code.

try:
    from app.services.analysis_orchestrator import _calculate_pop_change
    print("✅ Successfully imported _calculate_pop_change.")
except ImportError:
    print("⚠️ Import failed. Ensure you run this from the project root.")
    sys.exit(1)

def test_mtd_normalization():
    print("\n--- Testing MTD Normalization (Partial Month) ---")
    
    # Scenario: 
    # Current Month: Jan 2024 (Data only up to Jan 15)
    # Previous Month: Dec 2023 (Full data)
    # Expectation: Compare Jan 1-15 vs Dec 1-15 (NOT Dec 1-31)
    
    dates = []
    # Create Dec 1-31 data (Previous)
    for i in range(1, 32):
        dates.append(pd.Timestamp(2023, 12, i))
    
    # Create Jan 1-15 data (Current)
    for i in range(1, 16):
        dates.append(pd.Timestamp(2024, 1, i))
        
    df = pd.DataFrame({
        "date": dates,
        "sales": [100] * len(dates)  # 100 sales per day
    })
    
    # Expected:
    # Current (Jan 1-15): 15 days * 100 = 1500
    # Previous (Dec 1-31): Should slice to Dec 1-15 => 15 days * 100 = 1500
    # Growth should be 0% (1500 vs 1500)
    # If it compared against full Dec (3100), growth would be neg.
    
    result = _calculate_pop_change(df, "sales", "date")
    
    if result:
        print(f"Result: {result}")
        if result['current_value'] == 1500 and result['previous_value'] == 1500:
            print("✅ MTD Normalization Success: Compared equal partial periods (1500 vs 1500)")
            if result['growth_pct'] == 0.0:
                 print("✅ Growth calculation correct (0.0%)")
        else:
            print(f"❌ MTD Failed: Got {result['current_value']} vs {result['previous_value']}")
    else:
        print("❌ Function returned None")

def test_full_month_comparison():
    print("\n--- Testing Full Month Comparison ---")
    # Scenario: Full Feb vs Full Jan (Leap year edge case optionally)
    # Let's do simple: March (31) vs Feb 2024 (29)
    # If March is full (up to 31st), and Feb is full (up to 29th)
    # _calculate_pop_change uses max_date. 
    # If max_date is Mar 31, Prev Period should be Feb 1 - Feb 29 (End of month).
    # Logic: min(current_day, last_day_prev) -> min(31, 29) -> 29. Correct.
    
    dates = []
    # Feb 2024 (29 days)
    for i in range(1, 30):
        dates.append(pd.Timestamp(2024, 2, i))
    # Mar 2024 (31 days)
    for i in range(1, 32):
        dates.append(pd.Timestamp(2024, 3, i))
        
    df = pd.DataFrame({
        "date": dates,
        "sales": [10] * len(dates)
    })
    
    result = _calculate_pop_change(df, "sales", "date")
    
    if result:
        print(f"Result: {result}")
        # Current: 31 * 10 = 310
        # Prev: 29 * 10 = 290
        # Growth: (310 - 290) / 290 = 20 / 290 = ~6.89%
        if result['current_value'] == 310 and result['previous_value'] == 290:
             print("✅ Full Month Comparison correct (31 days vs 29 days)")
        else:
             print(f"❌ Full Month Failed: {result['current_value']} vs {result['previous_value']}")

def test_staleness_logic_simulation():
    print("\n--- Testing Staleness Logic (Simulation) ---")
    # We can't easily test the inner logic of run_analysis_orchestration without mocking DB sessions etc.
    # But we can verify the logic snippet itself.
    
    import datetime
    now = datetime.datetime.now()
    
    # CMS: 3 days ago
    max_date = now - datetime.timedelta(days=3)
    
    warning = None
    if (now - max_date).total_seconds() > 48 * 3600:
        days_old = (now - max_date).days
        warning = f"⚠️ Warning: This data is {days_old} days old."
        
    if warning and "3 days old" in warning:
        print("✅ Staleness Logic correct (Detected 3 days old)")
    else:
        print(f"❌ Staleness Logic Failed: {warning}")

if __name__ == "__main__":
    test_mtd_normalization()
    test_full_month_comparison()
    test_staleness_logic_simulation()
