# JobRadar — AI-Powered Job Search Platform

> *Your personal recruiter that never sleeps*

A multi-agent AI platform that automates the entire job search pipeline — from discovery to application-ready materials — while you focus on improving your skills.

**Live stack:** FastAPI · PostgreSQL · pgvector · Airflow · dbt · BigQuery · Next.js · Claude AI · Railway · Prometheus

---

## What It Does

| Feature | Status |
|---|---|
| Job ingestion from Adzuna + JSearch (LinkedIn/Indeed) | ✅ Live — 650+ jobs/run |
| Bay Area + USA filtering | ✅ Live |
| Deduplication across sources | ✅ Live |
| Resume embedding + job scoring (0-100%) | 🔄 Phase 2 |
| Cover letter + resume bullet generation | 🔄 Phase 3 |
| Daily email digest of top matches | 🔄 Phase 3 |
| Application tracker (Kanban) | 🔄 Phase 5 |
| Analytics dashboard (Next.js) | 🔄 Phase 5 |
| BigQuery warehouse + dbt models | 🔄 Phase 4 |

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
│  Orchestrator (Sonnet)                              │
│    ├── Scraper Agent   — fetch + deduplicate        │
│    ├── Matcher Agent   — embed + score vs resume    │
│    ├── Writer Agent    — cover letters + bullets    │
│    └── Notifier Agent  — email digest               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  DATA LAYER                         │
│  PostgreSQL (operational) + pgvector (embeddings)   │
│  BigQuery (analytics warehouse)                     │
│  dbt (staging → marts → reports)                    │
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
| Warehouse | BigQuery + dbt |
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
| 2 — Matching Engine | Resume embedding, job scoring, cosine similarity | 🔄 Next |
| 3 — Agent Layer | 5 agents: Orchestrator, Scraper, Matcher, Writer, Notifier | ⬜ Planned |
| 4 — dbt + BigQuery | Analytics warehouse, staging + mart models | ⬜ Planned |
| 5 — Frontend | Dashboard, job list, application kanban, analytics | ⬜ Planned |
| 6 — Production | Railway deployment, CI/CD, monitoring | ⬜ Planned |

---

## Data Sources

| API | Coverage | Cost | Limit |
|---|---|---|---|
| Adzuna | USA, city-by-city Bay Area | Free | 250 calls/day |
| JSearch (RapidAPI) | LinkedIn + Indeed + Glassdoor | Free tier | 200 req/month |

Current ingestion: **650+ unique jobs per run**, **370+ Bay Area jobs**, last 15 days only.

---

## Why This Project

Built to solve a real problem: automating the repetitive parts of a job search while keeping humans in control of the decisions that matter (which jobs to apply to, what to say).

**NOT included by design:**
- Auto-apply (ATS blocks bots, legal risk)
- Interview scheduling (requires human judgment)

*Built by Ahmad Naggayev — [linkedin.com/in/ahmadnaggayev](https://linkedin.com/in/ahmadnaggayev)*
