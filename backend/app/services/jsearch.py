import logging
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://jsearch.p.rapidapi.com/search"

HEADERS = {
    "x-rapidapi-host": "jsearch.p.rapidapi.com",
    "x-rapidapi-key": settings.JSEARCH_API_KEY,
    "Content-Type": "application/json",
}

KEYWORDS_USA = [
    "data engineer",
    "analytics engineer",
    "data platform engineer",
]

KEYWORDS_BAY_AREA = [
    "data scientist",
    "data engineer",
]


def _parse_job(raw: dict) -> dict:
    posted_at = None
    if raw.get("job_posted_at_datetime_utc"):
        try:
            posted_at = datetime.fromisoformat(
                raw["job_posted_at_datetime_utc"].replace("Z", "+00:00")
            )
        except Exception:
            pass

    remote = raw.get("job_is_remote", False)
    location_parts = [raw.get("job_city"), raw.get("job_state"), raw.get("job_country")]
    location = ", ".join(p for p in location_parts if p)
    bay_area_keywords = ["san francisco", "sf", "oakland", "berkeley", "san jose",
                         "palo alto", "mountain view", "sunnyvale", "santa clara",
                         "fremont", "hayward", "bay area", "south bay", "east bay"]
    bay_area = any(kw in location.lower() for kw in bay_area_keywords)

    return {
        "external_id": f"jsearch_{raw.get('job_id', '')}",
        "source": "jsearch",
        "title": raw.get("job_title", ""),
        "company": raw.get("employer_name", "Unknown"),
        "location": location,
        "remote": remote,
        "bay_area": bay_area,
        "description": raw.get("job_description", ""),
        "url": raw.get("job_apply_link", ""),
        "salary_min": raw.get("job_min_salary"),
        "salary_max": raw.get("job_max_salary"),
        "posted_at": posted_at,
        "raw": raw,
    }


def fetch_jobs(keyword: str, location: str = "United States", page: int = 1) -> list[dict]:
    params = {
        "query": f"{keyword} jobs in {location}",
        "page": page,
        "num_pages": 1,
        "country": "us",
        "date_posted": "week",
    }

    try:
        response = httpx.get(BASE_URL, headers=HEADERS, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        jobs = [_parse_job(job) for job in data.get("data", [])]
        logger.info(f"JSearch: fetched {len(jobs)} jobs for '{keyword}'")
        return jobs
    except Exception as e:
        logger.error(f"JSearch fetch failed for '{keyword}': {e}")
        return []


def fetch_all_jobs() -> list[dict]:
    all_jobs = []
    for keyword in KEYWORDS_USA:
        jobs = fetch_jobs(keyword, location="United States")
        all_jobs.extend(jobs)
    for keyword in KEYWORDS_BAY_AREA:
        jobs = fetch_jobs(keyword, location="San Francisco Bay Area")
        all_jobs.extend(jobs)
    return all_jobs
