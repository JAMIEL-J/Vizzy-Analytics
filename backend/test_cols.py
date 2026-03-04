import pandas as pd
import json
data = {
    'Country or territory name': ['USA', 'UK', 'France'],
    'ISO 2-character country/territory code': ['US', 'GB', 'FR'],
    'ISO 3-character country/territory code': ['USA', 'GBR', 'FRA'],
    'region': ['North America', 'Europe', 'Europe'],
    'year': [2020, 2020, 2020],
    'estimated total population number': [330000000, 67000000, 65000000],
    'Estimated prevalence of TB (all forms) per 100 000 population': [2.5, 3.2, 4.1]
}
df = pd.DataFrame(data)

from app.services.analytics import column_filter
from app.services.analytics.domain_detector import DomainType

c = column_filter.filter_columns(df, DomainType.GENERIC)
with open("test_cols_result.json", "w") as f:
    json.dump({
        "Metrics": c.metrics,
        "Dimensions": c.dimensions,
        "Dates": c.dates,
        "Excluded": c.excluded
    }, f, indent=2)
