import logging

from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.models.jobs import Job
from app.services import adzuna, jsearch

logger = logging.getLogger(__name__)


def upsert_jobs(jobs: list[dict]) -> tuple[int, int]:
    """Insert new jobs, skip duplicates. Returns (inserted, skipped)."""
    if not jobs:
        return 0, 0

    db = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        for job in jobs:
            stmt = (
                insert(Job)
                .values(**job)
                .on_conflict_do_nothing(index_elements=["external_id"])
            )
            result = db.execute(stmt)
            if result.rowcount:
                inserted += 1
            else:
                skipped += 1
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Upsert failed: {e}")
        raise
    finally:
        db.close()

    return inserted, skipped


def run_ingestion() -> dict:
    logger.info("Starting ingestion...")

    adzuna_jobs = adzuna.fetch_all_jobs()
    jsearch_jobs = jsearch.fetch_all_jobs()
    all_jobs = adzuna_jobs + jsearch_jobs

    logger.info(f"Fetched {len(adzuna_jobs)} from Adzuna, {len(jsearch_jobs)} from JSearch")

    inserted, skipped = upsert_jobs(all_jobs)

    result = {
        "total_fetched": len(all_jobs),
        "adzuna": len(adzuna_jobs),
        "jsearch": len(jsearch_jobs),
        "inserted": inserted,
        "skipped": skipped,
    }

    logger.info(f"Ingestion complete: {result}")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run_ingestion())
