import asyncio
import json
import pandas as pd
from app.services.analytics.db_engine import DBEngine
from app.services.analytics.executor import Executor

async def test_engine():
    print("Testing DBEngine and Executor...")
    df = pd.DataFrame({
        "date": ["2024-01-01", "2024-01-02", "2024-01-03"],
        "sales": [100, 200, 150],
        "region": ["West", "East", "West"]
    })
    
    db = DBEngine()
    db.load_dataframe("data", df)
    
    executor = Executor()
    result = await executor.run_query("Show me total sales by region", db)
    
    print("\nResult Success:", result.get("success"))
    if result.get("success"):
        print("SQL:", result.get("sql"))
        print("Data:", result.get("data"))
        print("Chart Type:", result.get("chart_type"))
    else:
        print("Error:", result.get("error"))

if __name__ == "__main__":
    asyncio.run(test_engine())
