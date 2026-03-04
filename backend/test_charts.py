import pandas as pd
import json
import numpy as np

data = {
    'Country or territory name': ['USA', 'UK', 'France', 'Germany', 'Italy', 'Spain', 'Canada', 'Mexico', 'Brazil', 'Argentina'],
    'ISO 2-character country/territory code': ['US', 'GB', 'FR', 'DE', 'IT', 'ES', 'CA', 'MX', 'BR', 'AR'],
    'ISO 3-character country/territory code': ['USA', 'GBR', 'FRA', 'DEU', 'ITA', 'ESP', 'CAN', 'MEX', 'BRA', 'ARG'],
    'region': ['North America', 'Europe', 'Europe', 'Europe', 'Europe', 'Europe', 'North America', 'North America', 'South America', 'South America'],
    'year': [2020]*10,
    'estimated total population number': np.random.randint(10000000, 300000000, 10).tolist(),
    'Estimated prevalence of TB (all forms) per 100 000 population': (np.random.rand(10) * 10).tolist()
}
df = pd.DataFrame(data)

from app.services.analytics import column_filter
from app.services.analytics.chart_recommender import recommend_charts
import traceback

try:
    domain = column_filter.DomainType.GENERIC
    c = column_filter.filter_columns(df, domain)
    charts = recommend_charts(df, domain, c)

    with open("test_charts_result.json", "w") as f:
        json.dump({
            "Charts": [{"title": v['title'], "type": v['type']} for k, v in charts.items()]
        }, f, indent=2)
    print("Success. Wrote to test_charts_result.json")
except Exception as e:
    traceback.print_exc()
