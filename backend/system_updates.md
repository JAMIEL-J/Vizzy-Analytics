# System Update Plan — Universal Multi-Domain Data Engine

---

## Priority 1 — Dashboard Builder

### 1.1 Column Classification Transparency & Override Controls
**Problem:** Hybrid scoring engine misclassifies columns on unfamiliar datasets. Users have no way to correct it, destroying trust immediately.

**Required Updates:**
- Expose `AnalysisContract` classification results in the UI per column
- Show detected role (Dimension / Metric / Identifier / Temporal) and aggregation method (SUM / AVG) per column
- Add override UI per column:
  ```
  [contract_type] [Detected: Dimension] [Override: ▼]
  [tenure]        [Detected: Metric - AVG] [Override: ▼]
  [revenue]       [Detected: Metric - SUM] [Override: ▼]
  ```
- Re-run chart generation when user overrides a classification
- Persist overrides per dataset session

**Impact:** Eliminates silent misclassification failures. Critical for technical user trust.

---

### 1.2 Cross-Filtering Between Charts
**Problem:** Dashboard feels static. Clicking a chart element does nothing. Technical users expect this as baseline interactivity.

**Required Updates:**
- Implement global filter state in React (useContext or Zustand)
- Every chart component subscribes to and publishes to this global filter state
- Clicking a bar segment, pie slice, or map region sets an active filter
- All other charts re-query DuckDB with the active filter applied
- Active filter shown as a visible chip/badge above the dashboard:
  ```
  Filtering by: Contract = "Month-to-month"  [✕ Clear]
  ```
- Support multi-filter stacking (Region + Contract simultaneously)

**Impact:** Single most expected interactive feature for technical users. Absence makes dashboard feel like a static report.

---

### 1.3 Chart Type & Aggregation Override Controls
**Problem:** Auto-generation is a starting point for technical users, not the final output. No override means no control.

**Required Updates:**
- Add a settings icon per chart widget
- On click, expose:
  - Chart type selector (Bar / Line / Scatter / Pie / HBar / Stacked / Donut)
  - Aggregation method selector (SUM / AVG / COUNT / MIN / MAX)
  - Axis swap option (X ↔ Y)
  - Top-N filter (Show top 5 / 10 / 20 / All)
- Re-render chart immediately on any override change
- Persist overrides per chart per session

**Impact:** Technical users stop fighting the system and start working with it.

---

### 1.4 Dashboard Insight Narrative
**Problem:** Dashboard generates charts but no summary. Non-technical users and even technical users need context on what the data actually says.

**Required Updates:**
- After chart generation, pass all aggregated KPI results to LLM
- Prompt structure:
  ```
  Given these aggregated metrics: {kpi_results}
  Domain: {detected_domain}
  
  Generate 4-5 plain English sentences:
  1. Single most important finding
  2. One positive trend
  3. One area of concern
  4. One question worth investigating
  
  No jargon. No technical terms. Be direct.
  ```
- Render narrative as a card at the top of the dashboard above all charts
- Regenerate narrative when user applies filters or overrides

**Impact:** Transforms dashboard from chart collection into actionable summary.

---

### 1.5 Null & Data Quality Visibility
**Problem:** Warning badge exists but is passive. Technical users need to know exactly what was excluded and why.

**Required Updates:**
- Expand health check report into a collapsible panel:
  ```
  Data Quality Report
  ├── tenure: 4.2% nulls — averaged over non-null rows
  ├── region: 0.8% nulls — excluded from geo chart
  └── revenue: 0% nulls — clean
  ```
- Show row count before and after null exclusion
- Flag columns excluded from chart generation entirely
- Add option to include/exclude null rows per column

**Impact:** Technical users can verify data integrity before trusting any output.

---

### 1.6 Outlier Detection Before Charting
**Problem:** One extreme outlier makes an entire bar chart unreadable. System currently charts raw data without detection.

**Required Updates:**
- Run IQR-based outlier detection on every metric before charting:
  ```python
  Q1 = col.quantile(0.25)
  Q3 = col.quantile(0.75)
  IQR = Q3 - Q1
  outliers = col[(col < Q1 - 1.5*IQR) | (col > Q3 + 1.5*IQR)]
  ```
- If outliers detected, show warning on chart:
  ```
  ⚠ 3 outliers detected. Showing with/without toggle.
  ```
- Add toggle to show chart with and without outliers
- Never silently exclude — always inform

**Impact:** Prevents misleading visualizations on real-world messy data.

---

### 1.7 Cardinality & Sparsity Improvements
**Problem:** >15 categories blocked from pie — correct. But HBar with "Others" bucket needs refinement.

**Required Updates:**
- Make Top-N threshold configurable per chart (default Top 10)
- Show "Others" bucket value and count explicitly in tooltip
- Add option to expand "Others" into full list
- If a metric has only 1 unique value after aggregation, suppress the chart entirely with explanation:
  ```
  "Contract Type has only one value in this dataset — chart skipped"
  ```
