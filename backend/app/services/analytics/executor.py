import json
import logging
from .db_engine import DBEngine
from ..llm.sql_validator import SQLValidator
from ..llm.sql_generator import SQLGenerator
from ..llm.llm_router import LLMRouter

logger = logging.getLogger(__name__)


class Executor:
    """NL2SQL self-healing execution engine."""

    MAX_RETRIES = 3

    def __init__(self):
        self.router = LLMRouter()

    async def run_query(self, user_query: str, db: DBEngine, table_name: str = "data") -> dict:
        """
        Main self-healing loop for DuckDB Execution.

        1. Extract schema from DuckDB
        2. Build NL2SQL prompt via SQLGenerator
        3. Send to LLM Router (Groq → Gemini fallback)
        4. Validate + execute SQL
        5. On error, feed error back to LLM and retry (up to 3×)
        """
        schema = db.extract_schema(table_name)
        if "error" in schema:
            return {"success": False, "error": f"Schema extraction failed: {schema['error']}"}

        current_error = None

        for attempt in range(self.MAX_RETRIES):
            # ── Semantic Column Hinting ──
            # Identify columns mentioned semantically in the query to help the LLM
            from .semantic_resolver import find_column
            words = user_query.lower().split()
            hints = []
            available_cols = list(schema.get('columns', {}).keys())
            
            # Simple keyword extraction (nouns/keywords)
            keywords = [w.strip("?,.!") for w in words if len(w) > 3]
            for kw in keywords:
                match = find_column([kw], available_cols, threshold=0.7)
                if match and match not in [h['column'] for h in hints]:
                    # Check if this column is a string but contains numbers (like TotalCharges)
                    col_type = schema.get('columns', {}).get(match, "").upper()
                    needs_cast = False
                    if "VARCHAR" in col_type or "STRING" in col_type:
                        # Scan sample data
                        samples = [str(r.get(match)) for r in schema.get('sample_data', []) if r.get(match) is not None]
                        # If samples look like numbers (digits + .), suggest casting
                        for s in samples:
                            # Remove currency symbols if present
                            s_clean = s.replace("$", "").replace(",", "").strip()
                            try:
                                float(s_clean)
                                needs_cast = True
                                break
                            except ValueError:
                                continue

                    hints.append({
                        "keyword": kw, 
                        "column": match, 
                        "type": col_type,
                        "needs_cast": needs_cast
                    })
            
            # Build prompt — append prior error on retries
            prompt_query = user_query
            if hints:
                hint_lines = []
                for h in hints:
                    msg = f"- '{h['keyword']}' maps to column '{h['column']}'"
                    if h['needs_cast']:
                        msg += f" (NOTE: This is stored as {h['type']}; use TRY_CAST(\"{h['column']}\" AS DOUBLE) for math)"
                    hint_lines.append(msg)
                
                prompt_query = f"{prompt_query}\n\nColumn Mapping & Type Hints:\n" + "\n".join(hint_lines)

            if current_error:
                prompt_query += (
                    f"\nWarning: The previous SQL failed with error: {current_error}. "
                    "Please fix the syntax or column names and try again."
                )
                logger.warning(f"NL2SQL retry {attempt}/{self.MAX_RETRIES}: {current_error}")

            full_prompt = SQLGenerator.format_prompt(prompt_query, schema)
            llm_result = await self.router.generate_sql(full_prompt, schema=json.dumps(schema))

            raw_sql = llm_result.get("sql", "").strip()
            chart_type = llm_result.get("chart_type", "text")
            title = llm_result.get("title", "")

            try:
                SQLValidator.validate(raw_sql)
                result_df = db.execute_query(raw_sql)

                # Ensure result is JSON-serializable (Timestamps, etc.)
                result_json = result_df.to_json(orient="records", date_format="iso")
                result_data = json.loads(result_json)

                return {
                    "success": True,
                    "sql": raw_sql,
                    "data": result_data,
                    "columns": list(result_df.columns),
                    "row_count": len(result_df),
                    "chart_type": chart_type,
                    "title": title,
                    "x_axis": llm_result.get("x_axis", ""),
                    "y_axis": llm_result.get("y_axis", ""),
                    "explanation": llm_result.get("explanation", ""),
                }

            except Exception as e:
                current_error = str(e)
                continue

        logger.error(f"NL2SQL Engine failed after {self.MAX_RETRIES} attempts.")
        return {"success": False, "error": f"Failed to resolve data query: {current_error}"}
