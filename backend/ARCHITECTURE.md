# Vizzy Backend Architecture — Flow Analysis

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND / CLIENT                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (FastAPI)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ auth_routes │ │dataset_routes│ │upload_routes│ │ analysis_nl_routes     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ deps.py     │ │version_routes│ │inspect_routes│ │ cleaning_plan_routes  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE LAYER                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ security │ │  config  │ │  audit   │ │rate_limit│ │ storage  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICES LAYER                                   │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                    │
│ │   Domain Services       │  │   Execution Engines     │                    │
│ │ • user_service          │  │ • ingestion_execution/  │                    │
│ │ • dataset_service       │  │ • inspection_execution/ │                    │
│ │ • dataset_version_service│ │ • cleaning_execution/   │                    │
│ │ • cleaning_plan_service │  │ • analysis_execution/   │                    │
│ │ • analysis_contract_svc │  │ • visualization/        │                    │
│ │ • analysis_service      │  │ • llm/                  │                    │
│ │ • analysis_orchestrator │  │                         │                    │
│ └─────────────────────────┘  └─────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             MODELS LAYER                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────────────────┐  │
│  │   User   │ │ Dataset  │ │DatasetVersion│ │ InspectionReport          │  │
│  │          │ │          │ │              │ │ CleaningPlan              │  │
│  │          │ │          │ │              │ │ AnalysisContract/Result   │  │
│  └──────────┘ └──────────┘ └──────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE + FILE STORAGE                              │
│              PostgreSQL (metadata)  +  File System (raw/cleaned CSVs)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Data Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        1️⃣  DATA INGESTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  User uploads file (CSV/Excel/JSON)
           │
           ▼
  ┌────────────────────┐
  │  upload_routes.py  │ ← API endpoint
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │   file_loader.py   │ ← Validate extension/size, load to DataFrame
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │ schema_inference.py│ ← Detect dtypes, compute schema hash
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │ storage.py         │ ← Save raw CSV to: data/uploads/{dataset_id}/{version_id}/raw.csv
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │ dataset_version_   │ ← Create immutable DatasetVersion record
  │ service.py         │
  └────────────────────┘
           │
           ▼
      📦 Version 0 Created (RAW, IMMUTABLE)


