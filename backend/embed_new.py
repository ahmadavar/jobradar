from app.core.database import SessionLocal
from app.services.match import embed_all_jobs

db = SessionLocal()
try:
    embed_all_jobs(db)
finally:
    db.close()
