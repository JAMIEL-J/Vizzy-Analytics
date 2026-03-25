"""
DuckDB Cleanup Service.

Responsibility: Manage DuckDB file lifecycle with TTL-based deletion
Removes old/unused DuckDB files to prevent disk space bloat
"""
import logging
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from app.core.storage import get_base_data_dir

logger = logging.getLogger(__name__)


def get_duckdb_file_stats(duckdb_path: Path) -> Dict:
    """Get metadata about a DuckDB file."""
    if not duckdb_path.exists():
        return {}

    stat_info = duckdb_path.stat()
    return {
        'path': str(duckdb_path),
        'size_mb': stat_info.st_size / (1024 * 1024),
        'created_at': datetime.fromtimestamp(stat_info.st_ctime),
        'modified_at': datetime.fromtimestamp(stat_info.st_mtime),
        'age_days': (datetime.now() - datetime.fromtimestamp(stat_info.st_mtime)).days
    }


def find_old_duckdb_files(
    max_age_days: int = 7,
    base_dir: Path = None
) -> List[Tuple[Path, Dict]]:
    """
    Find DuckDB files older than max_age_days.

    Args:
        max_age_days: Delete files not accessed in this many days
        base_dir: Search directory (defaults to storage base)

    Returns:
        List of (path, stats) tuples for old files
    """
    if base_dir is None:
        base_dir = get_base_data_dir()

    old_files = []

    # Traverse directory structure: {base_dir}/{dataset_id}/{version_id}/data.duckdb
    for dataset_dir in base_dir.iterdir():
        if not dataset_dir.is_dir():
            continue

        for version_dir in dataset_dir.iterdir():
            if not version_dir.is_dir():
                continue

            duckdb_path = version_dir / "data.duckdb"
            if not duckdb_path.exists():
                continue

            stats = get_duckdb_file_stats(duckdb_path)
            if stats['age_days'] > max_age_days:
                old_files.append((duckdb_path, stats))
                logger.info(f"Found old DuckDB file: {duckdb_path} ({stats['age_days']} days old, {stats['size_mb']:.2f} MB)")

    return old_files


def cleanup_old_duckdb_files(
    max_age_days: int = 7,
    dry_run: bool = False
) -> Dict:
    """
    Clean up DuckDB files older than max_age_days.

    Args:
        max_age_days: Delete files not accessed in this many days
        dry_run: If True, only report what would be deleted (don't delete)

    Returns:
        {
            'success': bool,
            'files_deleted': int,
            'space_freed_mb': float,
            'errors': List[str]
        }
    """
    try:
        old_files = find_old_duckdb_files(max_age_days=max_age_days)

        if not old_files:
            logger.info(f"No DuckDB files older than {max_age_days} days found")
            return {
                'success': True,
                'files_deleted': 0,
                'space_freed_mb': 0,
                'errors': []
            }

        files_deleted = 0
        space_freed_mb = 0
        errors = []

        for duckdb_path, stats in old_files:
            try:
                if dry_run:
                    logger.info(f"[DRY RUN] Would delete: {duckdb_path} ({stats['size_mb']:.2f} MB)")
                    files_deleted += 1
                    space_freed_mb += stats['size_mb']
                else:
                    duckdb_path.unlink()
                    files_deleted += 1
                    space_freed_mb += stats['size_mb']
                    logger.info(f"✅ Deleted: {duckdb_path} ({stats['size_mb']:.2f} MB)")

            except Exception as e:
                error_msg = f"Failed to delete {duckdb_path}: {e}"
                errors.append(error_msg)
                logger.error(error_msg)

        log_prefix = "[DRY RUN] " if dry_run else ""
        logger.info(
            f"{log_prefix}DuckDB cleanup complete: "
            f"{files_deleted} files, {space_freed_mb:.2f} MB freed, "
            f"{len(errors)} errors"
        )

        return {
            'success': len(errors) == 0,
            'files_deleted': files_deleted,
            'space_freed_mb': space_freed_mb,
            'errors': errors
        }

    except Exception as e:
        error_msg = f"DuckDB cleanup failed: {e}"
        logger.error(error_msg, exc_info=True)
        return {
            'success': False,
            'files_deleted': 0,
            'space_freed_mb': 0,
            'errors': [error_msg]
        }


def schedule_cleanup_job(
    scheduler,
    max_age_days: int = 7,
    job_id: str = "duckdb_cleanup"
):
    """
    Schedule periodic DuckDB cleanup job.

    Usage:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        schedule_cleanup_job(scheduler, max_age_days=7)
        scheduler.start()
    """
    def cleanup_job():
        result = cleanup_old_duckdb_files(max_age_days=max_age_days)
        logger.info(f"Scheduled cleanup result: {result}")

    try:
        scheduler.add_job(
            cleanup_job,
            'cron',
            hour=2,  # Run at 2 AM daily
            minute=0,
            id=job_id,
            name='DuckDB File Cleanup',
            replace_existing=True
        )
        logger.info(f"✅ DuckDB cleanup job scheduled: {job_id}")
    except Exception as e:
        logger.error(f"Failed to schedule DuckDB cleanup job: {e}")
        raise
