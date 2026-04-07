// JobRadar Autofill — Content Script
// Injected by the extension into ATS pages. Runs in privileged context — CSP cannot block this.
// Triggered via message from popup.js when user clicks "Fill This Form".

// Guard against double-injection — only initialize once per page
if (window.__jobRadarLoaded) {
  // Already loaded — just re-register the message listener (handled below)
} else {
window.__jobRadarLoaded = true;

const profile = {
  firstName: "Ahmad",
  lastName: "Naggayev",
  fullName: "Ahmad Naggayev",
  email: "ahmadavar956@gmail.com",
  phone: "(415) 812-1535",
  city: "Berkeley",
  state: "CA",
  stateAbbr: "California",
  zip: "94704",
  country: "United States",
  linkedin: "https://linkedin.com/in/ahmadnaggayev",
  github: "https://github.com/ahmadavar",
  website: "https://www.loanmatchai.app",
  // EEO
  veteran: "I am not a protected veteran",
  disability: "No, I don't have a disability",
  gender: "Male",
  ethnicity: "White (Not Hispanic or Latino)",
  authorized: "Yes",
  sponsorship: "No",
};

let filled = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fill(el, value) {
  if (!el || el.value === value) return;
  try {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    filled++;
  } catch (e) {}
}

function selectOption(el, value) {
  if (!el) return;
  const option = Array.from(el.options).find(
    (o) => o.text.toLowerCase().includes(value.toLowerCase()) ||
           o.value.toLowerCase().includes(value.toLowerCase())
  );
  if (option) {
    el.value = option.value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    filled++;
  }
}

function tryFill(selectors, value) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) { fill(el, value); return; }
    } catch (e) {}
  }
}

function clickRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) { el.click(); filled++; }
}

function fillMonth(el, value) {
  if (!el) return;
  // Handle <select> month dropdowns
  if (el.tagName === "SELECT") {
    const option = Array.from(el.options).find(
      (o) => o.value === value || o.value === String(parseInt(value)) || o.text.toLowerCase().includes(monthName(value))
    );
    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
    }
    return;
  }
  // Handle <input> month fields (React-controlled)
  // Always force-fill — React internal state can diverge from display value
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  el.focus();
  el.dispatchEvent(new Event("focus", { bubbles: true }));
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  // Retry after 200ms — React may reset the value on blur
  setTimeout(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }, 200);
  filled++;
}

function monthName(num) {
  const names = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  return names[parseInt(num) - 1] || "";
}

// ── ATS Detection ────────────────────────────────────────────────────────────

const url = window.location.href;
const isWorkday    = url.includes("myworkday") || !!document.querySelector("[data-automation-id]");
const isGreenhouse = url.includes("greenhouse.io") || !!document.querySelector("#application_form");
const isLever      = url.includes("jobs.lever.co");
const isAshby      = url.includes("ashbyhq.com");
const isUber       = url.includes("uber.com/careers");

// ── Listen for trigger from popup ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== "fill") return true;

  filled = 0;

  if (isWorkday)         { fillWorkday();         sendResponse({ filled, ats: "Workday" }); }
  else if (isGreenhouse) { fillGreenhouse();       sendResponse({ filled, ats: "Greenhouse" }); }
  else if (isLever)      { fillLever();            sendResponse({ filled, ats: "Lever" }); }
  else if (isAshby)      { fillAshby();            sendResponse({ filled, ats: "Ashby" }); }
  else if (isUber)       { fillUber(sendResponse); } // async — sendResponse called inside setTimeout
  else                   { fillGeneric();          sendResponse({ filled, ats: "Generic" }); }

  return true; // keep message channel open for async sendResponse
});

// ── Workday ───────────────────────────────────────────────────────────────────

function fillWorkday() {
  const fields = [
    ["legalNameSection_firstName", profile.firstName],
    ["legalNameSection_lastName",  profile.lastName],
    ["email",                      profile.email],
    ["phone",                      profile.phone],
    ["addressSection_city",        profile.city],
    ["addressSection_postalCode",  profile.zip],
  ];
  for (const [id, val] of fields) {
    const el = document.querySelector(`[data-automation-id="${id}"] input`) ||
               document.querySelector(`[data-automation-id="${id}"]`);
    if (el) fill(el, val);
  }
  selectOption(document.querySelector('[data-automation-id="country"] select'), "United States");
  selectOption(document.querySelector('[data-automation-id="state"] select'), "California");

  navigator.clipboard.readText().then((text) => {
    if (!text) return;
    const cl = document.querySelector('[data-automation-id="coverLetter"] textarea') ||
               document.querySelector('textarea[data-automation-id*="cover"]');
    if (cl) fill(cl, text);
  }).catch(() => {});
}

// ── Greenhouse ────────────────────────────────────────────────────────────────

