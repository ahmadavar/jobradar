import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.jobs import Job
from app.models.resume import Resume
from app.services.embed import embed_job, embed_resume


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors. Returns 0.0 to 1.0."""
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def store_resume(db: Session, version: str, content: str) -> Resume:
    """Embed and store resume in the database."""
    embedding = embed_resume(content)
    resume = Resume(version=version, content=content, embedding=embedding)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    print(f"Resume '{version}' stored and embedded.")
    return resume


def get_latest_resume(db: Session) -> Resume | None:
    """Fetch the most recently added resume."""
    return db.query(Resume).order_by(Resume.created_at.desc()).first()


def embed_all_jobs(db: Session):
    """Embed all jobs that don't have an embedding yet."""
    jobs = db.query(Job).filter(Job.embedding == None).all()
    print(f"Embedding {len(jobs)} jobs...")

    for i, job in enumerate(jobs):
        if not job.description:
            continue
        job.embedding = embed_job(job.title, job.description)
        if (i + 1) % 50 == 0:
            db.commit()
            print(f"  {i + 1}/{len(jobs)} embedded...")

    db.commit()
    print("All jobs embedded.")


def score_jobs(db: Session):
    """Score all jobs against the latest resume embedding."""
    resume = get_latest_resume(db)
    if not resume or resume.embedding is None:
        print("No resume found. Run store_resume first.")
        return

    jobs = db.query(Job).filter(Job.embedding != None).all()
    print(f"Scoring {len(jobs)} jobs against resume...")

    for job in jobs:
        job.match_score = cosine_similarity(resume.embedding, job.embedding)

    db.commit()
    print("Scoring complete.")


def get_top_matches(db: Session, limit: int = 20) -> list[Job]:
    """Return top matching jobs sorted by score."""
    return (
        db.query(Job)
        .filter(Job.match_score != None)
        .order_by(Job.match_score.desc())
        .limit(limit)
        .all()
    )
