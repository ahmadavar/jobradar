# JobRadar — AI-Powered Job Search Automation Platform
> *Your personal recruiter that never sleeps*

---

## Vision

JobRadar is a multi-agent AI platform that automates the entire job search pipeline —
from discovery to application-ready materials — while you focus on improving your skills.

**Positioning**: Production-grade AI platform (not a portfolio toy)
**Story**: Built to solve the founder's own job search problem, now serving job seekers at scale
**Target users**: Tech professionals in active job search
**Monetization**: Free tier (10 matches/day) + Pro $19/month (unlimited + priority alerts)

---

## What It Does

| Feature | Description |
|---|---|
| Job Ingestion | Pulls jobs from 4 APIs every 6 hours |
| Resume Matching | Embeds your resume + job descriptions, scores 0-100% |
| Smart Filtering | Only surfaces 60-70%+ matches |
| Application Prep | Generates tailored cover letter + resume bullets per job |
| Email Alerts | Sends digest of top matches daily |
| Application Log | Tracks every job: status, dates, notes, contacts |
| Analytics Dashboard | Match trends, pipeline health, response rates |
| dbt Models | Clean BigQuery warehouse for deep analytics |

**NOT included (by design):**
- Auto-apply (most ATS block bots, legal risk)
- Interview scheduling (requires human judgment)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                          │
│  Adzuna API → Airflow DAG → Raw PostgreSQL → dbt → BigQuery    │
│  JSearch API ↗                                                   │
│  Remotive API ↗                                                  │
│  USAJobs API ↗                                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                     AGENT LAYER (Multi-Agent)                   │
│                                                                  │
│  Orchestrator Agent                                              │
│       ├── Scraper Agent    (fetch + deduplicate jobs)           │
│       ├── Matcher Agent    (embed + score against resume)        │
│       ├── Writer Agent     (generate cover letter + bullets)     │
│       └── Notifier Agent   (email digest + dashboard update)    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  PostgreSQL (operational)  +  pgvector (embeddings)             │
│  BigQuery (analytics warehouse)                                  │
│  dbt (transformations + data quality)                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    FRONTEND LAYER                                │
│  Next.js 14 — Dashboard, Job List, Application Tracker          │
│  FastAPI — REST API backend                                      │
│  Prometheus + Grafana — system monitoring                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
- **FastAPI** — REST API, async
- **PostgreSQL** — operational database
- **pgvector** — resume + job embeddings
- **Redis** — job queue, caching

### AI / Agents
- **Claude Haiku** — matching, cover letter generation, resume tailoring
- **Claude Sonnet** — orchestrator decisions (reserved for complex reasoning)
- **text-embedding-3-small** — embeddings (OpenAI, cost-effective) OR Claude embeddings
- **Multi-agent pattern** — Orchestrator + 4 specialized agents

### Orchestration
- **Airflow** — scheduled DAGs (fetch every 6h, match every 6h, email daily)
- **Celery + Redis** — async task queue for agent jobs

### Data Warehouse
- **BigQuery** — analytics warehouse
- **dbt** — transformations, tests, lineage docs
- **dbt models**: stg_jobs, stg_applications, fct_matches, fct_pipeline_health

### Frontend
- **Next.js 14** — dashboard, job board, application tracker
- **Tailwind CSS** — styling
- **Recharts** — analytics charts

### Infrastructure
- **Docker + Docker Compose** — local dev
- **Railway** — deployment (backend + frontend)
- **GitHub Actions** — CI/CD
- **Prometheus + Grafana** — monitoring

### Notifications
- **SendGrid** — email digests (free tier: 100 emails/day)

---

## Database Schema

