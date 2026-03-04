# Architecture: Semantic Mapping Engine

## Objective
To replace the current "column-guessing" heuristics in `column_filter.py` and `chart_recommender.py` with a **Deterministic Semantic Mapping Architecture**. This ensures that datasets from any domain (TB/Healthcare, Sales, Marketing, etc.) are accurately identified and their columns are mapped to robust canonical keys without LLM hallucinations or hardcoded `_find_col` wrappers.

---

## Phase 1: Domain Fingerprinting
**File to modify:** `domain_detector.py`

### Mechanism
The engine scans **only the first 10-20 column headers** against a Global Trigger Dictionary. The domain with the highest cumulative score wins and is locked for the session.

### Domain Trigger Weights

#### `HEALTHCARE`
*   `patient`: +12
*   `diagnosis`, `treatment`, `mortality`: +10
*   `admission`, `readmission`: +9
*   `drg`, `icd`, `incidence`, `prevalence`: +8
*   `clinical`, `vital`: +6

#### `SALES` (Retail/E-commerce)
*   `revenue`, `sales`: +10
*   `profit`: +9
*   `order`: +8
*   `product`, `sku`, `price`: +7
*   `quantity`, `discount`: +6
*   `customer`, `store`: +5

#### `CHURN` (Telecom/SaaS)
*   `churn`: +15
*   `tenure`: +10
*   `contract`, `subscription`: +9
*   `cancel`: +8
*   `charges`: +7
*   `monthly`: +6

#### `MARKETING`
*   `ctr`: +12
*   `campaign`, `click`, `impression`, `conversion`, `roas`: +10
*   `lead`, `spend`, `roi`: +8
*   `channel`, `bounce`: +7

#### `FINANCE`
*   `income`, `expense`: +10
*   `balance`: +9
*   `roi`, `asset`, `liability`, `equity`: +8
*   `budget`, `transaction`, `margin`: +7

---

## Phase 2: Keyword Scoring Engine & Canonical Mapping
**File to modify:** `column_filter.py` (Becomes the Mapper)

### Mechanism
Treats 50-word messy headers as unstructured text. Uses a keyword intersection engine to score matches.
*   **Partial Match:** +2 (Keyword exists anywhere).
*   **Boundary Match:** +3 (Keyword matches as a whole word `\b`).
*   **Contextual Hit:** +5 (Multiple related keywords found).
*   **Negative Hit:** -10 (Negates if exclusion keywords exist).

If the score hits a threshold (e.g., $\ge$ 5), the messy header is translated to a **Standardized Canonical Key**.

### Domain Schemas (The Dictionaries)

#### `HEALTHCARE_SCHEMA`
*   `metric_mortality`: ["mortality", "deaths", "fatalities"]
*   `metric_incidence`: ["incidence", "new cases"]
*   `metric_prevalence`: ["prevalence"]
*   `metric_population`: ["population", "people", "demographic"]
*   `attr_hiv_status`: ["hiv", "tbhiv", "hiv-positive"]
*   `attr_drug_resistance`: ["resistance", "mdr", "rr-tb"]
*   `attr_age_group`: ["age", "age_group", "years old"]
*   `attr_sex`: ["sex", "gender", "male", "female"]
*   `stat_low_bound`: ["low bound", "lower bound", "min"]
*   `stat_high_bound`: ["high bound", "upper bound", "max"]

#### `SALES_SCHEMA`
*   `metric_revenue`: ["revenue", "sales", "gmv", "amount", "total"]
*   `metric_profit`: ["profit", "margin", "net", "earnings"]
*   `metric_qty`: ["quantity", "qty", "units", "count", "volume"]
*   `metric_discount`: ["discount", "rebate", "coupon", "reduction"]
*   `attr_product`: ["product", "item", "sku", "service"]
*   `attr_category`: ["category", "subcategory", "department", "type"]
*   `attr_customer`: ["customer", "client", "buyer", "account"]

#### `CHURN_SCHEMA`
*   `metric_tenure`: ["tenure", "age", "months", "duration", "vintage"]
*   `metric_mrr`: ["mrr", "charges", "monthly", "billing"]
*   `attr_contract`: ["contract", "subscription", "plan", "tier"]
*   `attr_status`: ["churn", "status", "active", "cancel", "left"]
*   `attr_payment`: ["payment", "method", "card", "bank"]

#### `UNIVERSAL_SCHEMA` (Applies to all domains alongside the specific schema)
*   `dim_date`: ["date", "time", "year", "month", "quarter", "period", "timestamp"]
*   `dim_country`: ["country", "nation"]
*   `dim_region`: ["region", "state", "province", "territory", "city", "zone"]

---

## Phase 3: Logical Combination Pipeline
**File to modify:** `chart_recommender.py` (Becomes the Template Executor)

### Mechanism
The massive 2,500-line logic file will be scrapped and replaced with **Analytical Templates**. The engine checks the mapped dictionary and blindly renders formulas if the required canonical keys exist.

### Core Templates
*   **Temporal Trend:** `IF (dim_date AND metric_*)` $\rightarrow$ Render Area/Line Chart over time.
*   **Geographical Slicing:** `IF ((dim_country OR dim_region) AND metric_*)` $\rightarrow$ Render Geo Map / Top 10 HBar.
*   **Entity Distribution:** `IF (attr_product OR attr_category AND metric_*)` $\rightarrow$ Render Bar/Treemap showing revenue/mortality by entity.
*   **Error Profiling:** `IF (metric_mortality AND stat_low_bound AND stat_high_bound)` $\rightarrow$ Render Confidence Interval Chart.
*   **Correlation / Scatter:** `IF (metric_revenue AND metric_profit)` $\rightarrow$ Scatter plot to find discounting margins. 
*   **Target Breakdown (Donut/Pie):** `IF (attr_status OR attr_contract)` $\rightarrow$ Render demographic split of categorical variables.

---

## Why This Pipeline Works Universally
1.  **Strict Isolation:** A column with "Spend" will NEVER be mapped to `metric_spend` if the Fingerprinter decided the domain was `Healthcare` in Phase 1.
2.  **Junk Resilience:** If a user uploads `index, row_id, unnamed_0, mortality_rate_raw_x`, the first three columns score `0` and are safely ignored by Phase 3. Only `mortality_rate_raw_x` gets mapped to `metric_mortality`.
3.  **Extensible:** To support a completely new domain (e.g., `LOGISTICS`), we literally just write 10 new lines of mapped keywords. The rest of the pipeline functions automatically.
