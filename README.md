# JobRadar — AI-Powered Job Search Platform

> *Your personal recruiter that never sleeps*

A multi-agent AI platform that automates the full job search pipeline — from discovery to application-ready materials — while you focus on the work that matters.

**Live stack:** FastAPI · PostgreSQL · pgvector · Airflow · dbt · BigQuery · Next.js · Claude AI · Railway · Prometheus

---

## What's Been Built

| Feature | Status |
|---|---|
| Job ingestion from Adzuna + JSearch (LinkedIn/Indeed) | ✅ Live — 650+ jobs/run |
| Bay Area + USA geo filtering | ✅ Live |
| Deduplication across sources | ✅ Live |
| Resume embedding + job scoring (cosine similarity, 0–100%) | ✅ Live |
| Cover letter generation (Claude AI, per job) | ✅ Live |
| Daily email digest of top matches | ✅ Live |
| Autofill script (Workday, Greenhouse, Lever, Ashby, Uber) | ✅ Live — [see autofill/](autofill/) |
| Application tracker (Kanban board) | 🔄 Phase 5 |
| Analytics dashboard (Next.js) | 🔄 Phase 5 |
| BigQuery warehouse + dbt models | 🔄 Phase 4 |
| Browser extension (replace console script) | 🔄 Phase 6 |
| ATS type detection in email notification | 🔄 Phase 6 |
| Profile Clipboard UI (click-to-copy all 35 fields) | 🔄 Phase 6 |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  INGESTION LAYER                    │
│  Adzuna API ──┐                                     │
│               ├──► Airflow DAG ──► PostgreSQL       │
│  JSearch API ─┘    (every 6h)      + pgvector       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               AGENT LAYER (Multi-Agent)             │
│  Orchestrator (Claude Sonnet)                       │
│    ├── Scraper Agent   — fetch + deduplicate        │
│    ├── Matcher Agent   — embed + score vs resume    │
│    ├── Writer Agent    — cover letters + bullets    │
│    └── Notifier Agent  — daily email digest         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  DATA LAYER                         │
│  PostgreSQL (operational) + pgvector (embeddings)   │
│  BigQuery (analytics warehouse) — planned           │
│  dbt (staging → marts → reports) — planned          │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                FRONTEND LAYER                       │
│  Next.js 14 — Dashboard · Jobs · Tracker            │
│  FastAPI — REST API                                 │
│  Prometheus + Grafana — monitoring                  │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 16, pgvector |
| Job APIs | Adzuna, JSearch (RapidAPI) |
| AI / Agents | Claude Sonnet (orchestrator), Claude Haiku (matching, writing) |
| Embeddings | pgvector + text-embedding-3-small |
| Orchestration | Apache Airflow |
| Warehouse | BigQuery + dbt (planned) |
| Frontend | Next.js 14, Tailwind CSS |
| Infrastructure | Docker, Railway, GitHub Actions |
| Monitoring | Prometheus, Grafana |
| Notifications | SendGrid |

---

## Project Structure

```
jobradar/
├── backend/
│   ├── app/
│   │   ├── agents/          # orchestrator, scraper, matcher, writer, notifier
│   │   ├── core/            # config, database connection
│   │   ├── models/          # SQLAlchemy models
│   │   └── services/        # adzuna.py, jsearch.py, ingest.py
│   └── requirements.txt
├── airflow/
│   └── dags/                # 5 DAGs: ingestion, matching, prep, digest, dbt
├── autofill/
│   ├── autofill.js          # ATS autofill script (Workday, Greenhouse, Lever, Ashby, Uber)
│   ├── uber-snippet.min.js  # Minified version for Safari snippets
│   └── README.md            # Setup guide + roadmap
├── dbt/
│   └── models/              # staging, marts, reports
├── frontend/
│   └── app/                 # Next.js 14 app router
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Database Schema

```sql
-- Jobs ingested from APIs
jobs (id, external_id, source, title, company, location, remote,
      bay_area, description, url, salary_min, salary_max,
      posted_at, ingested_at, raw)

-- Resume versions
resumes (id, version, content, embedding, created_at)

-- Match scores
matches (id, job_id, resume_id, score, matched_at, match_reasons)

-- Application tracking
applications (id, job_id, status, cover_letter, tailored_bullets,
              applied_at, notes, contact_name, follow_up_date)

-- Agent run logs
agent_runs (id, agent_name, status, jobs_fetched, jobs_matched,
            errors, started_at, completed_at)
```

---

## Quickstart

```bash
# 1. Clone and configure
git clone https://github.com/ahmadavar/jobradar.git
cd jobradar
cp .env.example .env
# Fill in API keys in .env

# 2. Start infrastructure
docker compose up -d

# 3. Install dependencies
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# 4. Create tables
.venv/bin/python3 -c "
from app.core.database import Base, engine
from app.models.jobs import Job
Base.metadata.create_all(bind=engine)
"

# 5. Run first ingestion
.venv/bin/python3 -m app.services.ingest
```

---

## Build Phases

| Phase | Description | Status |
|---|---|---|
| 1 — Data Foundation | PostgreSQL schema, Adzuna + JSearch APIs, ingestion pipeline | ✅ Complete |
| 2 — Matching Engine | Resume embedding, job scoring, cosine similarity | ✅ Complete |
| 3 — Agent Layer | 5 agents: Orchestrator, Scraper, Matcher, Writer, Notifier | ✅ Complete |
| 4 — dbt + BigQuery | Analytics warehouse, staging + mart models | 🔄 Planned |
| 5 — Frontend | Dashboard, job list, application kanban, analytics | 🔄 Planned |
| 6 — Application Submission | Browser extension, ATS detection, Profile Clipboard UI | 🔄 Planned |

---

## Data Sources

| API | Coverage | Cost | Limit |
|---|---|---|---|
| Adzuna | USA, city-by-city Bay Area | Free | 250 calls/day |
| JSearch (RapidAPI) | LinkedIn + Indeed + Glassdoor | Free tier | 200 req/month |

Current ingestion: **650+ unique jobs per run**, **370+ Bay Area jobs**, last 15 days only.

---

## Why This Project

Built to solve a real problem: automating the repetitive parts of a job search while keeping humans in control of the decisions that matter.

The pipeline handles discovery → scoring → writing → delivery. The remaining bottleneck — filling out ATS application forms — is addressed in [autofill/](autofill/) with a current script-based approach and a roadmap toward a full browser extension.

**NOT included by design:**
- Auto-submit (ATS platforms actively block bots, legal/ethical risk)
- Interview scheduling (requires human judgment)

*Built by Ahmad Naggayev — [linkedin.com/in/ahmadnaggayev](https://linkedin.com/in/ahmadnaggayev)*
