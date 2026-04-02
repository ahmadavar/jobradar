from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.jobs import Job

db = SessionLocal()
try:
    cutoff = datetime.utcnow() - timedelta(days=15)
    deleted = db.query(Job).filter(Job.ingested_at < cutoff).delete()
    db.commit()
    print(f"Deleted {deleted} jobs older than 15 days.")
finally:
    db.close()
