(function () {
  const profile = {
    firstName: "Ahmad",
    lastName: "Naggayev",
    fullName: "Ahmad Naggayev",
    email: "ahmadavar956@gmail.com",
    phone: "(415) 812-1535",
    city: "Berkeley",
    state: "CA",
    stateAbbr: "California",
    zip: "94710",
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

  // ── Helpers ──────────────────────────────────────────────
  function fill(el, value) {
    if (!el || el.value === value) return;
    try {
      const setter = Object.getOwnPropertyDescriptor(
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        "value"
      ).set;
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

  function pasteFromClipboard(selectors) {
    navigator.clipboard.readText().then((text) => {
      if (!text) return;
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) { fill(el, text); return; }
        } catch (e) {}
      }
    }).catch(() => {});
  }

  // ── Detect ATS ───────────────────────────────────────────
  const url = window.location.href;
  const isWorkday = url.includes("myworkday") || !!document.querySelector("[data-automation-id]");
  const isGreenhouse = url.includes("greenhouse.io") || !!document.querySelector("#application_form");
  const isLever = url.includes("jobs.lever.co");
  const isAshby = url.includes("ashbyhq.com");
  const isUber = url.includes("uber.com/careers");

  // ── Workday ──────────────────────────────────────────────
  if (isWorkday) {
    const wd = [
      ["legalNameSection_firstName", profile.firstName],
      ["legalNameSection_lastName", profile.lastName],
      ["email", profile.email],
      ["phone", profile.phone],
      ["addressSection_city", profile.city],
      ["addressSection_postalCode", profile.zip],
    ];
    for (const [id, val] of wd) {
      const el = document.querySelector(`[data-automation-id="${id}"] input`) ||
                 document.querySelector(`[data-automation-id="${id}"]`);
      if (el) fill(el, val);
    }
    // Workday dropdowns
    selectOption(document.querySelector('[data-automation-id="country"] select'), "United States");
    selectOption(document.querySelector('[data-automation-id="state"] select'), "California");
    // Cover letter from clipboard
    pasteFromClipboard(['[data-automation-id="coverLetter"] textarea', 'textarea[data-automation-id*="cover"]']);
  }

  // ── Greenhouse ───────────────────────────────────────────
  if (isGreenhouse) {
    fill(document.querySelector("#first_name"), profile.firstName);
    fill(document.querySelector("#last_name"), profile.lastName);
    fill(document.querySelector("#email"), profile.email);
    fill(document.querySelector("#phone"), profile.phone);
    tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]', 'input[id*="linkedin"]'], profile.linkedin);
    tryFill(['input[name*="github"]', 'input[placeholder*="GitHub"]'], profile.github);
    tryFill(['input[name*="website"]', 'input[placeholder*="Website"]', 'input[placeholder*="Portfolio"]'], profile.website);
    pasteFromClipboard(["#cover_letter", 'textarea[name*="cover"]']);
    // EEO
    selectOption(document.querySelector('select[name*="gender"]'), "Male");
    selectOption(document.querySelector('select[name*="veteran"]'), "not a protected");
    selectOption(document.querySelector('select[name*="disability"]'), "No");
    selectOption(document.querySelector('select[name*="race"], select[name*="ethnicity"]'), "White");
  }

  // ── Lever ────────────────────────────────────────────────
  if (isLever) {
    fill(document.querySelector('input[name="name"]'), profile.fullName);
    fill(document.querySelector('input[name="email"]'), profile.email);
    fill(document.querySelector('input[name="phone"]'), profile.phone);
    tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedin);
    tryFill(['input[name*="github"]', 'input[placeholder*="GitHub"]'], profile.github);
    pasteFromClipboard(['textarea[name="comments"]', 'textarea[name*="cover"]']);
  }

  // ── Ashby ────────────────────────────────────────────────
  if (isAshby) {
    tryFill(['input[name="firstName"]', 'input[placeholder*="First"]'], profile.firstName);
    tryFill(['input[name="lastName"]', 'input[placeholder*="Last"]'], profile.lastName);
    fill(document.querySelector('input[name="email"], input[type="email"]'), profile.email);
    fill(document.querySelector('input[name="phone"]'), profile.phone);
    tryFill(['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedin);
    pasteFromClipboard(['textarea[name*="cover"]', 'textarea[placeholder*="cover"]']);
  }

  // ── Uber ─────────────────────────────────────────────────
  if (isUber) {
    let uberAlertShown = false;

    // Month fill helper — dispatches focus first to trigger React validation
    function fillMonth(el, value) {
      if (!el) return;
      el.focus();
      el.dispatchEvent(new Event("focus", { bubbles: true }));
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      filled++;
    }

    function clickRadio(name, value) {
      const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (el) { el.click(); filled++; }
    }

    // Basic info — phone digits only (Uber rejects country code and formatting)
    fill(document.querySelector('input[name="firstName"]'), profile.firstName);
    fill(document.querySelector('input[name="lastName"]'), profile.lastName);
    fill(document.querySelector('input[name="email"]'), profile.email);
    fill(document.querySelector('input[name="mobileNumber"]'), profile.phone.replace(/\D/g, ''));
    fill(document.querySelector('input[name="linkedInURL"]'), profile.linkedin);
    fill(document.querySelector('input[name="githubURL"]'), profile.github);
    fill(document.querySelector('input[name="otherURL"]'), profile.website);
    tryFill(['input[name="zipCode"]', 'input[placeholder*="zip"]', 'input[placeholder*="Zip"]'], profile.zip);
    selectOption(document.querySelector('select[id="subsidiaryQuestion"]'), "No");

    // Radio buttons
    clickRadio("driverPartnerQuestion", "No");
    clickRadio("openRolesQuestion", "Yes");
    clickRadio("inUSA", "Yes");
    clickRadio("legalRightToWork", "Yes");
    clickRadio("requireVisaSponsorship", "No");
    clickRadio("gender", "Male");
    clickRadio("race", "White (Not Hispanic or Latino)");
    clickRadio("disability", "No, I do not have a disability");
    clickRadio("veteran", "I am not a Protected Veteran, Veteran, military spouse or partner");
    clickRadio("sexualOrientation", "Prefer not to say");
    clickRadio("arbitrationAgreement", "Yes, I agree to the terms of the Arbitration Agreement.");

    // Experience 0: LoanMatch AI (current — already in DOM)
    fill(document.querySelector('input[name="experiences.0.companyName"]'), "LoanMatch AI");
    fill(document.querySelector('input[name="experiences.0.title"]'), "Founding Engineer");
    const exp0Current = document.querySelector('input[name="experiences.0.isCurrent"]');
    if (exp0Current && !exp0Current.checked) { exp0Current.click(); filled++; }
    const sm0 = document.querySelectorAll('[id="start-date-month"]')[0];
    if (sm0) fillMonth(sm0, "06");
    fill(document.querySelector('input[name="experiences.0.startDate.year"]'), "2024");

    // Education 0: UBA (current — already in DOM)
    fill(document.querySelector('input[name="educations.0.schoolName"]'), "University of Bay Area");
    fill(document.querySelector('input[name="educations.0.degree"]'), "Master of Science");
    fill(document.querySelector('input[name="educations.0.fieldOfStudy"]'), "Applied Data Science");
    const edu0Current = document.querySelector('input[name="educations.0.isCurrent"]');
    if (edu0Current && !edu0Current.checked) { edu0Current.click(); filled++; }

    // Click "Add experience" 3 times to add Career Break, Uber, Robert Half slots
    const addExpBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().includes('Add experience'));
    if (addExpBtn) { addExpBtn.click(); addExpBtn.click(); addExpBtn.click(); }

    // Wait for React to render the 3 new slots, then fill
    setTimeout(() => {
      const startMonths = document.querySelectorAll('[id="start-date-month"]');
      const endMonths = document.querySelectorAll('[id="end-date-month"]');

      // Experience 1: Career Break
      fill(document.querySelector('input[name="experiences.1.companyName"]'), "Career Break");
      fill(document.querySelector('input[name="experiences.1.title"]'), "Self-directed Learning & Upskilling");
      if (startMonths[1]) fillMonth(startMonths[1], "05");
      fill(document.querySelector('input[name="experiences.1.startDate.year"]'), "2023");
      if (endMonths[1]) fillMonth(endMonths[1], "06");
      fill(document.querySelector('input[name="experiences.1.endDate.year"]'), "2024");

      // Experience 2: Uber
      fill(document.querySelector('input[name="experiences.2.companyName"]'), "Uber");
      fill(document.querySelector('input[name="experiences.2.title"]'), "Data Analyst (Contract)");
      if (startMonths[2]) fillMonth(startMonths[2], "01");
      fill(document.querySelector('input[name="experiences.2.startDate.year"]'), "2022");
      if (endMonths[2]) fillMonth(endMonths[2], "05");
      fill(document.querySelector('input[name="experiences.2.endDate.year"]'), "2023");

      // Experience 3: Robert Half
      fill(document.querySelector('input[name="experiences.3.companyName"]'), "Robert Half / Marin Housing Authority");
      fill(document.querySelector('input[name="experiences.3.title"]'), "Staff Accountant & AR/AP Specialist");
      if (startMonths[3]) fillMonth(startMonths[3], "09");
      fill(document.querySelector('input[name="experiences.3.startDate.year"]'), "2019");
      if (endMonths[3]) fillMonth(endMonths[3], "08");
      fill(document.querySelector('input[name="experiences.3.endDate.year"]'), "2021");

      // Education start month (index 4 = after 4 exp start months)
      if (startMonths[4]) fillMonth(startMonths[4], "08");
      fill(document.querySelector('input[name="educations.0.startDate.year"]'), "2025");

      uberAlertShown = true;
      alert(`✅ JobRadar filled ${filled} fields on Uber.\n\n📋 Cover letter: copied from your clipboard.\nMake sure you copied it from your email first!\n\n📎 Resume: upload manually (browser security restriction).`);
    }, 800);

    return; // skip bottom alert — Uber fires its own from setTimeout
  }

  // ── Generic fallback (any ATS) ───────────────────────────
  const generic = [
    [['input[autocomplete="given-name"]', 'input[name="first_name"]', 'input[id="first_name"]'], profile.firstName],
    [['input[autocomplete="family-name"]', 'input[name="last_name"]', 'input[id="last_name"]'], profile.lastName],
    [['input[autocomplete="email"]', 'input[type="email"]'], profile.email],
    [['input[autocomplete="tel"]', 'input[name="phone"]', 'input[id="phone"]'], profile.phone],
    [['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedin],
    [['input[name*="city"]', 'input[placeholder*="City"]'], profile.city],
  ];

  for (const [selectors, value] of generic) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.value) { fill(el, value); break; }
      } catch (e) {}
    }
  }

  // ── Done ─────────────────────────────────────────────────
  const ats = isWorkday ? "Workday" : isGreenhouse ? "Greenhouse" : isLever ? "Lever" : isAshby ? "Ashby" : "Generic";
  alert(`✅ JobRadar filled ${filled} fields on ${ats}.\n\n📋 Cover letter: copied from your clipboard.\nMake sure you copied it from your email first!\n\n📎 Resume: upload manually (browser security restriction).`);
})();