```sql
-- Jobs ingested from APIs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR UNIQUE,        -- API job ID
    source VARCHAR,                    -- adzuna, jsearch, remotive, usajobs
    title VARCHAR NOT NULL,
    company VARCHAR NOT NULL,
    location VARCHAR,
    remote BOOLEAN DEFAULT FALSE,
    description TEXT,
    url VARCHAR,
    salary_min INTEGER,
    salary_max INTEGER,
    posted_at TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT NOW(),
    embedding VECTOR(1536)             -- pgvector
);

-- Resume versions
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR,                   -- v1, v2, hybrid-de-ml
    content TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Match scores
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    resume_id UUID REFERENCES resumes(id),
    score FLOAT,                       -- 0.0 to 1.0
    matched_at TIMESTAMP DEFAULT NOW(),
    match_reasons JSONB                -- which skills matched
);

-- Application tracking
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    status VARCHAR DEFAULT 'queued',   -- queued, prep_ready, applied, response, rejected, offer
    cover_letter TEXT,
    tailored_bullets JSONB,
    applied_at TIMESTAMP,
    notes TEXT,
    contact_name VARCHAR,
    contact_email VARCHAR,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent run logs
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR,
    status VARCHAR,                    -- started, completed, failed
    jobs_fetched INTEGER,
    jobs_matched INTEGER,
    errors JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## Multi-Agent Design

### Orchestrator Agent
```
Role: Coordinator
Model: Claude Sonnet (reserved for decisions)
Triggers: Airflow DAG every 6 hours
Responsibilities:
  - Check which sources need refresh
  - Spawn Scraper Agent
  - When scraping done → spawn Matcher Agent
  - When matching done → spawn Writer Agent for top matches
  - When writing done → spawn Notifier Agent
  - Log run stats to agent_runs table
```

### Scraper Agent
```
Role: Job Fetcher
Model: Claude Haiku (simple reasoning)
Tools: Adzuna API, JSearch API, Remotive API, USAJobs API
Responsibilities:
  - Fetch jobs per configured keywords + locations
  - Deduplicate against existing jobs table
  - Clean + normalize fields
  - Insert to PostgreSQL
  - Checkpoint after each source (resumable)
```

### Matcher Agent
```
Role: Resume Matcher
Model: Claude Haiku + embeddings
Responsibilities:
  - Load active resume embedding from DB
  - Embed new job descriptions
  - Compute cosine similarity
  - Score 0-100, store in matches table
  - Flag jobs >= 65% as "top matches"
  - Extract matching skills per job (why it matched)
```

### Writer Agent
```
Role: Application Preparer
Model: Claude Sonnet (quality matters here)
Input: Top matched jobs (>= 65%)
Responsibilities:
  - Generate tailored cover letter per job
  - Rewrite resume bullets to match job keywords
  - Save to applications table (status: prep_ready)
  - You review + click apply manually
```

### Notifier Agent
```
Role: Alert Dispatcher
Model: None (no LLM needed)
Responsibilities:
  - Query top matches from last 24h
  - Format email digest (job title, company, score, prep status)
  - Send via SendGrid
  - Update dashboard data
```

---

## Airflow DAGs

```
DAG 1: job_ingestion (every 6 hours)
  └── fetch_adzuna >> fetch_jsearch >> fetch_remotive >> fetch_usajobs >> deduplicate

DAG 2: job_matching (every 6 hours, after ingestion)
  └── load_resume >> embed_new_jobs >> compute_scores >> flag_top_matches

DAG 3: application_prep (daily, 8am)
  └── get_top_matches >> generate_cover_letters >> generate_bullets >> update_status

DAG 4: daily_digest (daily, 9am)
  └── compile_matches >> send_email >> update_dashboard

DAG 5: dbt_refresh (daily, 10am)
  └── dbt run >> dbt test >> dbt docs generate
```

---

## dbt Models

```
models/
├── staging/
│   ├── stg_jobs.sql              -- clean raw jobs
│   ├── stg_applications.sql      -- clean application records
│   └── stg_matches.sql           -- clean match scores
├── marts/
│   ├── fct_matches.sql           -- fact: all matches with scores
│   ├── fct_applications.sql      -- fact: application pipeline
│   ├── fct_pipeline_health.sql   -- daily pipeline stats
│   └── dim_companies.sql         -- company dimension
└── reports/
    ├── rpt_top_matches.sql       -- daily top matches report
    └── rpt_response_rates.sql    -- offer/rejection analytics
