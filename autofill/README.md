# JobRadar Autofill

This folder contains the autofill solution for the final step of the JobRadar pipeline: filling out job application forms after receiving a matched job via email.

> **ATS = Applicant Tracking System** — the software companies use to manage job applications. Every "Apply" button leads to one. Workday, Greenhouse, Lever, Uber Careers — these are all ATS portals. They all ask the same ~35 fields every time.

---

## The Problem

JobRadar automates everything up to the moment you click "Apply":

```
Job APIs → Ingestion → Embedding → Matching → Cover Letter → Email Digest → [YOU CLICK APPLY]
                                                                                       ↓
                                                              Company ATS portal (~35 manual fields)
```

Each ATS form asks the same data repeatedly: name, contact, work history, education, demographics, visa status. Filling manually takes 20–25 minutes per application.

---

## Current Solution — Chrome Extension ✅ SHIPPED

**Status: Production | Version: 1.0 | Fields filled: 40–42 on Uber, 20+ on Greenhouse**

A Chrome extension (`extension/`) that detects the ATS platform from the URL and fills all known fields with one click. No DevTools, no console, no pasting — just click the green JobRadar icon in the toolbar.

### How to install

1. Download or `git pull` this repo to your Mac
2. Chrome → `chrome://extensions` → **Developer mode ON**
3. **Load unpacked** → select the `extension/` folder
4. Green JobRadar icon appears in your toolbar

### How to update after a fix is pushed

```bash
cd ~/Downloads/jobradar-main && git pull origin main
```

Chrome → `chrome://extensions` → **↺** reload JobRadar. No reinstall needed.

### Workflow per application

1. Open job application page
2. Upload your resume — wait 2–3 seconds for their parser to run
3. Copy your cover letter from the JobRadar email digest
4. Click the green **JobRadar** icon → **⚡ Fill This Form**
5. Review, fix anything missed, submit

---

## Achievements — From Safari Console to CSP-Proof Extension

### Where we started
- Manually pasting `autofill.js` into the Safari DevTools console
- Safari Snippets crashed on load (restricted execution context)
- Uber's CSP blocked inline scripts entirely
- 20–25 minutes per application, every time

### What we built

| Milestone | Result |
|---|---|
| Safari console paste | ✅ Worked for ~20 fields on non-CSP sites |
| Safari Snippets | ❌ Crashed — Safari's snippet context can't access React internals |
| Uber CSP bypass via `uber-snippet.min.js` | ⚠️ Partial — worked early page load only |
| **Chrome extension (content scripts)** | ✅ **CSP-proof — injected at browser level, no page can block it** |
| Uber full form — 42 fields | ✅ Work history, education, EEO, radio buttons, months via dropdown click |
| Greenhouse — label-based autocomplete | ✅ Works across all companies using Greenhouse, not just one |
| Years filled after months | ✅ Fixed React state bug — years no longer cleared when months commit |
| No duplicate experience slots | ✅ Counts existing slots before adding new ones |
| Cover letter auto-paste from clipboard | ✅ Copy from email, extension pastes it automatically |

### Why the Chrome extension beats everything else

| | Chrome Extension (ours) | Safari Console Paste | Simplify Copilot |
|---|---|---|---|
| CSP-proof | ✅ Always | ❌ Blocked on Uber, others | ✅ Yes |
| EEO fields (race, disability, veteran) | ✅ Fully filled | ✅ Fully filled | ❌ Usually skipped |
| Cover letter auto-paste | ✅ From clipboard | ✅ From clipboard | ❌ Not supported |
| Work history (multiple entries) | ✅ All 4 jobs + dates | ✅ All 4 jobs + dates | ❌ Not supported |
| One-click UX | ✅ Toolbar button | ❌ DevTools required | ✅ Extension click |
| Privacy | ✅ Runs locally | ✅ Runs locally | ❌ Resume sent to servers |
| Cost | ✅ Free | ✅ Free | ❌ $8–30/month |
| Safari support | ❌ Chrome only | ✅ Yes | ❌ Chrome only |

---

## Supported Platforms

| Platform | Status | Fields |
|---|---|---|
| Uber (`uber.com/careers`) | ✅ Production | 42 — full form including work history, education, EEO, months |
| Greenhouse (`greenhouse.io`) | ✅ Production | 20+ — label-based, works on any company using Greenhouse |
| Lever (`jobs.lever.co`) | ✅ Production | Name, contact, LinkedIn, EEO dropdowns |
| Ashby (`ashbyhq.com`) | ✅ Production | Name, contact, LinkedIn |
| Workday (`myworkday.com`) | ✅ Production | Name, contact, city, zip, cover letter |
| LinkedIn Easy Apply | 🔜 Next | Needs diagnostic run |
| iCIMS | 🔜 Next | Needs diagnostic run |
| SmartRecruiters | 🔜 Next | Needs diagnostic run |
| Jobvite | 🔜 Backlog | |
| Taleo / Oracle | 🔜 Backlog | |
| Workable | 🔜 Backlog | |
| BambooHR | 🔜 Backlog | |
| Rippling ATS | 🔜 Backlog | |
| Wellfound | 🔜 Backlog | |
| Indeed Apply | 🔜 Backlog | |

---

## Adding a New ATS

### Step 1 — Run the diagnostic in Chrome Console (`Cmd+Option+J`)

Open the job application page, type `allow pasting`, then paste this single line:

```javascript
document.querySelectorAll('input,textarea,select').forEach(el=>{const l=document.querySelector(`label[for="${el.id}"]`)||el.closest('div,li,section')?.querySelector('label,[class*="label"],[class*="question"]');const opts=el.tagName==='SELECT'?Array.from(el.options).map(o=>o.text.trim()).filter(t=>t).slice(0,5).join(' / '):'';console.log(el.tagName+'|'+el.type+'|id='+el.id+'|name='+el.name+'|ph='+el.placeholder+'|label='+(l?.textContent?.trim()?.slice(0,60)||'')+'|opts='+opts)})
```

**What it shows:**
- `INPUT|text|id=first_name` → standard text input, fill by ID
- `INPUT|text|id=question_123|label=LinkedIn Profile` → custom question, fill by label
- `SELECT|...|opts=Yes / No / Prefer not to say` → standard select dropdown
- `INPUT|text|id=gender|label=Gender` → autocomplete dropdown (Greenhouse style)

### Step 2 — Paste output to Claude with the ATS name

Claude identifies the field patterns and adds a new platform block to `extension/content_script.js` in minutes.

### Step 3 — Pull and reload extension

```bash
cd ~/Downloads/jobradar-main && git pull origin main
```

Chrome → `chrome://extensions` → **↺** reload JobRadar.
