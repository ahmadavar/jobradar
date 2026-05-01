# JobRadar Autofill — Technical Reference

The Chrome extension (`extension/`) fills ATS application forms in one click after the user uploads their resume and copies their cover letter from the email digest.

---

## How It Works

**Architecture:** Chrome Manifest V3 content script, injected at the browser level (`document_idle`). Because it runs as a browser extension — not as page JavaScript — it is fully CSP-proof. No ATS site can block it.

**Flow:**
1. User opens a job application page
2. User uploads resume, waits 2–3 seconds for the ATS parser to run
3. User copies cover letter from the JobRadar email
4. User clicks the green JobRadar icon → **⚡ Fill This Form**
5. `popup.js` sends `{action: "fill"}` to `content_script.js`
6. `content_script.js` detects the ATS from the URL, calls the matching `fill<ATS>()` function
7. Fields are filled; response returns `{filled: N, ats: "..."}` to popup
8. Popup shows confirmation: `✅ 41 fields filled on Uber`

---

## Key Files

| File | Purpose |
|---|---|
| `extension/manifest.json` | Manifest V3 declaration, host permissions, content script registration |
| `extension/content_script.js` | All autofill logic — profile data, helper functions, per-ATS fill functions |
| `extension/popup.html` | Extension UI (toolbar button) |
| `extension/popup.js` | Triggers fill, handles fallback injection for pre-existing tabs, shows result |

---

## Profile Data

All personal data lives in the `profile` object at the top of `content_script.js`. Update this object when personal details change — no other file needs to change.

```javascript
const profile = {
  firstName: "Ahmad",
  lastName: "Avarseji",
  email: "...",
  phone: "...",
  linkedin: "https://linkedin.com/in/ahmadnaggayev",
  city: "Berkeley", state: "CA", zip: "94704",
  // work history, education, EEO answers ...
};
```

---

## Helper Functions

| Function | What it does |
|---|---|
| `fill(el, value)` | React-compatible fill — uses native property setter + dispatches `input`, `change`, `blur` events |
| `fillAutocomplete(el, value)` | For custom React dropdown inputs — focuses, sets value, waits, clicks matching `[role="option"]` |
| `fillAutocompleteByLabel(labelText, value)` | Finds input by label text, then calls `fillAutocomplete` |
| `fillSelectByLabel(labelText, optionText)` | For native `<select>` elements found by label |
| `fillInputByLabel(labelText, value)` | For plain text inputs found by label |
| `fillMonth(el, value)` | Handles both `<select>` and React autocomplete month fields |
| `fillMonthDropdown(el, value)` | Opens month dropdown, clicks matching `[role="option"]` |
| `fillMonthByName(prefix, value)` | Name-attribute-based month selector (Uber experience/education entries) |

**Critical detail — React state:** Setting `element.value = x` alone does not update React's internal state. `fill()` uses the native property setter to bypass React's synthetic event system:
```javascript
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
nativeSetter.call(el, value);
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
```

---

## Per-ATS Fill Functions

### Uber (`fillUber`)

Uber is the most complex — React-driven form with dynamic work history slots, custom month dropdowns, and strict event sequencing.

**Two-phase timing:**
- **Phase 1 (t = 1500ms):** Fill company names, job titles, click all month dropdowns staggered 150ms apart
- **Phase 2 (t = 1500 + 1400ms):** Fill all years — must run after all months are committed or React clears them

**Experience slots:** Count existing slots before adding:
```javascript
const existingSlots = document.querySelectorAll(
  'input[name^="experiences."][name$=".companyName"]'
).length;
for (let i = existingSlots; i < 4; i++) addExpBtn.click();
```

**Education index:** Education fields use index `[4]` in Uber's DOM (slots 0–3 are work experience). Confirmed by diagnostic.

**Zip code:** Filled with a 400ms retry — the field is sometimes re-rendered after other fills clear it.

---

### Greenhouse (`fillGreenhouse`)

Greenhouse uses `input[type="text"]` with custom React listbox dropdowns — not native `<select>` elements. Standard `fillSelectByLabel` does not work here.

**Stable IDs:** `#gender`, `#hispanic_ethnicity`, `#veteran_status`, `#disability_status`

**Variable question IDs:** Custom questions have numeric IDs (`#question_12345`) that differ per company. These are matched by label text using `fillAutocompleteByLabel`.

**Yes/No questions:** Some Greenhouse questions render as custom dropdowns with no `[role="option"]` elements visible until clicked. These require manual intervention (~5 clicks per form). Not automated.

---

### Lever (`fillLever`)

Straightforward. Fields use stable `name` attributes. EEO fields are native `<select>` elements.

---

### Ashby (`fillAshby`)

Name and contact fields only. Ashby forms vary significantly by company — no stable pattern for custom questions.

---

### Workday (`fillWorkday`)