```

---

## Frontend Pages (Next.js)

```
/ (Dashboard)
  - Active pipeline stats (applied, responses, offers)
  - Match score trend chart
  - Today's top matches

/jobs
  - Job list with match scores
  - Filter by score, remote, salary, date
  - Click → see generated cover letter + bullets

/applications
  - Kanban board: Queued → Prep Ready → Applied → Response → Offer
  - Notes, contacts, follow-up dates

/analytics
  - Match rate over time
  - Skills gap analysis (what skills keep appearing in missed jobs)
  - Source performance (which API sends best matches)

/settings
  - Resume upload/update
  - Keywords config
  - Match threshold (default 65%)
  - Email preferences
```

---

## Project Folder Structure

```
jobradar/
├── backend/
│   ├── app/
│   │   ├── api/          -- FastAPI routes
│   │   ├── agents/       -- orchestrator, scraper, matcher, writer, notifier
│   │   ├── models/       -- SQLAlchemy models
│   │   ├── services/     -- job APIs, email, embeddings
│   │   └── core/         -- config, database, security
│   └── Dockerfile
├── airflow/
│   ├── dags/             -- 5 DAGs above
│   └── Dockerfile
├── dbt/
│   ├── models/           -- staging, marts, reports
│   ├── tests/
│   └── dbt_project.yml
├── frontend/
│   ├── app/              -- Next.js 14 app router
│   ├── components/
│   └── Dockerfile
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Build Phases

### Phase 1 — Data Foundation (Days 1-3)
- [ ] PostgreSQL schema + migrations
- [ ] Adzuna + Remotive API integration (free, no approval)
- [ ] Basic Airflow DAG: fetch + store
- [ ] Verify data flowing

### Phase 2 — Matching Engine (Days 4-6)
- [ ] Resume upload + embedding
- [ ] Job embedding pipeline
- [ ] Cosine similarity scoring
- [ ] Match threshold filtering

### Phase 3 — Agent Layer (Days 7-10)
- [ ] Orchestrator Agent
- [ ] Scraper Agent (wraps Phase 1)
- [ ] Matcher Agent (wraps Phase 2)
- [ ] Writer Agent (cover letters + bullets)
- [ ] Notifier Agent (email digest)

### Phase 4 — dbt + BigQuery (Days 11-13)
- [ ] Sync PostgreSQL → BigQuery
- [ ] dbt staging models
- [ ] dbt mart models
- [ ] dbt tests + docs

### Phase 5 — Frontend (Days 14-17)
- [ ] Dashboard page
- [ ] Jobs list + match scores
- [ ] Application kanban
- [ ] Analytics charts

### Phase 6 — Production (Days 18-20)
- [ ] Docker + Railway deployment
- [ ] GitHub Actions CI/CD
- [ ] Prometheus + Grafana monitoring
- [ ] README + screenshots

---

## Resume Positioning

```
JobRadar — AI Job Search Platform (Founder & Lead Engineer)
2026 - Present

- Built multi-agent AI system processing 500+ job listings daily across 4 APIs
- Designed embedding-based matching engine achieving 68% precision on role alignment
- Orchestrated 5 Airflow DAGs for end-to-end pipeline from ingestion to notification
- Modeled analytics warehouse in BigQuery with dbt (staging → marts → reports)
- Deployed full-stack platform (FastAPI + Next.js) on Railway with CI/CD via GitHub Actions
- Integrated Claude AI agents for automated cover letter and resume tailoring per role

Stack: Python, FastAPI, PostgreSQL, pgvector, Airflow, dbt, BigQuery, Next.js, Claude AI,
       Docker, Railway, Prometheus, Grafana, SendGrid
```

---

## Why This Is 3x LoanMatch

| | LoanMatch | JobRadar |
|---|---|---|
| Data | Synthetic (52 lenders) | Real (500+ jobs/day) |
| Agents | 1 (chat) | 5 (orchestrated pipeline) |
| Orchestration | None | Airflow DAGs |
| Warehouse | None | BigQuery + dbt |
| Monitoring | None | Prometheus + Grafana |
| Users | Demo only | You + real users |
| Story | "I built this" | "I use this daily" |