function fillGreenhouse() {
  fill(document.querySelector("#first_name"), profile.firstName);
  fill(document.querySelector("#last_name"),  profile.lastName);
  fill(document.querySelector("#email"),      profile.email);
  fill(document.querySelector("#phone"),      profile.phone);
  tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]', 'input[id*="linkedin"]'], profile.linkedin);
  tryFill(['input[name*="github"]',   'input[placeholder*="GitHub"]'],                            profile.github);
  tryFill(['input[name*="website"]',  'input[placeholder*="Website"]', 'input[placeholder*="Portfolio"]'], profile.website);
  selectOption(document.querySelector('select[name*="gender"]'),              "Male");
  selectOption(document.querySelector('select[name*="veteran"]'),             "not a protected");
  selectOption(document.querySelector('select[name*="disability"]'),          "No");
  selectOption(document.querySelector('select[name*="race"], select[name*="ethnicity"]'), "White");

  navigator.clipboard.readText().then((text) => {
    if (!text) return;
    const cl = document.querySelector("#cover_letter") ||
               document.querySelector('textarea[name*="cover"]');
    if (cl) fill(cl, text);
  }).catch(() => {});
}

// ── Lever ─────────────────────────────────────────────────────────────────────

function fillLever() {
  fill(document.querySelector('input[name="name"]'),  profile.fullName);
  fill(document.querySelector('input[name="email"]'), profile.email);
  fill(document.querySelector('input[name="phone"]'), profile.phone);
  tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedin);
  tryFill(['input[name*="github"]',   'input[placeholder*="GitHub"]'],   profile.github);

  navigator.clipboard.readText().then((text) => {
    if (!text) return;
    const cl = document.querySelector('textarea[name="comments"]') ||
               document.querySelector('textarea[name*="cover"]');
    if (cl) fill(cl, text);
  }).catch(() => {});
}

// ── Ashby ─────────────────────────────────────────────────────────────────────

function fillAshby() {
  tryFill(['input[name="firstName"]', 'input[placeholder*="First"]'], profile.firstName);
  tryFill(['input[name="lastName"]',  'input[placeholder*="Last"]'],  profile.lastName);
  fill(document.querySelector('input[name="email"], input[type="email"]'), profile.email);
  fill(document.querySelector('input[name="phone"]'), profile.phone);
  tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedin);

  navigator.clipboard.readText().then((text) => {
    if (!text) return;
    const cl = document.querySelector('textarea[name*="cover"]') ||
               document.querySelector('textarea[placeholder*="cover"]');
    if (cl) fill(cl, text);
  }).catch(() => {});
}

// ── Uber ──────────────────────────────────────────────────────────────────────

// Fill a month field by the experience/education name prefix.
// Tries name attribute first (reliable), then falls back to [id="start/end-date-month"] by index.
function fillMonthByName(prefix, value) {
  const el = document.querySelector(`input[name="${prefix}.month"]`) ||
             document.querySelector(`select[name="${prefix}.month"]`);
  if (el) { fillMonth(el, value); return true; }
  return false;
}