┌─────────────────────────────────────────────────────────────────────────────┐
│                        2️⃣  DATA INSPECTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  User requests inspection for a dataset version
           │
           ▼
  ┌────────────────────┐
  │inspection_routes.py│ ← API endpoint
  └────────────────────┘
           │
           ▼
  ┌────────────────────────────────────────────────┐
  │           inspection_execution/                │
  │  ┌─────────────┐  ┌─────────────┐             │
  │  │ profiler.py │  │time_checks.py│             │
  │  └─────────────┘  └─────────────┘             │
  │  ┌──────────────┐ ┌──────────────┐            │
  │  │anomaly_checks│ │ risk_scorer  │            │
  │  └──────────────┘ └──────────────┘            │
  └────────────────────────────────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │  InspectionReport  │ ← Immutable report created
  │  (issues, risk)    │
  └────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        3️⃣  DATA CLEANING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  User proposes cleaning plan
           │
           ▼
  ┌────────────────────────┐
  │cleaning_plan_routes.py │ ← Create cleaning plan (not executed yet!)
  └────────────────────────┘
           │
           ▼
  ┌────────────────────────┐
  │  CleaningPlan model    │ ← proposed_actions stored, approved=False
  └────────────────────────┘
           │
      User APPROVES plan
           │
           ▼
  ┌──────────────────────────────────────────────┐
  │           cleaning_execution/                │
  │  ┌─────────────┐  ┌─────────────┐           │
  │  │  rules.py   │  │rule_engine.py│           │
  │  └─────────────┘  └─────────────┘           │
  │  ┌─────────────┐  ┌─────────────┐           │
  │  │ executor.py │  │ planner.py  │           │
  │  └─────────────┘  └─────────────┘           │
  └──────────────────────────────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │  storage.py        │ ← Save cleaned CSV: data/.../cleaned.csv
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │ DatasetVersion     │ ← Update cleaned_reference field
  │ (cleaned_reference)│
  └────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    4️⃣  ANALYSIS CONTRACT FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  User creates analysis contract (governance)
           │
           ▼
  ┌─────────────────────────┐
  │analysis_contract_routes │ ← Define allowed metrics, dimensions, constraints
  └─────────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │  AnalysisContract  │ ← Controls what analytics are allowed
  └────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                   5️⃣  CONVERSATIONAL ANALYTICS FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

  User sends natural language query: "Show me average sales by region"
           │
           ▼
  ┌──────────────────────┐
  │ analysis_nl_routes.py│ ← API endpoint
  └──────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    analysis_orchestrator.py                              │
  │                                                                          │
  │  1. Load DatasetVersion → Get data path (cleaned or raw)                 │
  │           │                                                              │
  │           ▼                                                              │
  │  2. Load AnalysisContract → Get allowed metrics/dimensions               │
  │           │                                                              │
  │           ▼                                                              │
  │      ┌─────────────────────────────────────────────────────┐            │
  │      │                    llm/                             │            │
  │      │  ┌───────────────────┐  ┌─────────────────────┐    │            │
  │      │  │ intent_classifier │→ │ intent_validator    │    │            │
  │      │  │ (LLM parses query)│  │ (check vs contract) │    │            │
  │      │  └───────────────────┘  └─────────────────────┘    │            │
  │      │                              │                      │            │
  │      │                              ▼                      │            │
  │      │                    ┌─────────────────────┐         │            │
  │      │                    │   intent_mapper     │         │            │
  │      │                    │  (→ operation spec) │         │            │
  │      │                    └─────────────────────┘         │            │
  │      └─────────────────────────────────────────────────────┘            │
  │           │                                                              │
  │           ▼                                                              │
  │  3. ┌─────────────────────────────────────────────────────┐             │
  │     │           analysis_execution/                       │             │
  │     │  ┌──────────────────┐                               │             │
  │     │  │ analysis_executor │ ← Execute aggregation/trend  │             │
  │     │  └──────────────────┘                               │             │
  │     │  ┌──────────────────┐                               │             │
  │     │  │operation_catalog │ ← Allowed operations registry │             │
  │     │  └──────────────────┘                               │             │
  │     └─────────────────────────────────────────────────────┘             │
  │           │                                                              │
  │           ▼                                                              │
  │  4. ┌─────────────────────────────────────────────────────┐             │
  │     │           visualization/                            │             │
  │     │  ┌──────────────────┐                               │             │
  │     │  │ dashboard_builder│ ← KPI / Bar / Line widgets    │             │
  │     │  └──────────────────┘                               │             │
  │     └─────────────────────────────────────────────────────┘             │
  │           │                                                              │
  │           ▼                                                              │
  │  5. Save AnalysisResult (immutable record)                               │
  │           │                                                              │
  │           ▼                                                              │
  │  Return: { query, result, dashboard }                                    │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Immutability** | Raw data never modified. Cleaning creates new files. |
| **Explicit Approval** | Cleaning plans require user approval before execution. |
| **Contract-Based Analytics** | AnalysisContract defines what queries are allowed. |
| **LLM as Classifier** | LLM only parses intent, never executes code. |
| **Full Auditability** | All actions logged. All results tied to version + contract. |
| **Fail-Fast** | InvalidOperation raised for any violation. |

---

## Layer Responsibilities

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **API** | `*_routes.py` | HTTP endpoints, request/response, no logic |
| **Core** | `security.py`, `config.py`, etc. | Auth, config, audit, rate limiting |
| **Services** | `*_service.py` | Business logic, ownership, approvals |
| **Execution** | `*_execution/` | Pure computation, no DB access |
| **Models** | `*.py` | Data contracts, database schemas |

---

## File Storage Layout

```
data/
└── uploads/
    └── {dataset_id}/
        └── {version_id}/
            ├── raw.csv       ← Original uploaded data
            └── cleaned.csv   ← After cleaning approval
```
