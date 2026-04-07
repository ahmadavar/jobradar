import hashlib
import logging
from datetime import datetime
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search"

KEYWORDS_USA = [
    "data engineer",
    "analytics engineer",
    "data platform engineer",
]

KEYWORDS_BAY_AREA = [
    "data scientist",
    "data engineer",
]

BAY_AREA_CITIES = [
    "San Francisco, CA",
    "Oakland, CA",
    "Berkeley, CA",
    "San Jose, CA",
    "Palo Alto, CA",
    "Mountain View, CA",
    "Sunnyvale, CA",
    "Santa Clara, CA",
    "Fremont, CA",
    "Redwood City, CA",
]


def _make_external_id(job: dict) -> str:
    return f"adzuna_{job['id']}"


def _parse_job(raw: dict) -> dict:
    salary_min = raw.get("salary_min")
    salary_max = raw.get("salary_max")

    posted_at = None
    if raw.get("created"):
        try:
            posted_at = datetime.fromisoformat(raw["created"].replace("Z", "+00:00"))
        except Exception:
            pass

    location = raw.get("location", {}).get("display_name")
    remote = "remote" in (raw.get("title", "") + raw.get("description", "")).lower()
    bay_area_keywords = ["san francisco", "sf", "oakland", "berkeley", "san jose",
                         "palo alto", "mountain view", "sunnyvale", "santa clara",
                         "fremont", "hayward", "bay area", "south bay", "east bay"]
    bay_area = any(kw in (location or "").lower() for kw in bay_area_keywords)

    return {
        "external_id": _make_external_id(raw),
        "source": "adzuna",
        "title": raw.get("title", ""),
        "company": raw.get("company", {}).get("display_name", "Unknown"),
        "location": location,
        "remote": remote,
        "bay_area": bay_area,
        "description": raw.get("description", ""),
        "url": raw.get("redirect_url", ""),
        "salary_min": int(salary_min) if salary_min else None,
        "salary_max": int(salary_max) if salary_max else None,
        "posted_at": posted_at,
        "raw": raw,
    }


def fetch_jobs(keyword: str, where: str = "United States", page: int = 1, results_per_page: int = 50) -> list[dict]:
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "results_per_page": results_per_page,
        "what": keyword,
        "where": where,
        "max_days_old": 5,
    }

    try:
        response = httpx.get(f"{BASE_URL}/{page}", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        jobs = [_parse_job(job) for job in data.get("results", [])]
        logger.info(f"Adzuna: fetched {len(jobs)} jobs for '{keyword}' page {page}")
        return jobs
    except Exception as e:
        logger.error(f"Adzuna fetch failed for '{keyword}': {e}")
        return []


def fetch_all_jobs() -> list[dict]:
    all_jobs = []
    for keyword in KEYWORDS_USA:
        jobs = fetch_jobs(keyword, where="United States")
        all_jobs.extend(jobs)
    for keyword in KEYWORDS_BAY_AREA:
        for city in BAY_AREA_CITIES:
            jobs = fetch_jobs(keyword, where=city)
            all_jobs.extend(jobs)
    return all_jobs
