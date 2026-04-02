import anthropic
from app.core.config import settings
from app.models.jobs import Job

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

RESUME_SUMMARY = """
Ahmad Naggayev — Data Engineer / ML Engineer
- Production experience at Uber (data pipelines, KPI dashboards, compliance data)
- Built LoanMatch AI: FastAPI + pgvector + Claude API multi-agent system, live in production
- Built JobRadar: multi-agent job intelligence platform, 800+ jobs scored daily
- Stack: Python, dbt, Apache Airflow, Apache Kafka, Apache Flink, Apache Spark, BigQuery, PostgreSQL, pgvector, Docker, FastAPI
- Currently completing MS in Data Science (University of Bay Area) + DataTalks.Club DE Zoomcamp
- Based in Berkeley, CA — open to hybrid and remote roles in SF Bay Area
"""


def generate_cover_letter(job: Job) -> tuple[str, str]:
    """
    Generate a why-you-fit summary and cover letter for a job.
    Returns (why_fit_one_liner, cover_letter)
    """
    prompt = f"""You are writing on behalf of Ahmad Naggayev, a Data Engineer / ML Engineer.

CANDIDATE BACKGROUND:
{RESUME_SUMMARY}

JOB TO APPLY FOR:
Title: {job.title}
Company: {job.company}
Location: {job.location}
Description: {job.description[:1500] if job.description else 'Not provided'}

Write two things:

1. WHY FIT (one sentence, max 20 words): Why Ahmad specifically fits this role based on his actual stack matching the job requirements.

2. COVER LETTER (3 short paragraphs, max 150 words total):
- Paragraph 1: Hook — connect his specific experience to their specific need
- Paragraph 2: Most relevant project/achievement for this role
- Paragraph 3: Brief close — why this company, one sentence

Rules:
- Write in first person as Ahmad
- Be specific, no generic phrases like "passionate about data"
- Reference actual tools from the job description that Ahmad knows
- Keep it confident, direct, no fluff

Format your response exactly as:
WHY FIT: [one sentence]

COVER LETTER:
[three paragraphs]"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()

    # Parse response
    why_fit = ""
    cover_letter = ""

    if "WHY FIT:" in text and "COVER LETTER:" in text:
        parts = text.split("COVER LETTER:")
        why_fit = parts[0].replace("WHY FIT:", "").strip()
        cover_letter = parts[1].strip()
    else:
        why_fit = "Strong stack alignment with job requirements."
        cover_letter = text

    return why_fit, cover_letter
