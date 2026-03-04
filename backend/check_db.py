import sqlite3
import os

db_path = "backend/data/vizzy.db"
if not os.path.exists(db_path):
    print(f"Error: DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Datasets ---")
    cursor.execute("SELECT id, name FROM datasets")
    for row in cursor.fetchall():
        print(f"Dataset: {row[1]} (ID: {row[0]})")
        
    print("\n--- Latest Versions ---")
    cursor.execute("SELECT dataset_id, version_number, source_reference FROM dataset_versions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5")
    for row in cursor.fetchall():
        print(f"Dataset ID: {row[0]} | Ver: {row[1]} | Path: {row[2]}")
        
    conn.close()
