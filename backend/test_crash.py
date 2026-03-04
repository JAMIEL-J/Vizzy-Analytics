import pandas as pd
data = {'dummy': [1,2,3]}
df = pd.DataFrame(data)
from app.services.analytics import column_filter
from app.services.analytics.domain_detector import DomainType
import traceback

try:
    c = column_filter.filter_columns(df, DomainType.GENERIC)
    print("Success filter")
except Exception as e:
    traceback.print_exc()