function fillUber(sendResponse) {
  // ── Basic fields ──────────────────────────────────────────────────────────
  fill(document.querySelector('input[name="firstName"]'),    profile.firstName);
  fill(document.querySelector('input[name="lastName"]'),     profile.lastName);
  fill(document.querySelector('input[name="email"]'),        profile.email);
  fill(document.querySelector('input[name="mobileNumber"]'), profile.phone.replace(/\D/g, ''));
  fill(document.querySelector('input[name="linkedInURL"]'),  profile.linkedin);
  fill(document.querySelector('input[name="githubURL"]'),    profile.github);
  fill(document.querySelector('input[name="otherURL"]'),     profile.website);

  // Zip — fill + retry after 300ms in case React resets it
  const zipEl = document.querySelector('input[name="zipCode"]') ||
                document.querySelector('input[placeholder="Zip code"]') ||
                document.querySelector('input[placeholder*="Zip"]');
  if (zipEl) {
    fill(zipEl, profile.zip);
    setTimeout(() => { if (zipEl.value !== profile.zip) fill(zipEl, profile.zip); }, 300);
  }

  // Subsidiary dropdown
  const subEl = document.querySelector('select[id="subsidiaryQuestion"]') ||
                document.querySelector('select[name="subsidiaryQuestion"]');
  if (subEl) selectOption(subEl, "No");

  // ── Radio buttons ─────────────────────────────────────────────────────────
  clickRadio("driverPartnerQuestion",  "No");
  clickRadio("openRolesQuestion",      "Yes");
  clickRadio("inUSA",                  "Yes");
  clickRadio("legalRightToWork",       "Yes");
  clickRadio("requireVisaSponsorship", "No");
  clickRadio("gender",                 "Male");
  clickRadio("race",                   "White (Not Hispanic or Latino)");
  clickRadio("disability",             "No, I do not have a disability");
  clickRadio("veteran",                "I am not a Protected Veteran, Veteran, military spouse or partner");
  clickRadio("sexualOrientation",      "Prefer not to say");
  clickRadio("arbitrationAgreement",   "Yes, I agree to the terms of the Arbitration Agreement.");

  // ── Experience 0: LoanMatch AI (pre-existing slot) ───────────────────────
  fill(document.querySelector('input[name="experiences.0.companyName"]'), "LoanMatch AI");
  fill(document.querySelector('input[name="experiences.0.title"]'),       "Founding Engineer");
  fill(document.querySelector('input[name="experiences.0.startDate.year"]'), "2024");
  const exp0Current = document.querySelector('input[name="experiences.0.isCurrent"]');
  if (exp0Current && !exp0Current.checked) { exp0Current.click(); filled++; }

  // ── Education 0: UBA (pre-existing slot) ─────────────────────────────────
  fill(document.querySelector('input[name="educations.0.schoolName"]'),   "University of Bay Area");
  fill(document.querySelector('input[name="educations.0.degree"]'),       "Master of Science");
  fill(document.querySelector('input[name="educations.0.fieldOfStudy"]'), "Applied Data Science");
  fill(document.querySelector('input[name="educations.0.startDate.year"]'), "2025");
  const edu0Current = document.querySelector('input[name="educations.0.isCurrent"]');
  if (edu0Current && !edu0Current.checked) { edu0Current.click(); filled++; }

  // ── Add only the slots we actually need — no duplicates ──────────────────
  const existingSlots = document.querySelectorAll('input[name^="experiences."][name$=".companyName"]').length;
  const addExpBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.innerText.trim().includes('Add experience'));
  if (addExpBtn) {
    for (let i = existingSlots; i < 4; i++) addExpBtn.click();
  }

  // ── Fill dynamic slots after React renders them ───────────────────────────
  setTimeout(() => {
    const allSM = document.querySelectorAll('[id="start-date-month"]');
    const allEM = document.querySelectorAll('[id="end-date-month"]');
    console.log('[JobRadar] months found — start:', allSM.length, 'end:', allEM.length);
    Array.from(allSM).forEach((el, i) => console.log(`  SM[${i}] tag=${el.tagName} val="${el.value}" name="${el.name}"`));

    // Exp 0 start month — index [0], always force-fill
    fillMonth(allSM[0], '06');

    // Exp 1: Career Break
    fill(document.querySelector('input[name="experiences.1.companyName"]'), "Career Break");
    fill(document.querySelector('input[name="experiences.1.title"]'),       "Self-directed Learning & Upskilling");
    fillMonthByName('experiences.1.startDate', '05') ||
      fillMonth(document.querySelectorAll('[id="start-date-month"]')[1], '05');
    fill(document.querySelector('input[name="experiences.1.startDate.year"]'), "2023");
    fillMonthByName('experiences.1.endDate', '06') ||
      fillMonth(document.querySelectorAll('[id="end-date-month"]')[1], '06');
    fill(document.querySelector('input[name="experiences.1.endDate.year"]'), "2024");

    // Exp 2: Uber
    fill(document.querySelector('input[name="experiences.2.companyName"]'), "Uber");
    fill(document.querySelector('input[name="experiences.2.title"]'),       "Data Analyst (Contract)");
    fillMonthByName('experiences.2.startDate', '01') ||
      fillMonth(document.querySelectorAll('[id="start-date-month"]')[2], '01');
    fill(document.querySelector('input[name="experiences.2.startDate.year"]'), "2022");
    fillMonthByName('experiences.2.endDate', '05') ||
      fillMonth(document.querySelectorAll('[id="end-date-month"]')[2], '05');
    fill(document.querySelector('input[name="experiences.2.endDate.year"]'), "2023");

    // Exp 3: Robert Half
    fill(document.querySelector('input[name="experiences.3.companyName"]'), "Robert Half / Marin Housing Authority");
    fill(document.querySelector('input[name="experiences.3.title"]'),       "Staff Accountant & AR/AP Specialist");
    fillMonthByName('experiences.3.startDate', '09') ||
      fillMonth(document.querySelectorAll('[id="start-date-month"]')[3], '09');
    fill(document.querySelector('input[name="experiences.3.startDate.year"]'), "2019");
    fillMonthByName('experiences.3.endDate', '08') ||
      fillMonth(document.querySelectorAll('[id="end-date-month"]')[3], '08');
    fill(document.querySelector('input[name="experiences.3.endDate.year"]'), "2021");

    // Education 0 start month — index [4] (confirmed: 4 exp slots = indices 0-3, edu at 4)
    fillMonth(allSM[4], '08');

    sendResponse({ filled, ats: "Uber" });
  }, 1500);
}

// ── Generic fallback ──────────────────────────────────────────────────────────

function fillGeneric() {
  const fields = [
    [['input[autocomplete="given-name"]',  'input[name="first_name"]', 'input[id="first_name"]'], profile.firstName],
    [['input[autocomplete="family-name"]', 'input[name="last_name"]',  'input[id="last_name"]'],  profile.lastName],
    [['input[autocomplete="email"]',       'input[type="email"]'],                                profile.email],
    [['input[autocomplete="tel"]',         'input[name="phone"]',      'input[id="phone"]'],      profile.phone],
    [['input[name*="linkedin"]',           'input[placeholder*="LinkedIn"]'],                     profile.linkedin],
    [['input[name*="city"]',               'input[placeholder*="City"]'],                         profile.city],
  ];
  for (const [selectors, value] of fields) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.value) { fill(el, value); break; }
      } catch (e) {}
    }
  }
}

} // end __jobRadarLoaded guard
