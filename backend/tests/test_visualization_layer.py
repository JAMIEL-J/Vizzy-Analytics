import sys
from typing import Dict, Any

try:
    from app.services.visualization.chart_specs import build_chart_spec, ChartType
    print("✅ Successfully imported build_chart_spec.")
except ImportError:
    print("⚠️ Import failed. Ensure you run this from the project root.")
    sys.exit(1)

def test_top_n_plus_others():
    print("\n--- Testing Top 10 + Others Logic ---")
    
    # 1. Create dataset with 15 categories (A..O)
    rows = []
    for i in range(15):
        char = chr(65 + i) # A, B, C...
        val = (i + 1) * 10 # 10, 20, 30...
        rows.append({"category": char, "value": val})
        
    # Validation: 
    # Max value is O (150). Min is A (10).
    # Since we enforce DESC sort, O should be first.
    # Top 10 should be O..F (150..60).
    # Others should be E..A (50+40+30+20+10 = 150).
    
    data = {"rows": rows}
    spec = build_chart_spec(chart_type=ChartType.BAR, title="Test Bar", data=data)
    
    # Check X-axis length (Elements)
    x_axis = spec.get("x", [])
    y_axis = spec.get("y", [])
    
    print(f"Chart Items: {len(x_axis)}")
    print(f"Categories: {x_axis}")
    print(f"Values: {y_axis}")
    
    # 1. Check Count (should be 11: 10 + Others)
    if len(x_axis) == 11:
        print("✅ Aggregation correct: 11 items (10 + Others)")
    else:
        print(f"❌ Aggregation Failed: Got {len(x_axis)} items")
        
    # 2. Check Sorting (First item should be max value 'O' -> 150)
    if x_axis[0] == "O" and y_axis[0] == 150:
        print("✅ Sorting correct: Highest value first")
    else:
        print(f"❌ Sorting Failed: First item is {x_axis[0]} ({y_axis[0]})")
        
    # 3. Check "Others" Value
    if x_axis[-1] == "Others":
        if y_axis[-1] == 150: # Sum of 10+20+30+40+50
            print("✅ 'Others' Calculation correct (150)")
        else:
            print(f"❌ 'Others' Calculation Failed: Got {y_axis[-1]}, expected 150")
    else:
        print("❌ 'Others' item missing at end")

    # 4. Check Smart Drill-Down Metadata
    chart_data = spec.get("data", [])
    others_row = chart_data[-1]
    
    if others_row.get(list(others_row.keys())[0]) == "Others": # dynamic key check or assume category
         drill_filter = others_row.get("_drill_down_filter")
         if drill_filter:
             print(f"Drill Filter: {drill_filter}")
             if drill_filter["operator"] == "NOT IN":
                 print("✅ Drill-down Metadata correct (Operator: NOT IN)")
                 if len(drill_filter["value"]) == 10:
                      print("✅ Drill-down Exclusion list length correct (10)")
                 else:
                      print(f"❌ Drill-down Exclusion list length wrong: {len(drill_filter['value'])}")
             else:
                 print(f"❌ Drill-down Operator wrong: {drill_filter['operator']}")
         else:
             print("❌ Drill-down filter missing")

if __name__ == "__main__":
    test_top_n_plus_others()
