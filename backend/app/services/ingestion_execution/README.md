# Ingestion Layer — README

## Purpose

The `ingestion/` folder handles loading raw data from external sources into the system.

It is **read-only** and **source-agnostic** — it knows how to pull data, but never modifies it.

---

## Design Philosophy

1. **Read-only operations only**
2. **No data mutation**
3. **No business logic**
4. **Clear separation between loading, schema inference, and version creation**

---

## Folder Structure

```
services/ingestion/
├── __init__.py
├── file_loader.py
├── db_connector.py
├── schema_inference.py
└── version_builder.py
```

---

## File-by-File Explanation

### 1. `file_loader.py` — File Loading

**Responsibility**
- Load tabular data from CSV and Excel files

**Public Functions**
- `load_from_path(file_path, filename)` → Load from filesystem
- `load_from_upload(file_stream, filename, file_size)` → Load from upload stream

**Validation**
- File extension must be `csv`, `xlsx`, or `xls`
- File size must not exceed configured maximum

**Returns**: `pandas.DataFrame`

**Raises**: `InvalidOperation` on validation failure or parse error

---

### 2. `db_connector.py` — Database Loading

**Responsibility**
- Load tabular data from external databases via SQL

**Public Functions**
- `load_from_database(engine, query, params)` → Execute SELECT query

**Security**
- Only SELECT queries are allowed
- Regex validation rejects any non-SELECT statement

**Returns**: `pandas.DataFrame`

**Raises**: `InvalidOperation` on invalid query or execution failure

---

### 3. `schema_inference.py` — Schema Extraction

**Responsibility**
- Infer schema metadata from a DataFrame
- Compute deterministic schema hash

**Public Functions**
- `infer_schema(df)` → Extract column metadata and hash

**Returns**:
```python
{
    "columns": [
        {"name": str, "dtype": str, "nullable": bool}
    ],
    "schema_hash": str  # SHA-256 hash
}
```

**Type Normalization**
- `integer`, `float`, `boolean`, `datetime`, `string`

**Raises**: `InvalidOperation` if DataFrame is empty

---

### 4. `version_builder.py` — Version Creation Bridge

**Responsibility**
- Create a new immutable `DatasetVersion` from ingested metadata
- Bridge between ingestion and governance

**Public Functions**
- `build_dataset_version(session, dataset_id, source_type, source_reference, schema_hash, created_by, row_count)`

**Validation**
- Requires non-empty `schema_hash`
- Requires non-empty `source_reference`

**Returns**: `DatasetVersion` model instance

---

## What This Layer Does NOT Do

- ❌ Modify source data
- ❌ Clean or transform data
- ❌ Perform analytics
- ❌ Execute business logic
- ❌ Handle authentication

---

## Data Flow

```
External Source (File / Database)
        ↓
   file_loader.py / db_connector.py
        ↓
   pandas DataFrame (raw, immutable)
        ↓
   schema_inference.py
        ↓
   schema metadata + hash
        ↓
   version_builder.py
        ↓
   DatasetVersion (persisted, audited)
```

---

## Summary

> The ingestion layer loads raw data from files or databases without modification.
> It extracts schema metadata, computes a deterministic hash, and bridges to the governance layer by creating immutable dataset versions.
