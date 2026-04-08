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

// ── Fill dispatcher (called by popup via executeScript OR legacy message) ─────

window.__jobRadarFill = function() {
  return new Promise(function(resolve) {
    filled = 0;
    if (isWorkday)         { fillWorkday();         resolve({ filled: filled, ats: "Workday" }); }
    else if (isGreenhouse) { fillGreenhouse();       resolve({ filled: filled, ats: "Greenhouse" }); }
    else if (isLever)      { fillLever();            resolve({ filled: filled, ats: "Lever" }); }
    else if (isAshby)      { fillAshby();            resolve({ filled: filled, ats: "Ashby" }); }
    else if (isUber)       { fillUber(resolve); }
    else                   { fillGeneric();          resolve({ filled: filled, ats: "Generic" }); }
  });
};

// Legacy message listener (kept for backward compatibility)
chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (msg.action !== "fill") return true;
  window.__jobRadarFill().then(sendResponse);
  return true;
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

// ── Label-based helpers (work across all Greenhouse/Lever/Ashby implementations) ──

// Wait for a React Select option to appear in the DOM and click it.
// Uses MutationObserver so it works regardless of render speed.
function clickReactSelectOption(value, timeoutMs) {
  var target = value.toLowerCase();
  var observer = new MutationObserver(function(mutations, obs) {
    var options = document.querySelectorAll('[class*="select__option"],[role="option"]');
    for (var i = 0; i < options.length; i++) {
      var text = options[i].textContent.trim().toLowerCase();
      if (text === target || text.startsWith(target.split(' ')[0])) {
        options[i].click();
        filled++;
        obs.disconnect();
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function() { observer.disconnect(); }, timeoutMs || 1500);
}

// Open a React Select dropdown and click the matching option.
// el = any element inside the react-select (e.g. the hidden input with a stable id like #gender)
function fillAutocomplete(el, value) {
  if (!el) return;
  // React Select wraps inputs in a control div — click that to open the menu
  var control = el.closest('[class*="select__control"]') ||
                (el.parentElement && el.parentElement.closest('[class*="select__control"]'));
  if (control) {
    control.click();
  } else {
    // Fallback for non-React-Select autocompletes
    el.focus();
    el.click();
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  clickReactSelectOption(value);
}

// Find a React Select control by its label text and open + select the value.
function fillAutocompleteByLabel(labelText, value) {
  var regex = new RegExp(labelText, 'i');

  // Search React Select controls first (class*="select__control")
  var controls = document.querySelectorAll('[class*="select__control"]');
  for (var i = 0; i < controls.length; i++) {
    var control = controls[i];
    var container = control.closest('[class*="field"],[class*="question"],[class*="row"],[class*="form"]') ||
                    control.parentElement;
    var label = container ? container.querySelector('label') : null;
    var lText = label ? label.textContent.trim() : '';
    var inp = control.querySelector('input');
    var ariaLabel = inp ? (inp.getAttribute('aria-label') || '') : '';
    if (regex.test(lText) || regex.test(ariaLabel)) {
      control.click();
      clickReactSelectOption(value);
      return true;
    }
  }

  // Fallback: plain text inputs (older Greenhouse / non-React-Select)
  var inputs = document.querySelectorAll('input[type="text"],input:not([type])');
  for (var j = 0; j < inputs.length; j++) {
    var inp2 = inputs[j];
    if (inp2.value) continue;
    var lbl = document.querySelector('label[for="' + inp2.id + '"]') ||
              (inp2.closest('[class*="field"],[class*="question"],[class*="row"]') || {}).querySelector &&
               inp2.closest('[class*="field"],[class*="question"],[class*="row"]').querySelector('label');
    var text = (lbl ? lbl.textContent : '') || inp2.getAttribute('aria-label') || inp2.placeholder || '';
    if (regex.test(text)) { fillAutocomplete(inp2, value); return true; }
  }
  return false;
}

// Fill a plain text input by label (URLs, city — no dropdown needed)
function fillInputByLabel(labelText, value) {
  const regex = new RegExp(labelText, 'i');
  for (const inp of document.querySelectorAll('input[type="text"],input[type="url"],input:not([type])')) {
    if (inp.value) continue;
    const label =
      document.querySelector(`label[for="${inp.id}"]`) ||
      inp.closest('[class*="field"],[class*="question"],[class*="row"]')?.querySelector('label');
    const text = label?.textContent || inp.getAttribute('aria-label') || inp.placeholder || '';
    if (regex.test(text)) { fill(inp, value); return true; }
  }
  return false;
}

// Fill a <select> by matching its visible label text (kept for older ATS)
function fillSelectByLabel(labelText, optionText) {
  const regex = new RegExp(labelText, 'i');
  for (const sel of document.querySelectorAll('select')) {
    if (sel.value && sel.value !== "" && sel.value !== "Select...") continue;
    const label =
      document.querySelector(`label[for="${sel.id}"]`) ||
      sel.closest('label') ||
      sel.closest('[class*="field"],[class*="question"],[class*="row"]')?.querySelector('label');
    const text = label?.textContent || sel.getAttribute('aria-label') || '';
    if (regex.test(text)) { selectOption(sel, optionText); return true; }
  }
  return false;
}

// ── Greenhouse ────────────────────────────────────────────────────────────────

function fillGreenhouse() {
  // Standard fields — stable IDs across all Greenhouse forms
  fill(document.querySelector("#first_name"),        profile.firstName);
  fill(document.querySelector("#last_name"),         profile.lastName);
  fill(document.querySelector("#email"),             profile.email);
  fill(document.querySelector("#phone"),             profile.phone);
  fill(document.querySelector("#candidate-location"),profile.city);

  // Country — new Greenhouse UI uses an autocomplete input
  fillAutocomplete(document.querySelector("#country"), "United States");

  // LinkedIn and Website — plain text inputs, find by label
  fillInputByLabel("linkedin",         profile.linkedin);
  fillInputByLabel("website|portfolio",profile.website);
  fillInputByLabel("github",           profile.github);

  // Stable demographic IDs (consistent across ALL Greenhouse forms)
  fillAutocomplete(document.querySelector("#gender"),             "Male");
  fillAutocomplete(document.querySelector("#hispanic_ethnicity"), "No");
  fillAutocomplete(document.querySelector("#veteran_status"),     "I am not a protected veteran");
  fillAutocomplete(document.querySelector("#disability_status"),  "No, I don't have a disability");

  // Custom yes/no questions — always match by label (IDs like question_XXXXXXXX change per company)
  // Staggered: each call opens a dropdown and waits for React to render options via MutationObserver.
  // 600ms gap ensures one dropdown closes before the next opens (prevents option collision).
  var autoDropdowns = [
    ["dbt",                       "Yes"],
    ["dashboard",                 "Yes"],
    ["bay area",                  "Yes"],
    ["authorized to work",        "Yes"],
    ["legally authorized",        "Yes"],
    ["visa sponsorship",          "No"],
    ["require.*sponsor",          "No"],
    ["reside",                    "United States"],
    ["remote.*location",          "Yes"],
    ["employed by.*stripe|stripe affiliate", "No"],
    ["gender identity",           "Male"],
    ["racial.*ethnic",            "White"],
    ["sexual orientation",        "Prefer not to say"],
    ["transgender",               "No"],
    ["disability.*chronic",       "No"],
    ["veteran.*armed",            "I am not"],
  ];
  for (var i = 0; i < autoDropdowns.length; i++) {
    (function(label, value, delay) {
      setTimeout(function() { fillAutocompleteByLabel(label, value); }, delay);
    })(autoDropdowns[i][0], autoDropdowns[i][1], i * 600);
  }

  // Free-text custom questions — match by label, fill as plain input
  fillInputByLabel("current.*employer|previous.*employer", "LoanMatch AI");
  fillInputByLabel("current.*job title|previous.*job title", "Founding Engineer");
  fillInputByLabel("city.*state|in what city", profile.city + ", " + profile.state);

  // Cover letter from clipboard
  navigator.clipboard.readText().then((text) => {
    if (!text) return;
    const cl = document.querySelector("#cover_letter") ||
               document.querySelector('textarea[name*="cover"]') ||
               document.querySelector('textarea[placeholder*="cover"]');
    if (cl) fill(cl, text);
  }).catch(() => {});
}

// ── Lever ─────────────────────────────────────────────────────────────────────

function fillLever() {
  fill(document.querySelector('input[name="name"]'),  profile.fullName);
  fill(document.querySelector('input[name="email"]'), profile.email);
  fill(document.querySelector('input[name="phone"]'), profile.phone);
  if (!tryFill(['input[name*="linkedin"]','input[placeholder*="LinkedIn"]'], profile.linkedin))
    fillInputByLabel('linkedin', profile.linkedin);
  tryFill(['input[name*="github"]','input[placeholder*="GitHub"]'], profile.github);

  // EEO and custom dropdowns by label
  const dropdowns = [
    ["authorized",       "Yes"], ["visa",        "No"],
    ["gender",           "Male"],["race|ethnic",  "White"],
    ["hispanic",         "No"],  ["veteran",      "I am not"],
    ["disability",       "No"],  ["orientation",  "Prefer not to say"],
  ];
  for (const [label, value] of dropdowns) fillSelectByLabel(label, value);

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

// Click the month dropdown and select the matching option from Uber's listbox.
// Falls back to native setter if no listbox found.
function fillMonthDropdown(el, value) {
  if (!el) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

  // Open the dropdown
  el.focus();
  el.click();
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));

  // Wait for listbox to render, then click the matching option
  setTimeout(() => {
    const options = document.querySelectorAll('[role="option"], [role="listitem"]');
    for (const opt of options) {
      const text = opt.textContent.trim();
      if (text === value || text.padStart(2, '0') === value.padStart(2, '0')) {
        opt.click();
        filled++;
        return;
      }
    }
    // Fallback: commit via change + blur if no listbox option found
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    filled++;
  }, 120);
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

  // Zip — try multiple selectors, retry after 400ms
  const zipEl = document.querySelector('input[name="zipCode"]') ||
                document.querySelector('input[placeholder="Zip code"]') ||
                document.querySelector('input[placeholder*="Zip"]') ||
                document.querySelector('input[placeholder*="zip"]') ||
                document.querySelector('input[id*="zip"], input[id*="Zip"]') ||
                Array.from(document.querySelectorAll('input')).find(el =>
                  el.closest('label')?.textContent?.toLowerCase().includes('zip')
                );
  console.log('[JobRadar] zipEl found:', zipEl?.name, zipEl?.placeholder, zipEl?.id);
  if (zipEl) {
    fill(zipEl, profile.zip);
    setTimeout(() => fill(zipEl, profile.zip), 400);
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
  // year filled in Phase 2 (after month is committed)
  const exp0Current = document.querySelector('input[name="experiences.0.isCurrent"]');
  if (exp0Current && !exp0Current.checked) { exp0Current.click(); filled++; }

  // ── Education 0: UBA (pre-existing slot) ─────────────────────────────────
  fill(document.querySelector('input[name="educations.0.schoolName"]'),   "University of Bay Area");
  fill(document.querySelector('input[name="educations.0.degree"]'),       "Master of Science");
  fill(document.querySelector('input[name="educations.0.fieldOfStudy"]'), "Applied Data Science");
  // year filled in Phase 2 (after month is committed)
  const edu0Current = document.querySelector('input[name="educations.0.isCurrent"]');
  if (edu0Current && !edu0Current.checked) { edu0Current.click(); filled++; }

  // ── Add only the slots we actually need — no duplicates ──────────────────
  const existingSlots = document.querySelectorAll('input[name^="experiences."][name$=".companyName"]').length;
  const addExpBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.innerText.trim().includes('Add experience'));
  if (addExpBtn) {
    for (let i = existingSlots; i < 4; i++) addExpBtn.click();
  }

  // ── Phase 1 (t=1500ms): fill company/title + click all month dropdowns ──────
  setTimeout(() => {
    const allSM = document.querySelectorAll('[id="start-date-month"]');
    const allEM = document.querySelectorAll('[id="end-date-month"]');

    // Exp 1–3: company + title
    fill(document.querySelector('input[name="experiences.1.companyName"]'), "Career Break");
    fill(document.querySelector('input[name="experiences.1.title"]'),       "Self-directed Learning & Upskilling");
    fill(document.querySelector('input[name="experiences.2.companyName"]'), "Uber");
    fill(document.querySelector('input[name="experiences.2.title"]'),       "Data Analyst (Contract)");
    fill(document.querySelector('input[name="experiences.3.companyName"]'), "Robert Half / Marin Housing Authority");
    fill(document.querySelector('input[name="experiences.3.title"]'),       "Staff Accountant & AR/AP Specialist");

    // All months — click dropdown to properly commit selection
    // Stagger by 150ms each so dropdowns don't overlap
    setTimeout(() => fillMonthDropdown(allSM[0], '06'), 0);    // exp0 start
    setTimeout(() => fillMonthDropdown(allSM[1], '05'), 150);  // exp1 start
    setTimeout(() => fillMonthDropdown(allEM[1], '06'), 300);  // exp1 end
    setTimeout(() => fillMonthDropdown(allSM[2], '01'), 450);  // exp2 start
    setTimeout(() => fillMonthDropdown(allEM[2], '05'), 600);  // exp2 end
    setTimeout(() => fillMonthDropdown(allSM[3], '09'), 750);  // exp3 start
    setTimeout(() => fillMonthDropdown(allEM[3], '08'), 900);  // exp3 end
    setTimeout(() => fillMonthDropdown(allSM[4], '09'), 1050); // edu0 start — September

    // ── Phase 2 (t=1500+1400ms): fill all years AFTER months are committed ──
    setTimeout(() => {
      fill(document.querySelector('input[name="experiences.0.startDate.year"]'), "2024");
      fill(document.querySelector('input[name="experiences.1.startDate.year"]'), "2023");
      fill(document.querySelector('input[name="experiences.1.endDate.year"]'),   "2024");
      fill(document.querySelector('input[name="experiences.2.startDate.year"]'), "2022");
      fill(document.querySelector('input[name="experiences.2.endDate.year"]'),   "2023");
      fill(document.querySelector('input[name="experiences.3.startDate.year"]'), "2019");
      fill(document.querySelector('input[name="experiences.3.endDate.year"]'),   "2021");
      fill(document.querySelector('input[name="educations.0.startDate.year"]'),  "2025");

      sendResponse({ filled, ats: "Uber" });
    }, 1400);
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
