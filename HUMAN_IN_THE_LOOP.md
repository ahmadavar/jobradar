# JobRadar — Human-in-the-Loop Design
> The last mile: how you go from AI output to submitted application in under 2 minutes

---

## Philosophy

Agents do everything up to the apply button.
You do: review (30s) → apply (1min) → log outcome (10s).
That's it.

---

## Build Order

```
Phase 3 (agents done) → Email digest with links     ← functional immediately
Phase 5 (frontend)    → Review queue UI             ← polish
Phase 6 (prod)        → PDF export + follow-up      ← professional
```

Start with email. It's 80% of the value, 20% of the work.

---

## Option 1: Email Digest (MVP — Build First)

Every morning, one email:

```
Subject: JobRadar Daily — 7 new matches (3 hot 🔥)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 93% — Senior Data Engineer @ Stripe
   Remote | $160-185K | Posted 2h ago
   Matched: dbt, Airflow, BigQuery, Python
   [View Cover Letter] [Open Job] [Skip]

🔥 87% — ML Data Engineer @ Coinbase
   NYC | $140-170K | Posted 5h ago
   Matched: Airflow, Spark, ML pipelines
   [View Cover Letter] [Open Job] [Skip]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 72% — Data Engineer @ Shopify
   Remote | $130-150K | Posted 1d ago
   [View Cover Letter] [Open Job] [Skip]
```

Each button is a unique link:
- `[View Cover Letter]` → simple webpage, generated letter, copy button
- `[Open Job]` → direct link to application page
- `[Skip]` → marks skipped in DB, never surfaces again

20 minutes/morning → 3-5 applications submitted.

---

## Option 2: Minimal Review Queue UI (Phase 5)

Not a full dashboard — just one page, a review queue:

```
┌─────────────────────────────────────────────┐
│  JobRadar Review Queue          7 pending   │
├─────────────────────────────────────────────┤
│ 🔥 93% Stripe — Senior Data Engineer        │
│    [Cover Letter ▼]  [Apply →]  [Skip ✕]   │
├─────────────────────────────────────────────┤
│ 🔥 87% Coinbase — ML Data Engineer          │
│    [Cover Letter ▼]  [Apply →]  [Skip ✕]   │
├─────────────────────────────────────────────┤
│ 🟡 72% Shopify — Data Engineer              │
│    [Cover Letter ▼]  [Apply →]  [Skip ✕]   │
└─────────────────────────────────────────────┘
```

- `[Cover Letter ▼]` → expands inline, editable before applying
- `[Apply →]` → opens job URL in new tab, auto-marks as "applied" in DB
- `[Skip ✕]` → gone forever

---

## Professional Features (Phase 6)

### One-Click Tailored Resume PDF
- Agent already rewrote your bullets for this specific job
- Button generates a PDF with your name + tailored content
- You upload that PDF directly to the application

### Smart Follow-Up Reminders
```
You applied to Stripe 7 days ago — no response.
[Send Follow-Up Email Draft] [Mark Closed]
```
Agent writes the follow-up email. You send it.

### Weekly Intelligence Report (auto-emailed Sundays)
```
Week 12 Summary
Applied: 23 | Responses: 4 | Response rate: 17%
Top performing skills: dbt, Airflow
Missing from rejections: Kubernetes, Terraform
Recommendation: Add a Kubernetes project this week
```

Skills gap from rejection patterns — something no other job tool does.

---

## What You Never Do
- Search for jobs manually
- Write cover letters from scratch
- Track applications in a spreadsheet
- Wonder what skills you're missing
- Follow up from memory