- Minimum data point enforcement:
  - Trend/Line chart: minimum 5 time points
  - Scatter: minimum 10 data points
  - Pie/Donut: minimum 2 segments

**Impact:** Eliminates meaningless charts that currently pass through silently.

---

### 1.8 Export Controls
**Problem:** No export functionality currently documented.

**Required Updates:**
- Export chart as PNG/SVG per chart widget
- Export underlying chart data as CSV per chart
- Export full dashboard as PDF
- Export all KPIs as CSV summary

**Impact:** Technical users need to take data out of the dashboard. Without this, the dashboard is a dead end.

---

### 1.9 Domain Detection Confidence Visibility
**Problem:** Domain fingerprinting runs silently. If it misdetects (Sales dataset detected as HR), every chart is wrong and user has no visibility.

**Required Updates:**
- Show detected domain with confidence score in dashboard header:
  ```
  Detected Domain: Customer Churn  (Confidence: 87%)  [Override ▼]
  ```
- Allow manual domain override from a defined list
- Re-run chart generation and KPI selection on domain override
- Log which keywords/columns triggered the domain detection (collapsible debug panel for technical users)

**Impact:** Prevents silent domain misdetection from generating an entirely wrong dashboard.

---

## Priority 2 — NL2SQL Chat Analytics

### 2.1 SQL Visibility — Surface Prominently by Default
**Problem:** SQL exists in JSON payload but not prominently shown in UI. Technical users need this as default, not hidden.

**Required Updates:**
- Show generated SQL in a collapsible code block below every answer by default
- Syntax highlight the SQL (use Prism.js or similar)
- One-click copy button on SQL block
- "Run Modified SQL" option — let user edit SQL and re-execute directly
- Show affected row count and execution time next to every result

**Impact:** Table stakes for technical users. Absence signals the system has something to hide.

---

### 2.2 Execution Time Display
**Problem:** Tracked internally, not shown to user. 30-minute fix currently not done.

**Required Updates:**
- Surface execution time next to every query result:
  ```
  Returned 1,243 rows in 0.34s
  ```
- Break down time if possible: LLM generation time vs DuckDB execution time
- Flag slow queries (>2s) with explanation

**Impact:** Minimal effort, high credibility signal for technical users.

---

### 2.3 Granular Question Classification
**Problem:** Current 3-bucket routing (Analysis / Dashboard / Text) is too coarse. LLM makes too many decisions inside the prompt.

**Required Updates:**
- Expand IntentClassifier to 6 types:
  ```
  RETRIEVAL    → single SQL, return table + scalar
  COMPARATIVE  → SQL with comparison logic or CTEs
  AGGREGATIVE  → SQL with grouping, correct agg method enforced
  INTERPRETIVE → diagnostic query battery + LLM synthesis
  TREND        → time-series SQL, line chart forced
  AMBIGUOUS    → clarification question, no SQL generated
  ```
- Each type routes to a dedicated prompt template
- Classification result visible in UI for technical users (optional debug toggle)

**Impact:** Removes ambiguity from LLM decision-making. Each prompt is purpose-built for its query type.

---

### 2.4 Interpretive Query — Diagnostic Battery
**Problem:** `text_answer_generator` runs math then interprets. If it's one query, it's shallow. Needs multi-query diagnostic approach.

**Required Updates:**
- On INTERPRETIVE classification, auto-generate and run diagnostic battery:
  ```
  For "why is churn high":
  Query 1: Churn rate by contract type
  Query 2: Churn rate by tenure segment (bucketed)
  Query 3: Churn trend by month
  Query 4: Churn rate by region
  Query 5: CORR(tenure, churn_flag) — correlation check
  ```
- All results passed simultaneously to LLM for synthesis
- LLM prompt:
  ```
  You are a senior data analyst. Given these query results:
  {all_query_results}
  
  Identify the top 3 drivers of the pattern.
  Explain each in one plain English sentence.
  State your confidence level (High/Medium/Low) per finding.
  Flag any finding that needs more data to confirm.
  ```
- Return narrative + all supporting charts

**Impact:** Transforms "why" questions from shallow retrieval to genuine analytical insight.

---

### 2.5 Ambiguity Handling — Explicit Clarification
**Problem:** Fuzzy semantic matching guesses silently. Wrong guesses destroy trust.

**Required Updates:**
- When AMBIGUOUS classification triggers, always ask one clarifying question before SQL:
  ```
  "Show me top customers"
  → "Top customers by revenue, order count, or recency?"
  ```
- Never proceed to SQL on ambiguous input without confirmation
- Clarification question must reference actual column names from schema:
  ```
  "Did you mean 'contract_type' or 'payment_method'?"
  ```
- After clarification received, proceed normally and remember the resolution for follow-ups

**Impact:** Eliminates silent wrong assumptions. One wrong confident answer loses a technical user permanently.

---

### 2.6 Multi-Table Join Support
**Problem:** Single-table only is the biggest capability ceiling in the system.

**Required Updates:**
- Allow multiple file uploads per session
- Auto-detect relationship candidates between tables:
  ```python
  # Find columns with same name and compatible types across tables
  # Flag as likely join keys
  customer_id in orders ↔ customer_id in customers
  ```
