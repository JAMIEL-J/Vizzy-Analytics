"""
Benchmark script for DuckDB dashboard query performance.

Phase 3 goals:
- Generate synthetic 1M+ row dataset
- Measure filtered chart query latency (target < 500ms)
- Run concurrent dashboard + chat-like query workload

Usage:
    python scripts/benchmark_duckdb_dashboard.py
"""

from __future__ import annotations

import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from statistics import mean
from uuid import uuid4

import duckdb
import numpy as np
import pandas as pd

from app.services.analytics.duckdb_builder import build_duckdb_from_csv
from app.services.analytics.duckdb_chart_builder import execute_chart_queries


def _build_synthetic_dataset(rows: int = 1_000_000) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    regions = np.array(["North", "South", "East", "West", "Central"])
    segments = np.array(["SMB", "Mid-Market", "Enterprise"])
    contracts = np.array(["Monthly", "Quarterly", "Annual"])

    df = pd.DataFrame(
        {
            "customer_id": np.arange(rows, dtype=np.int64),
            "region": rng.choice(regions, size=rows),
            "segment": rng.choice(segments, size=rows),
            "contract": rng.choice(contracts, size=rows),
            "tenure_months": rng.integers(1, 121, size=rows),
            "monthly_charges": np.round(rng.normal(85, 25, size=rows).clip(10, 250), 2),
            "support_tickets": rng.poisson(1.8, size=rows),
            "churn": rng.choice([0, 1], p=[0.82, 0.18], size=rows),
            "event_date": pd.to_datetime("2024-01-01") + pd.to_timedelta(rng.integers(0, 365, size=rows), unit="D"),
        }
    )
    df["revenue"] = np.round(df["monthly_charges"] * np.maximum(df["tenure_months"], 1), 2)
    return df


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    percentile = max(0.0, min(100.0, pct * 100.0))
    # Use numpy percentile interpolation instead of floor-index lookup.
    # The old implementation could under-report p95 on small samples.
    return float(np.percentile(values, percentile, method="linear"))


def _run_chart_queries(db_path: str, iterations: int = 20) -> list[float]:
    chart_configs = {
        "chart_1": {
            "type": "bar",
            "dimension": "region",
            "metric": "revenue",
            "aggregation": "sum",
            "is_date": False,
        },
        "chart_2": {
            "type": "bar",
            "dimension": "segment",
            "metric": "customer_id",
            "aggregation": "count",
            "is_date": False,
        },
        "chart_3": {
            "type": "line",
            "dimension": "event_date",
            "metric": "revenue",
            "aggregation": "sum",
            "is_date": True,
        },
    }

    filters = {
        "region": ["North", "West"],
        "contract": ["Monthly"],
        "tenure_months": [">= 12", "<= 60"],
    }

    times_ms: list[float] = []
    conn = duckdb.connect(db_path, read_only=True)
    try:
        for _ in range(iterations):
            start = time.perf_counter()
            _ = execute_chart_queries(
                conn=conn,
                chart_configs=chart_configs,
                filters=filters,
                target_column="churn",
                target_value="1",
            )
            elapsed_ms = (time.perf_counter() - start) * 1000
            times_ms.append(elapsed_ms)
    finally:
        conn.close()

    return times_ms


def _chat_like_query(db_path: str) -> float:
    """Simulate a lightweight chat analytics SQL workload."""
    conn = duckdb.connect(db_path, read_only=True)
    try:
        start = time.perf_counter()
        conn.execute(
            """
            SELECT region, AVG(monthly_charges) as avg_charges, SUM(churn) as churn_count
            FROM data
            WHERE tenure_months >= 6
            GROUP BY region
            ORDER BY churn_count DESC
            LIMIT 5
            """
        ).fetchall()
        return (time.perf_counter() - start) * 1000
    finally:
        conn.close()


def _run_concurrency_probe(db_path: str, workers: int = 8, rounds: int = 16) -> tuple[list[float], list[float]]:
    dashboard_latencies: list[float] = []
    chat_latencies: list[float] = []

    def dashboard_task() -> float:
        vals = _run_chart_queries(db_path, iterations=1)
        return vals[0] if vals else 0.0

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = []
        for i in range(rounds):
            futures.append(("dashboard", ex.submit(dashboard_task)))
            if i % 2 == 0:
                futures.append(("chat", ex.submit(_chat_like_query, db_path)))

        for kind, fut in futures:
            val = fut.result()
            if kind == "dashboard":
                dashboard_latencies.append(val)
            else:
                chat_latencies.append(val)

    return dashboard_latencies, chat_latencies


def main() -> None:
    rows = int(os.getenv("BENCH_ROWS", "1000000"))
    print(f"[1/4] Generating synthetic dataset with {rows:,} rows...")
    df = _build_synthetic_dataset(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, "bench.csv")
        df.to_csv(csv_path, index=False)

        dataset_id = uuid4()
        version_id = uuid4()

        print("[2/4] Building DuckDB file...")
        t0 = time.perf_counter()
        duckdb_path = build_duckdb_from_csv(dataset_id, version_id, csv_path, force_rebuild=True)
        build_ms = (time.perf_counter() - t0) * 1000
        print(f"DuckDB build: {build_ms:.1f} ms ({duckdb_path})")

        print("[3/4] Measuring filtered dashboard chart latency...")
        times_ms = _run_chart_queries(str(duckdb_path), iterations=20)
        p50 = _percentile(times_ms, 0.50)
        p95 = _percentile(times_ms, 0.95)
        avg = mean(times_ms)
        print(f"Dashboard filtered query latency: avg={avg:.1f} ms, p50={p50:.1f} ms, p95={p95:.1f} ms")
        print("Target check (<500ms):", "PASS" if p95 < 500 else "FAIL")

        print("[4/4] Running concurrency probe (dashboard + chat-like SQL)...")
        workers = 8
        rounds = 16
        dash_requests = rounds
        chat_requests = (rounds + 1) // 2
        print(
            f"Concurrency probe config: workers={workers}, rounds={rounds}, "
            f"dashboard_requests={dash_requests}, chat_requests={chat_requests}, "
            f"total_submitted={dash_requests + chat_requests}"
        )

        dash_lat, chat_lat = _run_concurrency_probe(str(duckdb_path), workers=workers, rounds=rounds)
        dash_p95 = _percentile(dash_lat, 0.95)
        chat_p95 = _percentile(chat_lat, 0.95)
        print(
            f"Concurrent dashboard latency (n={len(dash_lat)}): avg={mean(dash_lat):.1f} ms, p95={dash_p95:.1f} ms | "
            f"chat-like latency (n={len(chat_lat)}): avg={mean(chat_lat):.1f} ms, p95={chat_p95:.1f} ms"
        )


if __name__ == "__main__":
    main()
