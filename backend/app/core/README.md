
---

# Core Layer — README

## Purpose of the Core Layer

The `core/` folder defines the **non-negotiable guarantees** of the system.
It contains **infrastructure-level concerns**, not product features.

If everything else in the application were deleted, the core layer would still define:

* Who can access the system
* How access is validated
* How abuse is prevented
* How actions are audited
* How configuration is safely loaded

**No business logic lives here.**

---

## Design Philosophy

The core layer is built on the following principles:

1. **Security before features**
2. **Explicit over implicit**
3. **Fail closed, not open**
4. **Auditability over convenience**
5. **LLM is never a trusted authority**

This layer is intentionally **boring, strict, and slow to change**.

---

## What Core Does NOT Do (By Design)

The core layer explicitly does **not**:

* Handle datasets
* Perform analytics
* Clean or transform data
* Talk to databases (beyond config)
* Execute LLM logic
* Define API routes
* Contain domain/business rules

Those belong to higher layers.

---

## Folder Contents Overview

```
core/
├── config.py
├── logger.py
├── exceptions.py
├── security.py
├── rate_limit.py
├── audit.py
└── README.md
```

Each file has **one responsibility**.

---

## File-by-File Explanation

### 1. `config.py` — Configuration Spine

**Responsibility**

* Centralized configuration management
* Environment variable loading
* Safe defaults for development

**Key Points**

* Uses `pydantic.BaseSettings`
* Loads from `.env`
* Separates config from logic
* Only includes Phase-1 essentials (DB, auth, rate limits)

**Why this matters**

* Prevents hardcoded secrets
* Makes environment changes predictable
* Avoids configuration sprawl

---

### 2. `logger.py` — Structured Logging

**Responsibility**

* Provide consistent, structured logs
* Prevent sensitive data leakage
* Centralize logging behavior

**Key Points**

* JSON-formatted logs
* UTC timestamps
* Sensitive keyword redaction
* No print statements

**Why this matters**

* Logs can be ingested by monitoring systems
* Debugging and audits are reliable
* Logging behavior is uniform across the app

---

### 3. `exceptions.py` — Error Vocabulary

**Responsibility**

* Define domain-level exception types
* Separate error meaning from HTTP handling

**Defined Exceptions**

* `AuthenticationError`
* `AuthorizationError`
* `ResourceNotFound`
* `InvalidOperation`
* `RateLimitExceeded`

**Why this matters**

* Business logic raises meaningful errors
* API layer decides how to convert them to HTTP responses
* Prevents tangled error handling

---

### 4. `security.py` — Authentication & Authorization

**Responsibility**

* JWT creation and verification
* User identity extraction
* Role enforcement
* Ownership verification

**Key Points**

* Supports USER and ADMIN roles
* Explicit token expiry handling
* No database queries
* No API routes

**Why this matters**

* Security rules are centralized
* Prevents accidental privilege escalation
* Makes access control auditable and testable

---

### 5. `rate_limit.py` — Abuse Protection

**Responsibility**

* Prevent API abuse
* Enforce per-user request limits

**Key Points**

* Per-user rate limiting
* Role-aware limits (ADMIN vs USER)
* Dependency-based (composable)
* Storage isolated for future Redis replacement

**Why this matters**

* Protects expensive endpoints
* Prevents denial-of-service via misuse
* Enforces fairness and system stability

---

### 6. `audit.py` — Accountability Layer

**Responsibility**

* Record sensitive system actions
* Provide traceability for decisions

**Audit Events Capture**

* Who performed an action
* What action was performed
* On which resource
* When it happened
* Optional metadata

**Key Points**

* Append-only
* Thread-safe
* Never blocks execution
* Storage-agnostic

**Why this matters**

* Enables post-incident investigation
* Supports compliance and trust
* Makes user actions accountable

---

## Why Core Is Isolated

The core layer is isolated so that:

* Security rules cannot be bypassed accidentally
* Business logic cannot weaken system guarantees
* LLM behavior cannot override constraints
* Future contributors understand system boundaries

If something belongs in core, it affects **everything**.

---

## How Core Is Used by Other Layers

* **API layer**: uses core dependencies (auth, rate limits)
* **Services layer**: raises core exceptions, records audit events
* **Models layer**: relies on ownership and immutability guarantees
* **LLM layer**: operates under restrictions enforced by core

Core never depends on them — they depend on core.

---

## Summary 

> “The core layer defines security, configuration, auditing, and system safety guarantees.
> It intentionally contains no business logic or analytics.
> Everything else in the system is built on top of these constraints so that data access, transformations, and AI behavior remain controlled, auditable, and reproducible.”

I
