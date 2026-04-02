# JobRadar Autofill — Usage Guide

## Daily Workflow (20 applications in ~1 hour)

1. Open Gmail — find today's JobRadar digest
2. Open all "Apply Now" links in new tabs
3. On each job page, follow the steps below

---

## Step-by-Step Per Application

### CRITICAL ORDER — do not reverse this

1. **Upload resume first** — drag AN_Resume.pdf onto the upload area
2. **Wait 2-3 seconds** — let the company's auto-parse finish (watch the form settle)
3. **Open console** — Cmd+Option+I
4. **Run autofill script** — Up arrow (reuses last command) → Enter
5. **Review filled fields** — check name, email, phone, LinkedIn are correct
6. **Upload resume again if needed** — some forms reset after autofill
7. **Submit**

### Why this order matters
If you run the script BEFORE uploading the resume, the company's auto-parser fires after and overwrites your clean data with its (often wrong) interpretation of the PDF. Always let the parser go first, then our script corrects anything it got wrong.

---

## First Time Setup (per Safari session)

Safari console history clears when you quit Safari. Each new session:

**Option A — Safari Snippet (recommended, works on all sites including Uber)**

1. Cmd+Option+I → Sources tab → Snippets (left panel)
2. Right-click → New Snippet → name it `autofill`
3. Go to: `https://raw.githubusercontent.com/ahmadavar/jobradar/master/autofill/uber-snippet.min.js`
4. Select All → Copy → paste into snippet → Cmd+S
5. On any application tab: Sources → Snippets → click `autofill` → press ▶ Run

**Option B — Console paste (non-Uber sites, smaller script)**

1. Open any job application page
2. Cmd+Option+I → Console tab
3. Go to: `https://raw.githubusercontent.com/ahmadavar/jobradar/master/autofill/bookmarklet.txt`
4. Select all (Cmd+A), copy (Cmd+C)
5. Paste into console → Enter
6. For every other tab after that: Up arrow → Enter

---

## Supported ATS Platforms

| Platform | Fields Filled |
|----------|--------------|
| Uber (uber.com/careers) | Name, email, phone, LinkedIn, GitHub, portfolio, experience, education, all radio buttons, EEO |
| Greenhouse (greenhouse.io) | Name, email, phone, LinkedIn, GitHub, website, EEO dropdowns |
| Lever (jobs.lever.co) | Name, email, phone, LinkedIn, GitHub |
| Ashby (ashbyhq.com) | Name, email, phone, LinkedIn |
| Workday (myworkday.com) | Name, email, phone, city, zip, country, state |
| Generic | Name, email, phone, LinkedIn, city (autocomplete fields) |

---

## Adding a New Company

When you hit "0 fields filled" on an unknown ATS:

1. Run in console:
```javascript
document.querySelectorAll('input, textarea, select').forEach(el => console.log(el.tagName + ' | name=' + el.name + ' | id=' + el.id + ' | placeholder=' + el.placeholder))
```
2. Paste output to Claude
3. Script updated and pushed in ~5 minutes
4. Get updated files from: `github.com/ahmadavar/jobradar/tree/master/autofill`

---

## Profile Data Stored in Script

- Name: Ahmad Naggayev
- Email: ahmadavar956@gmail.com
- Phone: (415) 812-1535
- Location: Berkeley, CA 94710
- LinkedIn: linkedin.com/in/ahmadnaggayev
- GitHub: github.com/ahmadavar
- Website: loanmatchai.app
- EEO: Male, White (Not Hispanic or Latino), No disability, Not a protected veteran, No sponsorship required

---

## vs Simplify / JobRight (Chrome Extensions)

| | JobRadar Autofill | Simplify / JobRight |
|--|--|--|
| Safari support | ✅ Yes | ❌ Chrome only |
| EEO fields (veteran, disability, race) | ✅ Fully filled | ❌ Skipped |
| Cover letter auto-paste | ✅ From clipboard | ❌ Not supported |
| Privacy | ✅ Runs locally, nothing uploaded | ❌ Resume sent to their servers |
| Cost | ✅ Free forever | ❌ $30/month for pro |
| Customizable | ✅ You own the code | ❌ No |
| One-click | ❌ Console required (2-3 steps) | ✅ Browser extension click |
| Application history tracking | ❌ Not yet | ✅ Built-in |
| ATS coverage out of the box | Growing (6 so far) | 500K+ users, battle-tested |

**Bottom line:** Use JobRadar autofill for EEO-heavy forms, Safari, and cover letter pasting. Simplify wins on convenience if you switch to Chrome. Long-term, JobRadar autofill will be embedded directly into the JobRadar dashboard as a proper extension.

---

## Cover Letter

The script reads your clipboard. Before running autofill:
- Copy the cover letter from the JobRadar email (Cmd+C)
- The script pastes it into the cover letter field automatically (where supported)
