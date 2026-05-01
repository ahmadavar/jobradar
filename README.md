# JobRadar — AI-Powered Job Search Platform

> *From job posting to submitted application in under 3 minutes.*

JobRadar is a multi-agent AI platform that automates every step of the job search pipeline — discovery, scoring, cover letter writing, and form filling — so you spend your time applying, not preparing.

**Live stack:** FastAPI · PostgreSQL · pgvector · Claude AI · Chrome Extension · Railway

---

## What It Does

```
Job APIs (Adzuna + JSearch)
        │
        ▼
Ingestion + Deduplication (650+ jobs/run)
        │
        ▼
Resume Embedding + Cosine Similarity Scoring
        │
        ▼
Cover Letter + "Why You Fit" — generated per job, per resume
        │
        ▼
Daily Email Digest — top 50 matches, grouped by ATS platform
        │
        ▼
One click → Company ATS directly (no Dice, no LinkedIn, no middlemen)
        │
        ▼
Chrome Extension — autofills 40+ fields in one click
        │
        ▼
You review, fix anything missed, submit
```

No auto-submit. No bots. You stay in control of every submission.

---

## Shipped Features

| Feature | Status | Detail |
|---|---|---|
| Job ingestion — Adzuna + JSearch | ✅ Live | 650+ jobs/run, deduped across sources |
| Bay Area + USA geo filtering | ✅ Live | City-by-city targeting |
| Resume embedding + job scoring | ✅ Live | Cosine similarity, 0–100% match |
| Cover letter generation | ✅ Live | Claude AI, tailored per job |
| "Why You Fit" summary | ✅ Live | One sentence, top of each card |
| Daily email digest — top 50 | ✅ Live | Grouped by ATS platform |
| Dual apply buttons | ✅ Live | "Apply Now" (original API link) + "Find Direct Link" (Google search: Role at Company) |
| ATS platform detection + grouping | ✅ Live | Greenhouse · Lever · Workday · Uber · Ashby · iCIMS · more |
| Chrome extension autofill | ✅ Live | 40+ fields, one click, CSP-proof |
| Uber Careers — full form | ✅ Live | Work history, education, EEO, months/years |
| Greenhouse — full form | ✅ Live | Label-based, works on any company using Greenhouse |
| Lever, Ashby, Workday | ✅ Live | Name, contact, LinkedIn, cover letter |

---

## The Email Digest

Each morning you receive one email containing your top 50 matches. Jobs are grouped by ATS platform so you can batch-apply platform by platform without context switching.

Each card contains:
- **Role + company + location + salary range**
- **Match % badge** — scored against your resume
- **Why You Fit** — one sentence, pre-written
- **Cover letter** — ready to copy and paste
- **Apply Now** (blue) — original job board link from the API, one click to the listing
- **Find Direct Link** (orange) — Google search pre-filled with `Role at Company`, lands on the company's own ATS in one click

Target: **1 hour, 20 applications submitted.**

---

## The Chrome Extension

After clicking Apply, the JobRadar extension fills the entire form with one click.

**How it works:**
1. Open job application page
2. Upload your resume — wait 2–3 seconds for their parser to run
3. Copy your cover letter from the email
4. Click the green **JobRadar** icon → **⚡ Fill This Form**
5. Review, fix anything missed, submit

**What it fills:** Name, contact, location, LinkedIn, work history (4 jobs + dates), education, EEO fields (race, disability, veteran status), cover letter from clipboard.

**Why it beats Simplify Copilot:**

| | JobRadar Extension | Simplify Copilot |
|---|---|---|
| CSP-proof (Uber, others) | ✅ | ✅ |
| EEO fields | ✅ Fully filled | ❌ Usually skipped |
| Work history (multiple jobs + dates) | ✅ All 4 jobs | ❌ Not supported |
| Cover letter auto-paste | ✅ From clipboard | ❌ Not supported |
| Privacy | ✅ Runs locally | ❌ Resume sent to servers |
| Cost | ✅ Free | ❌ $8–30/month |

