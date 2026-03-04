import re

class SQLValidator:
    """Security guardrail to intercept malicious LLM-generated SQL."""
    
    FORBIDDEN_KEYWORDS = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'GRANT', 'EXEC', 'ALTER', 'CREATE']
    
    @classmethod
    def validate(cls, sql_query: str) -> bool:
        """
        Regex scan ensuring the SQL contains only READ instructions.
        Raises ValueError if malicious keywords are detected.
        """
        sql_upper = sql_query.upper()
        
        # 1. Block DDL and DML operations
        for keyword in cls.FORBIDDEN_KEYWORDS:
            if re.search(r'\b' + keyword + r'\b', sql_upper):
                raise ValueError(f"Security Violation: '{keyword}' operations are strictly forbidden.")
        
        # 2. Must be a SELECT or EXPLAIN query
        if not sql_upper.lstrip().startswith(('SELECT', 'EXPLAIN', 'WITH')):
            raise ValueError("Security Violation: Only SELECT queries are permitted.")
            
        return True
