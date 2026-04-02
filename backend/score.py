from app.core.database import SessionLocal
from app.services.match import score_jobs, get_top_matches
from app.services.notify import send_digest

db = SessionLocal()
try:
    score_jobs(db)

    top_jobs = get_top_matches(db, limit=20)

    print("\n=== TODAY'S TOP 10 MATCHES ===")
    for i, job in enumerate(top_jobs, 1):
        print(f"{i:2}. [{job.match_score:.3f}] {job.title} @ {job.company}")
        print(f"     {job.url}")

    send_digest(top_jobs)
finally:
    db.close()
