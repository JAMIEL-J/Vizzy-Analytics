import pandas as pd
import numpy as np

def detect_outliers_iqr(df: pd.DataFrame, col: str, multiplier: float = 1.5) -> pd.Series:
    """
    Detect outliers in a numeric column using the Interquartile Range (IQR) method.
    Returns a boolean Series where True indicates an outlier.
    """
    if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
        # Return all False if not numeric or missing
        return pd.Series(False, index=df.index)
        
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - (multiplier * IQR)
    upper_bound = Q3 + (multiplier * IQR)
    
    return (df[col] < lower_bound) | (df[col] > upper_bound)