---

## Supported ATS Platforms

| Platform | Status | Fields |
|---|---|---|
| Uber (`uber.com/careers`) | ✅ Production | 42 — full form |
| Greenhouse (`greenhouse.io`) | ✅ Production | 20+ — any company using Greenhouse |
| Lever (`jobs.lever.co`) | ✅ Production | Name, contact, LinkedIn, EEO |
| Ashby (`ashbyhq.com`) | ✅ Production | Name, contact, LinkedIn |
| Workday (`myworkday.com`) | ✅ Production | Name, contact, city, zip, cover letter |
| LinkedIn Easy Apply | 🔜 Next | |
| iCIMS | 🔜 Next | |
| SmartRecruiters | 🔜 Next | |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  INGESTION LAYER                    │
│  Adzuna API ──┐                                     │
│               ├──► PostgreSQL + pgvector            │
│  JSearch API ─┘    (URL resolution at ingest)       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               AGENT LAYER (Multi-Agent)             │
│  Orchestrator (Claude Sonnet)                       │
│    ├── Scraper Agent   — fetch + deduplicate        │
│    ├── Matcher Agent   — embed + score vs resume    │
│    ├── Writer Agent    — cover letters + summaries  │
│    └── Notifier Agent  — daily email digest         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  DATA LAYER                         │
│  PostgreSQL (operational) + pgvector (embeddings)   │
│  5-day rolling window — jobs older than 5 days      │
│  are purged daily                                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               APPLICATION LAYER                     │
│  Chrome Extension (Manifest V3)                     │
│  content_script.js — injected at browser level      │
│  CSP-proof: no page can block it                    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 16, pgvector |
| Job APIs | Adzuna, JSearch (RapidAPI) |
| AI / Agents | Claude Sonnet (orchestrator + writer), text-embedding-3-small |
| Browser Extension | Chrome Manifest V3, content scripts |
| Infrastructure | Docker, Railway |
| Notifications | Gmail SMTP |

---

## Project Structure

```
jobradar/
├── backend/
│   ├── app/
│   │   ├── agents/          # orchestrator, scraper, matcher, writer, notifier
│   │   ├── core/            # config, database connection
│   │   ├── models/          # SQLAlchemy models (Job, Resume)
│   │   └── services/        # adzuna.py, jsearch.py, ingest.py, match.py,
│   │                        # notify.py, embed.py, writer.py
│   ├── score.py             # run scoring + send digest (daily entrypoint)
│   ├── cleanup.py           # purge jobs older than 5 days
│   └── requirements.txt
├── extension/
│   ├── manifest.json        # Chrome Manifest V3
│   ├── content_script.js    # autofill logic — all ATS platforms
│   ├── popup.html           # extension UI
│   └── popup.js             # message passing + fallback injection
├── autofill/
│   └── README.md            # technical reference for adding new ATS platforms
└── README.md
```

---

## Database Schema

```sql
jobs (id, external_id, source, title, company, location, remote,
      bay_area, description, url, salary_min, salary_max,
      posted_at, ingested_at, raw)

resumes (id, version, content, embedding, created_at)
```

---

## Quickstart

```bash
git clone https://github.com/ahmadavar/jobradar.git
cd jobradar/backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# configure .env with API keys (see .env.example)

# run ingestion
.venv/bin/python3 -m app.services.ingest

# score + send digest
.venv/bin/python3 score.py

# daily cleanup
.venv/bin/python3 cleanup.py
```

**Chrome extension:** `chrome://extensions` → Developer mode ON → Load unpacked → select `extension/`

---

## What's Not Included by Design

- **Auto-submit** — ATS platforms actively block bots; legal and ethical risk
- **Interview scheduling** — requires human judgment
- **Resume generation** — you know your own story better than any model

---

*Built by Ahmad Naggayev — [linkedin.com/in/ahmadnaggayev](https://linkedin.com/in/ahmadnaggayev)*
