

# Models Layer — README

## Purpose of the Models Layer

The `models/` layer defines the **data contracts and immutability rules** of the system.

It answers one core question:

> **“What data exists in this system, who owns it, and how does it evolve over time?”**

This layer is intentionally **passive**.
Models **describe state**, they do **not perform actions**.

---

## Design Philosophy

The models layer is built on five non-negotiable principles:

1. **Immutability by default**
2. **Explicit ownership**
3. **Versioned data, not mutable data**
4. **Auditability over convenience**
5. **Separation of intent, execution, and result**

If a model violates any of these, it does not belong here.

---

## What Models DO NOT Do (By Design)

Models explicitly do **not**:

* Execute analytics
* Perform data cleaning
* Talk to files or databases directly
* Contain business rules
* Enforce approvals
* Contain API logic
* Normalize or auto-correct data

All enforcement happens in **services**, not models.

---

## Folder Structure

```
models/
├── base.py
├── user.py
├── dataset.py
├── dataset_version.py
├── inspection_report.py
├── cleaning_plan.py
├── analysis_contract.py
├── analysis_result.py
└── README.md
```

Each file represents a **distinct stage in the data lifecycle**.

---

## Lifecycle Overview (Big Picture)

```
User
  ↓ owns
Dataset
  ↓ has immutable
DatasetVersion
  ↓ produces
InspectionReport
  ↓ informs
CleaningPlan (requires approval)
  ↓ enables
AnalysisContract
  ↓ governs
AnalysisResult
```

Nothing skips steps.
Nothing mutates history.

---

## File-by-File Explanation

---

### 1. `base.py` — Structural Foundation

**Responsibility**

* Defines fields common to all models

**Fields**

* `id` (UUID)
* `created_at` (UTC)
* `updated_at` (UTC)

**Why this matters**

* Ensures consistent identity
* Enforces UTC time across the system
* Prevents ad-hoc timestamp handling

This file defines **consistency**, not behavior.

---

### 2. `user.py` — Ownership Root

**Represents**

* A human or system actor

**Key Fields**

* `email`
* `hashed_password`
* `role` (USER / ADMIN)
* `is_active`

**Why this matters**

* Every dataset, version, and action traces back to a user
* Enables audit, accountability, and access control

Users are **infrastructure**, not a feature.

---

### 3. `dataset.py` — Logical Data Asset

**Represents**

* A dataset as a *concept*, not as data bytes

**Key Fields**

* `name`
* `description`
* `owner_id`
* `is_active`

**What it does NOT store**

* Files
* Schemas
* Rows
* Versions

**Why this matters**

* Prevents accidental mutation
* Separates identity from content

---

### 4. `dataset_version.py` — Immutable Data State

**Represents**

* A frozen snapshot of a dataset at a point in time

**Key Fields**

* `dataset_id`
* `version_number`
* `source_type`
* `schema_hash`
* `row_count`
* `created_by`

**Why this matters**

* Every transformation creates a new version
* Old versions are never modified
* Enables reproducibility and trust

This is the **single source of truth** for data state.

---

### 5. `inspection_report.py` — Risk Disclosure

**Represents**

* Inspection findings before any cleaning occurs

**Key Fields**

* `issues_detected` (JSON)
* `risk_level` (LOW / MEDIUM / HIGH)
* `summary`
* `generated_by`
* `is_active`

**Why this matters**

* Users see risks *before* data is modified
* Supports human-in-the-loop decision making
* Prevents silent data manipulation

---

### 6. `cleaning_plan.py` — Intent, Not Execution

**Represents**

* Proposed cleaning actions for a dataset version

**Key Fields**

* `proposed_actions` (JSON)
* `approved`
* `approved_by`
* `approved_at`
* `is_active`

**Why this matters**

* Cleaning requires explicit approval
* No “auto-cleaning” without user consent
* Maintains trust and auditability

Execution happens elsewhere.

---

### 7. `analysis_contract.py` — Analytical Guardrails

**Represents**

* What analyses are *allowed* on a dataset version

**Key Fields**

* `allowed_metrics`
* `allowed_dimensions`
* `time_granularity`
* `constraints`
* `is_active`

**Why this matters**

* Prevents unsafe or misleading analysis
* Restricts LLM freedom
* Makes analytics reproducible

This is the **control layer for AI behavior**.

---

### 8. `analysis_result.py` — Reproducible Output

**Represents**

* Stored results of executed analyses

**Key Fields**

* `dataset_version_id`
* `analysis_contract_id`
* `result_payload`
* `generated_at`
* `generated_by`
* `is_active`

**Why this matters**

* Results are traceable
* Results are reproducible
* Results are auditable

Nothing is “just shown and forgotten”.

---

## Why This Models Layer Is Different

Most analytics tools:

* Mutate datasets
* Overwrite results
* Hide assumptions
* Trust AI blindly

This system:

* Versions everything
* Records intent
* Requires approval
* Restricts analysis
* Preserves history

That’s the difference between a **demo** and a **platform**.

---

## How Models Are Used by Other Layers

* **Services**: enforce rules, approvals, execution
* **API layer**: exposes safe operations
* **LLM layer**: operates within analysis contracts
* **Audit layer**: records actions tied to these models

Models never depend on those layers.

---

## One-Sentence 

> “The models layer enforces immutability, ownership, and explicit intent so that all analytics are reproducible, auditable, and governed rather than implicit or AI-driven.”



