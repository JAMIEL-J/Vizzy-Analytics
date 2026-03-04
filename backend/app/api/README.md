
---

README – API Layer (app/api)

Purpose
The API layer exposes backend functionality through HTTP endpoints using FastAPI.
Its only responsibility is handling requests and responses.

This layer acts as a boundary between:

* External clients (frontend, tools, integrations)
* Internal domain logic (services layer)

The API layer must never contain business logic.

---

Core Design Rules (Very Important)

1. No business logic
   The API layer must not:

* Process data
* Perform analytics
* Clean datasets
* Inspect datasets
* Execute SQL
* Call LLMs

All logic lives in the services layer.

2. Explicit governance
   Every API endpoint enforces:

* Authentication (JWT)
* Authorization (role + ownership)
* Rate limiting
* Contract-based access for analytics

3. Immutable data philosophy
   Once created, these are never modified:

* Dataset versions
* Inspection reports
* Cleaning plans (after approval)
* Analysis results
* Audit logs

The API layer never mutates historical data.

---

Folder Structure

app/api/

* deps.py
* router.py
* auth_routes.py
* user_routes.py
* dataset_routes.py
* dataset_version_routes.py
* inspection_routes.py
* cleaning_plan_routes.py
* analysis_contract_routes.py
* analysis_routes.py
* audit_routes.py

---

File Responsibilities

deps.py
Provides shared FastAPI dependencies:

* Database session
* Authenticated user
* Rate-limited user
* Admin-only user

This file only wires dependencies.
No business logic is allowed here.

router.py
Central API router.
Registers all route modules and applies API versioning and tags.
This is the single entry point for all APIs.

---

auth_routes.py
Handles:

* User login
* Access token refresh

Does NOT:

* Hash passwords
* Store credentials
* Perform role checks

All security logic lives in the core layer.

---

user_routes.py
Handles:

* User access endpoints
* Admin-controlled user operations

Relies entirely on core security and services.

---

dataset_routes.py
Handles:

* Dataset creation
* Dataset listing
* Dataset soft deletion

Ownership checks are enforced in the services layer.

---

dataset_version_routes.py
Handles:

* Creation of immutable dataset versions
* Listing versions for a dataset
* Fetching the latest version

No raw data handling or file access occurs here.

---

inspection_routes.py
Handles:

* Dataset inspection report creation
* Inspection report retrieval

Inspection is:

* Read-only
* Risk-focused
* Mandatory before cleaning

Inspection never modifies data.

---

cleaning_plan_routes.py
Handles:

* Cleaning plan proposal
* Cleaning plan approval

Critical rule:
Cleaning never runs automatically.
Explicit user approval is mandatory.

---

analysis_contract_routes.py
Handles:

* Creation and management of analysis contracts

Analysis contracts define:

* Allowed metrics
* Allowed dimensions
* Constraints

They act as governance boundaries for analytics.

---

analysis_routes.py
Handles:

* Execution of analysis under a valid contract
* Retrieval of analysis results

Key rule:
No analysis runs without an active analysis contract.

---

audit_routes.py
Handles:

* Read-only access to audit logs
* Admin-only visibility

Audit logs are:

* Append-only
* Immutable
* System-generated

Normal users can never access audit data.

---

Security Model

The API layer enforces:

* JWT-based authentication
* Role-based access control (USER / ADMIN)
* Ownership checks (delegated to services)
* Rate limiting per user

Sensitive operations are restricted to admins only.

---

Error Handling

The API layer:

* Catches domain-level exceptions
* Converts them into HTTP responses
* Never exposes stack traces or internal details

---

What This Layer Intentionally Avoids

* Data cleaning logic
* Analytics execution logic
* LLM prompt handling
* SQL queries
* File I/O
* State mutation

---

Summary

The API layer is intentionally thin.

Its job is not to be smart.
Its job is to be safe, explicit, and boring.

All intelligence and rules live below this layer in the services and core layers.

---




