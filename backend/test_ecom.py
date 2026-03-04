import os
import pandas as pd
import glob
from app.services.analytics.domain_detector import detect_domain

csvs = glob.glob('data/uploads/**/*.csv', recursive=True)

for csv in csvs:
    try:
        df = pd.read_csv(csv, low_memory=False, nrows=10)
        domain, _ = detect_domain(df)
        if domain.value == 'sales' and ('ecommerce' in csv.lower() or 'e-commerce' in csv.lower() or 'ecom' in csv.lower() or 'retail' in csv.lower() or 'data' in csv.lower()):
            print(f"--- Data snippet for {csv} ---")
            print(df.head(2))
            
            # Find date columns
            from app.services.analytics.column_filter import filter_columns
            clf = filter_columns(df, domain)
            print("Date cols:", clf.dates)
            if clf.dates:
                for dc in clf.dates:
                    try:
                        dates = pd.to_datetime(pd.read_csv(csv, usecols=[dc])[dc], errors='coerce')
                        print(f"{dc} max date: {dates.max()}, min date: {dates.min()}")
                        print(dates.value_counts(dropna=False).head(5))
                    except:
                        pass
    except:
        pass
