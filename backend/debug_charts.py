import sqlite3
import pandas as pd
from app.services.visualization.dashboard_generator import generate_overview_dashboard

conn = sqlite3.connect('data/vizzy.db')
cursor = conn.cursor()
cursor.execute('SELECT id FROM datasets ORDER BY created_at DESC LIMIT 1')
res = cursor.fetchone()
if not res:
    print("No datasets")
    exit()
ds_id = res[0]
path = f"data/uploads/{ds_id}/clean.parquet"
try:
    df = pd.read_parquet(path)
except Exception as e:
    path = f"data/uploads/{ds_id}/raw.csv"
    df = pd.read_csv(path)

print("Dataset ID:", ds_id)
print("Columns:", df.columns.tolist())
try:
    # Look at the signature of generate_overview_dashboard
    dashboard = generate_overview_dashboard(df, "generic_user")
    print("Domain:", dashboard.get('domain', 'Unknown'))
    print("Charts generated:", len(dashboard['charts']))
    for k, v in dashboard['charts'].items():
        print("  -", k, v.get('title'), v.get('type'))
except Exception as e:
    import traceback
    traceback.print_exc()