Name, contact, city, zip, cover letter. Workday renders inside deeply nested shadow DOM on some companies — if fills fail, run the diagnostic to check for shadow roots.

---

## Double-Injection Guard

The manifest auto-injects `content_script.js` at `document_idle`. `popup.js` also injects it as a fallback for tabs that were open before the extension was loaded or reloaded. Without a guard, the script runs twice and throws `Identifier 'profile' has already been declared`.

Guard at top of `content_script.js`:
```javascript
if (window.__jobRadarLoaded) {
  // already injected — just listen for messages
} else {
  window.__jobRadarLoaded = true;
  // ... full script
}
```

---

## Async Message Channel

Chrome closes the message channel after a synchronous return. Uber's fill runs at t = ~3000ms via `setTimeout`. The message listener must return `true` to keep the channel open:

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fill") {
    // ... setTimeout callbacks that call sendResponse later
    return true; // keep channel open
  }
});
```

---

## Adding a New ATS

### Step 1 — Run the diagnostic

Open the job application page in Chrome. Open DevTools (`Cmd+Option+J`). If the form is inside an `<iframe>` (iCIMS, some Workday instances), switch the console context to the iframe using the dropdown at the top-left of the console.

Paste:
```javascript
document.querySelectorAll('input,textarea,select').forEach(el=>{const l=document.querySelector(`label[for="${el.id}"]`)||el.closest('div,li,section')?.querySelector('label,[class*="label"],[class*="question"]');const opts=el.tagName==='SELECT'?Array.from(el.options).map(o=>o.text.trim()).filter(t=>t).slice(0,5).join(' / '):'';console.log(el.tagName+'|'+el.type+'|id='+el.id+'|name='+el.name+'|ph='+el.placeholder+'|label='+(l?.textContent?.trim()?.slice(0,60)||'')+'|opts='+opts)})
```

**Reading the output:**

| Output | What it means | Fill strategy |
|---|---|---|
| `INPUT\|text\|id=first_name` | Standard text input with stable ID | `fill(doc.getElementById('first_name'), value)` |
| `INPUT\|text\|id=question_123\|label=LinkedIn Profile` | Custom question, ID varies by company | `fillInputByLabel('LinkedIn Profile', value)` |
| `SELECT\|...\|opts=Yes / No / Prefer not` | Native select | `fillSelectByLabel('label text', 'Yes')` |
| `INPUT\|text\|id=gender\|label=Gender` | React autocomplete (no opts shown) | `fillAutocompleteByLabel('Gender', 'Male')` |

**Multi-page forms (e.g. iCIMS):** Each page loads new DOM. Run the diagnostic on each page separately and document all pages before building the fill function.

### Step 2 — Add a fill function to `content_script.js`

```javascript
function fillNewATS() {
  let filled = 0;
  // ... fill calls
  return filled;
}
```

Add ATS detection to the URL check block:
```javascript
const isNewATS = url.includes("newats.com");
```

Call it in the message listener alongside the existing ATS checks.

### Step 3 — Add host permission to `manifest.json`

```json
"host_permissions": [
  "https://*.newats.com/*"
]
```

### Step 4 — Add to `detect_ats()` in `backend/app/services/notify.py`

So the email digest groups jobs under the correct ATS section header.

### Step 5 — Reload the extension

`chrome://extensions` → **↺** reload JobRadar.

---

## Current Platform Status

| Platform | Status | Fields | Notes |
|---|---|---|---|
| Uber (`uber.com/careers`) | ✅ Production | 42 | Full form — work history, education, EEO, months/years |
| Greenhouse (`greenhouse.io`) | ✅ Production | 20+ | Label-based; works on any company using Greenhouse |
| Lever (`jobs.lever.co`) | ✅ Production | 15+ | Name, contact, LinkedIn, EEO dropdowns |
| Ashby (`ashbyhq.com`) | ✅ Production | 10+ | Name, contact, LinkedIn |
| Workday (`myworkday.com`) | ✅ Production | 12+ | Name, contact, city, zip, cover letter |
| iCIMS | 🔜 Next | — | Page 1 diagnostic done; need pages 2–4 |
| LinkedIn Easy Apply | 🔜 Next | — | Needs diagnostic run |
| SmartRecruiters | 🔜 Next | — | Needs diagnostic run |
| Jobvite | 🔜 Backlog | — | |
| Taleo / Oracle | 🔜 Backlog | — | |
| Workable | 🔜 Backlog | — | |
| BambooHR | 🔜 Backlog | — | |

---

## Installing / Updating

**First install:**
1. `chrome://extensions` → Developer mode ON
2. Load unpacked → select the `extension/` folder

**After pulling updates:**
```bash
cd ~/path/to/jobradar && git pull origin main
```
`chrome://extensions` → **↺** reload JobRadar. No reinstall needed.
