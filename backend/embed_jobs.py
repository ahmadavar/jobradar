from app.core.database import SessionLocal
from app.services.match import embed_all_jobs, score_jobs, get_top_matches

db = SessionLocal()
try:
    # Step 1: Embed all jobs
    embed_all_jobs(db)

    # Step 2: Score all jobs against resume
    score_jobs(db)

    # Step 3: Print top 20 matches
    print("\n=== TOP 20 JOB MATCHES ===")
    top_jobs = get_top_matches(db, limit=20)
    for i, job in enumerate(top_jobs, 1):
        print(f"{i:2}. [{job.match_score:.3f}] {job.title} @ {job.company} ({job.location})")
finally:
    db.close()
