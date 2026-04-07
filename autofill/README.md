# JobRadar Autofill

This folder contains the current autofill solution for the final step of the JobRadar pipeline: filling out ATS job application forms after receiving a matched job via email.

---

## The Problem

JobRadar automates everything up to the moment you click "Apply":

```
Job APIs → Ingestion → Embedding → Matching → Cover Letter → Email Digest → [YOU CLICK APPLY]
                                                                                       ↓
                                                              Company ATS portal (~35 manual fields)
```

Each ATS form requires the same ~35 fields every time: work history (multiple entries), education, personal summary, demographics, visa/work authorization status, contact info. Filling these manually takes 20–25 minutes per application.

---

## Current Solution — JavaScript Autofill Script

**Status: Working | Approach: Console script / Safari snippet**

A self-contained JavaScript script (`autofill.js`) that detects the ATS platform from the URL/DOM and fills the known fields from a hardcoded profile object.

### Supported Platforms

| Platform | Fields Filled |
|---|---|
| Workday (`myworkdayjobs.com`) | Name, email, phone, city, zip, country, state, cover letter |
| Greenhouse (`greenhouse.io`) | Name, email, phone, LinkedIn, GitHub, website, EEO dropdowns, cover letter |
| Lever (`jobs.lever.co`) | Name, email, phone, LinkedIn, GitHub, cover letter |
| Ashby (`ashbyhq.com`) | Name, email, phone, LinkedIn, cover letter |
| Uber (`uber.com/careers`) | Full form: all fields including work history entries, education, all radio buttons (visa, EEO, arbitration) |
| Generic fallback | Name, email, phone, LinkedIn, city (via `autocomplete` attributes) |

### How It Works

The script uses React-compatible DOM injection (bypasses `input.value =` which React ignores) by calling the native property setter and dispatching `input`, `change`, and `blur` events. This makes React-powered ATS portals (Greenhouse, Lever, Uber) actually register the filled values.

Cover letter is read from the clipboard — copy it from your JobRadar email before running the script.

### Known Limitations

- **CSP-blocked portals** — Custom in-house ATS portals at some large companies (Uber was eventually resolved with `uber-snippet.min.js`, but fully custom portals remain a challenge)
- **Console requirement** — Requires opening DevTools and pasting/running the script each session. Not one-click.
- **Static profile** — Profile data is hardcoded in the script. Changing jobs requires editing the file.
- **Multi-page wizard forms** — Some Workday implementations span 8+ pages; the script fills page 1 only

### Setup (Current)

**Safari Snippet (recommended — works on all sites):**

1. `Cmd+Option+I` → Sources tab → Snippets (left panel)
2. Right-click → New Snippet → name it `autofill`
3. Copy contents of `uber-snippet.min.js` → paste into snippet → `Cmd+S`
4. On any job application tab: Sources → Snippets → click `autofill` → press ▶ Run

**Console Paste (simpler, non-CSP-blocked sites):**

1. Open any job application page
2. `Cmd+Option+I` → Console tab
3. Copy contents of `autofill.js` → paste → Enter
4. For subsequent tabs: Up arrow → Enter

### Workflow Per Application

1. Upload resume first — let the company's parser run (2–3 seconds)
2. Run autofill script — it corrects anything the parser got wrong
3. Review filled fields — check name, email, phone, LinkedIn
4. Submit

> **Why upload first?** If you run the script before uploading, the company's parser fires after and overwrites your data. Always parse first, then autofill.

---

## Roadmap — What's Next

The current console script approach works but has friction. The planned evolution:

### Phase 6A — Profile Clipboard UI (Next.js, ~2 hrs)

A page in the JobRadar dashboard that displays all 35 standard fields as click-to-copy cards. No browser injection, zero CSP risk. Works on every portal including custom-built ones.

- ATS type detected from the job URL (`myworkdayjobs.com` → Workday, `greenhouse.io` → Greenhouse, etc.)
- JobRadar email digest will include an ATS tag per job so you know which strategy to use before clicking Apply
- One click to copy each field answer directly from the dashboard

### Phase 6B — Browser Extension (longer term)

Replace the console script with a proper Chrome/Firefox extension:

- One-click fill button injected on supported ATS portals
- Profile stored in extension storage (not hardcoded)
- Automatic cover letter paste from JobRadar's latest generated letter
- Works alongside or replaces the current script

### Fallback Strategy (Available Now)

For portals where no script can run (CSP-hardened custom ATS, Safari with strict policies):

**Raycast Snippets (Mac, free)** — 8 trigger phrases that expand to your full answers anywhere on screen:

| Trigger | Expands to |
|---|---|
| `;;visa` | "I am authorized to work in the US and do not require employer sponsorship." |
| `;;summary` | Your 3-sentence professional summary |
| `;;job1` | Most recent job: title, company, dates, bullet points |
| `;;job2` | Second job |
| `;;edu` | Degree, school, graduation year |
| `;;salary` | Your target range answer |
| `;;linkedin` | Your LinkedIn URL |
| `;;github` | Your GitHub URL |

Tab through the form, fire snippets — drops 25 min → 4–5 min even with no script running.

---

## Why Not Just Use Simplify / SpeedyApply?

| | JobRadar Autofill | Simplify / SpeedyApply |
|---|---|---|
| Safari support | ✅ Yes | ❌ Chrome only |
| EEO fields (veteran, disability, race) | ✅ Fully filled | ❌ Usually skipped |
| Cover letter auto-paste | ✅ From clipboard | ❌ Not supported |
| Privacy | ✅ Runs locally, nothing uploaded | ❌ Resume sent to their servers |
| Cost | ✅ Free | ❌ $8–30/month for pro |
| Customizable | ✅ You own the code | ❌ No |
| One-click UX | ❌ Console required | ✅ Extension click |
| ATS coverage | 6 platforms + generic | 100+ platforms, battle-tested |

**Recommended:** Use Simplify Copilot as a backup for its breadth, but rely on this script for EEO-heavy forms, cover letter injection, and Safari.

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

Claude will identify the field patterns and add a new platform block to `extension/content_script.js` in minutes.

### Step 3 — Pull and reload extension

```bash
cd ~/Downloads/jobradar-main && git pull origin main
```

Chrome → `chrome://extensions` → **↺** reload JobRadar.

---

### Platform status

| Platform | Status | Notes |
|---|---|---|
| Uber | ✅ Production | 42 fields, months via dropdown click |
| Greenhouse | ✅ Production | Label-based autocomplete, stable EEO IDs |
| Lever | ✅ Production | Label-based |
| Ashby | ✅ Production | Standard selectors |
| Workday | ✅ Production | data-automation-id based |
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
