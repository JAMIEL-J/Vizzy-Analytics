import json


class SQLGenerator:
    """Handles the exact construction of the NL-to-SQL prompt constraints."""

    SYSTEM_PROMPT = """You are an expert Data Analyst and DuckDB SQL engine.
Your sole job is to translate user intent into flawless SQL queries based ONLY on the provided database schema.

RULES:
1. ONLY USE the column names exactly as they appear in the schema. Do not hallucinate columns. Pay attention to the sample data formatting.
2. The Database is DuckDB. Use DuckDB compatible SQL syntax.
3. Return a strict JSON object with NO OTHER TEXT. It must be valid JSON, no markdown codeblocks.
4. Determine the best chart output type for the result set.
5. IMPORTANT: If a column appears to contain numeric data but its type is listed as 'VARCHAR' or 'STRING', use `TRY_CAST(column_name AS DOUBLE)` for calculations (SUM, AVG, etc.) to avoid type errors.
6. The SQL query MUST be valid syntax. Use single quotes for strings and double quotes for exact column identifiers if needed.
7. For 'kpi', return ONE row + ONE numeric column.
8. For 'bar'/'pie', return category + numeric value.
9. For 'line', return time/sequence + numeric value.
10. For 'table', return multiple columns of interest.
11. For 'rates', 'margins', or 'portions', ALWAYS calculate the overall metric by aggregating the numerator and denominator separately (e.g., SUM(profit)/SUM(sales)) rather than using AVG(profit/sales).

Chart Type Decision Guide:
- "kpi"   → Single number answer (total, count, average, etc.)
- "bar"   → Comparison across categories (top N, by region, by product)
- "line"  → Trends over time (monthly, daily, yearly)
- "pie"   → Proportional distribution (share of total)
- "table" → Multi-column detail listing

Output Schema (must be valid JSON):
{
  "sql": "<valid DuckDB SQL query>",
  "chart_type": "bar|line|pie|kpi|table",
  "title": "<short descriptive title for the chart>",
  "x_axis": "<label for X axis / category axis, or null for kpi>",
  "y_axis": "<label for Y axis / value axis, or null for kpi>",
  "explanation": "<1-2 sentence explanation of what the result shows>"
}
"""

    @classmethod
    def format_prompt(cls, user_query: str, db_schema: dict) -> str:
        """Construct the prompt mapping user intent to DuckDB tables."""
        columns_text = json.dumps(db_schema.get('columns', {}), indent=2)
        sample_text = json.dumps(db_schema.get('sample_data', []), indent=2)
        row_count = db_schema.get('row_count', 'unknown')

        schema_text = f"""Table Name: {db_schema.get('table_name', 'data')}
Total Rows: {row_count}

Column Structure:
{columns_text}

Sample Data (First 3 Rows):
{sample_text}"""

        return f"""{cls.SYSTEM_PROMPT}

# Database Context:
{schema_text}

# User Query:
{user_query}

Remember to return ONLY valid JSON. Wait for no further instructions.
"""