- Show detected relationships to user for confirmation
- Inject relationship map into LLM system prompt:
  ```
  Tables:
  - orders (order_id, customer_id, revenue, order_date)
  - customers (customer_id, region, contract_type, tenure)
  
  Relationships:
  - orders.customer_id → customers.customer_id (Many-to-One)
  ```
- LLM generates JOIN queries using confirmed relationships
- Validate JOIN columns exist and types match before execution

**Impact:** Removes the single biggest capability constraint. Without this, system only works on pre-processed denormalized exports.

---

### 2.7 Conversation Memory Improvements
**Problem:** Last 5-10 messages stored. No explicit tracking of what was resolved (ambiguity resolutions, active filters, confirmed column mappings).

**Required Updates:**
- Maintain separate resolution memory alongside message history:
  ```json
  {
    "resolved_ambiguities": {
      "top customers": "by revenue"
    },
    "active_filters": {
      "region": "North"
    },
    "confirmed_columns": {
      "churn": "churn_flag"
    }
  }
  ```
- Inject resolution memory into every prompt turn
- Never re-ask a clarification already resolved in the session

**Impact:** Conversation feels coherent instead of amnesiac after a few turns.

---

## Priority 3 — Integration & Architecture

### 3.1 Dashboard-to-Chat Context Injection
**Problem:** Architecture supports it but not confirmed as fully implemented end-to-end.

**Required Updates:**
- "Ask about this chart" button on every chart widget
- On click, inject into chat context:
  ```json
  {
    "source": "dashboard_widget",
    "chart_type": "bar",
    "title": "Churn Rate by Contract Type",
    "data": {
      "Month-to-month": 0.42,
      "One year": 0.11,
      "Two year": 0.03
    },
    "applied_filters": {"region": "North"}
  }
  ```
- Chat system prompt updated to reference this context explicitly
- First chat response acknowledges the chart context:
  ```
  "You're asking about Churn Rate by Contract Type. 
   Month-to-month shows the highest churn at 42%. 
   What would you like to know?"
  ```

**Impact:** Connects the two modules into one coherent product experience.

---

### 3.2 LLM Model Benchmarking & Selection
**Problem:** Gemini 1.5 Pro as primary is an assumption, not a verified decision. SQL accuracy unbenchmarked across models.

**Required Updates:**
- Build a benchmark suite of 50 test queries across all 6 classification types
- Run suite against Gemini 1.5 Pro, Groq/Llama-3, and Claude Sonnet
- Measure: SQL correctness, execution success rate, retry frequency, latency
- Select primary model based on correctness, not speed
- Use speed-optimized model only for simple RETRIEVAL queries where accuracy risk is lower

**Impact:** Stops assuming the current model stack is optimal. One model swap could meaningfully improve accuracy across the board.

---

### 3.3 Execution Time Breakdown
**Problem:** Total time tracked but not decomposed. Users can't tell if slowness is LLM or DuckDB.

**Required Updates:**
- Track and expose three time components:
  ```
  Classification:  0.12s
  LLM Generation:  1.34s
  DuckDB Execution: 0.08s
  Total:           1.54s
  ```
- Surface in UI as expandable timing detail per query
- Use this data internally to identify optimization targets

---

### 3.4 Caching Layer for Repeated Queries
**Problem:** Relying on DuckDB internal caching only. No application-level cache.

**Required Updates:**
- Cache query results keyed by hash of (SQL + dataset_id)
- Invalidate cache on dataset re-upload or filter change
- Show "Cached result" indicator when returning cached data with timestamp
- For dashboard generation, cache the full chart config per dataset so re-opening doesn't re-run everything

**Impact:** Dramatically improves perceived performance for technical users exploring the same dataset repeatedly.

---

## Summary — Prioritized Order

| Priority | Update | Effort | Impact |
|---|---|---|---|
| 1 | Column classification override UI | Medium | Critical |
| 2 | Cross-filtering between charts | Medium | Critical |
| 3 | Chart type & aggregation overrides | Low | High |
| 4 | Dashboard insight narrative | Low | High |
| 5 | Domain detection visibility & override | Low | High |
| 6 | Execution time display in chat | Low | High |
| 7 | SQL visible by default in chat | Low | High |
| 8 | Outlier detection before charting | Medium | High |
| 9 | Granular question classification (6 types) | Medium | High |
| 10 | Interpretive query diagnostic battery | Medium | High |
| 11 | Ambiguity clarification (explicit) | Low | High |
| 12 | Null/data quality expanded panel | Low | Medium |
| 13 | Export controls | Medium | Medium |
| 14 | Conversation resolution memory | Medium | Medium |
| 15 | Dashboard-to-chat context injection | Medium | High |
| 16 | Cardinality & sparsity refinements | Low | Medium |
| 17 | LLM model benchmarking | High | High |
| 18 | Multi-table join support | High | Critical |
| 19 | Caching layer | High | Medium |
| 20 | Execution time breakdown | Low | Medium |
