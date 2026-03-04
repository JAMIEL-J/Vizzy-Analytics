import pandas as pd
import numpy as np
import json
import traceback
import sys
from app.services.analytics import column_filter
from app.services.analytics.chart_recommender import recommend_charts
from app.services.analytics.domain_detector import DomainType

data = {
    'customerID': [f'C{i}' for i in range(100)],
    'gender': np.random.choice(['Male', 'Female'], 100).tolist(),
    'SeniorCitizen': np.random.choice([0, 1], 100).tolist(),
    'tenure': np.random.randint(1, 72, 100).tolist(),
    'Contract': np.random.choice(['Month-to-month', 'One year', 'Two year'], 100).tolist(),
    'PaymentMethod': np.random.choice(['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'], 100).tolist(),
    'MonthlyCharges': (np.random.rand(100) * 100).tolist(),
    'TotalCharges': (np.random.rand(100) * 5000).tolist(),
    'Churn': np.random.choice(['Yes', 'No'], 100).tolist()
}
df = pd.DataFrame(data)

try:
    c = column_filter.filter_columns(df, DomainType.CHURN)
    print("Metrics:", c.metrics)
    print("Dimensions:", c.dimensions)
    print("Targets:", c.targets)
    charts = recommend_charts(df, DomainType.CHURN, c)

    with open("test_churn_result.json", "w") as f:
        json.dump({
            "Charts": [{"title": v['title'], "type": v['type']} for k, v in charts.items()]
        }, f, indent=2)
    print(f"Success. Generated {len(charts)} charts.")
except Exception as e:
    traceback.print_exc()
