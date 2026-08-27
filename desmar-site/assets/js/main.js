"use strict";

/* ============================================================
   Desmar — main.js (δίγλωσσο ΕΛ/ΕΝ)
   ΟΛΕΣ οι ρυθμίσεις που θα αλλάξουν στη φάση σύνδεσης με το
   backend βρίσκονται ΕΔΩ, στο CONFIG. Τίποτα άλλο δεν χρειάζεται
   να πειραχτεί μέσα στο αρχείο.
   ============================================================ */

const CONFIG = {
  // Το URL της πλατφόρμας στο Render (χωρίς / στο τέλος)
  API_BASE: "https://core-chatbot-platform.onrender.com",

  // Το client_id με το οποίο καταχωρούνται τα leads του site
  DESMAR_CLIENT_ID: "desmar",

  // TODO: τα links των demo chatbots ανά κλάδο.
  // Όσο μένουν "#", το κουμπί εμφανίζεται απενεργοποιημένο.
  DEMO_LINKS: {
    iatreio: "#",
    kommotirio: "#",
    xenodocheio: "#",
    gymnastirio: "#",
    skafi: "#",
    allo: "#",
  },

  // Ακριβή ονόματα πεδίων που περιμένει το backend στο
  // POST /api/v1/lead/<client_id> — αλλάζουν ΜΟΝΟ εδώ.
  LEAD_FIELDS: {
    clientId: "client_id",
    businessName: "business_name",
    industry: "industry",
    email: "email",
    phone: "phone",
    siteUrl: "site_url",
    honeypot: "website",
    utmSource: "utm_source",
    utmMedium: "utm_medium",
    utmCampaign: "utm_campaign",
  },

  // Presets υπολογιστή ανά κλάδο (backend keys): [αναπάντητες/εβδομάδα, μέση αξία €]
  CALC_PRESETS: {
    iatreio:     { missed: 8,  value: 150 },
    kommotirio:  { missed: 10, value: 40 },
    xenodocheio: { missed: 6,  value: 280 },
    gymnastirio: { missed: 7,  value: 300 },
    skafi:       { missed: 3,  value: 1800 },
    allo:        { missed: 6,  value: 80 },
  },

  // Παραδοχή μετατροπής: 3 στις 10 αναπάντητες επαφές θα γίνονταν πελάτες
  CALC_CONVERSION: 0.30,
  WEEKS_PER_MONTH: 4.33,

  // Γλώσσα
  DEFAULT_LANG: "el",
  LANG_COOKIE: "desmar_lang",
};

/* ============================================================
   ΓΛΩΣΣΑ — δίγλωσσο toggle ΕΛ/ΕΝ
   Κάθε element με data-el / data-en παίρνει το σωστό κείμενο.
   Για πεδία με placeholder: data-el-ph / data-en-ph.
   Η επιλογή θυμάται σε cookie (δουλεύει και μέσα σε iframe).
   ============================================================ */

const I18N = {
  // κείμενα που ζουν στο JS (μηνύματα, δυναμικά)
  el: {
    errorMessage: "Κάτι πήγε στραβά και το αίτημα δεν στάλθηκε. Δοκιμάστε ξανά σε λίγο.",
    sending: "Αποστολή…",
    calcEmpty: "Συμπληρώστε τα νούμερά σας για να δείτε την εκτίμηση.",
    calcResult: "Εκτίμηση χαμένων εσόδων, με βάση τα νούμερά σας.",
    calcSuffix: " € / μήνα",
    calcPrefix: "~",
    demoSoon: "Το demo θα ενεργοποιηθεί σύντομα",
  },
  en: {
    errorMessage: "Something went wrong and your request wasn't sent. Please try again shortly.",
    sending: "Sending…",
    calcEmpty: "Enter your numbers to see the estimate.",
    calcResult: "Estimated lost revenue, based on your numbers.",
    calcSuffix: " € / month",
    calcPrefix: "~",
    demoSoon: "The demo will be enabled soon",
  },
};

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax";
}

let currentLang = CONFIG.DEFAULT_LANG;

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.el[key] || "";
}

function applyLang(lang) {
  currentLang = lang === "en" ? "en" : "el";
  document.documentElement.setAttribute("lang", currentLang);

  // Κείμενα
  document.querySelectorAll("[data-el]").forEach((el) => {
    const val = el.getAttribute("data-" + currentLang);
    if (val !== null) el.innerHTML = val;
  });
  // Placeholders
  document.querySelectorAll("[data-el-ph]").forEach((el) => {
    const val = el.getAttribute("data-" + currentLang + "-ph");
    if (val !== null) el.setAttribute("placeholder", val);
  });
  // aria-labels
  document.querySelectorAll("[data-el-aria]").forEach((el) => {
    const val = el.getAttribute("data-" + currentLang + "-aria");
    if (val !== null) el.setAttribute("aria-label", val);
  });

  // Ενημέρωση κατάστασης κουμπιών toggle
  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    const isActive = btn.getAttribute("data-lang-btn") === currentLang;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.classList.toggle("is-active", isActive);
  });

  setCookie(CONFIG.LANG_COOKIE, currentLang, 365);

  // Ξαναϋπολόγισε calculator για να αλλάξει το κείμενο αποτελέσματος
  if (typeof window.__recalcCalculator === "function") window.__recalcCalculator();
}

(function initLangToggle() {
  const saved = getCookie(CONFIG.LANG_COOKIE);
  const initial = saved === "en" || saved === "el" ? saved : CONFIG.DEFAULT_LANG;

  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang-btn")));
  });

  applyLang(initial);
})();

/* ---------- Βοηθητικά ---------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
  };
}

// Αν ο επισκέπτης γράψει "example.gr" χωρίς πρωτόκολλο, προσθέτουμε https://
function normalizeSiteUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
}

/* ---------- Φόρμες demo (hero + τελικό CTA) ---------- */

function initLeadForm(form) {
  const wrap = form.closest(".form-wrap");
  const successBox = wrap ? wrap.querySelector(".form-success") : null;
  const errorBox = form.querySelector(".form-error");
  const submitBtn = form.querySelector('button[type="submit"]');
  const utm = getUtmParams();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (errorBox) errorBox.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const F = CONFIG.LEAD_FIELDS;

    // Honeypot: αν είναι γεμάτο, είναι bot — δείχνουμε "επιτυχία" χωρίς αποστολή
    if ((data.get("website") || "").trim() !== "") {
      showSuccess();
      return;
    }

    const payload = {
      [F.clientId]: CONFIG.DESMAR_CLIENT_ID,
      [F.businessName]: (data.get("business_name") || "").trim(),
      [F.industry]: data.get("industry") || "",
      [F.email]: (data.get("email") || "").trim(),
      [F.phone]: (data.get("phone") || "").trim(),
      [F.siteUrl]: normalizeSiteUrl(data.get("site_url")),
      [F.honeypot]: "",
      [F.utmSource]: utm.source,
      [F.utmMedium]: utm.medium,
      [F.utmCampaign]: utm.campaign,
    };

    const originalLabel = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t("sending");
    }

    try {
      const response = await fetch(
        CONFIG.API_BASE + "/api/v1/lead/" + encodeURIComponent(CONFIG.DESMAR_CLIENT_ID),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error("HTTP " + response.status);
      showSuccess();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = t("errorMessage");
        errorBox.hidden = false;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    }
  });

  function showSuccess() {
    form.hidden = true;
    if (successBox) {
      successBox.hidden = false;
      successBox.focus();
    }
  }
}

document.querySelectorAll("form.lead-form").forEach(initLeadForm);

/* ---------- Demo gallery links ---------- */

document.querySelectorAll("[data-demo-link]").forEach((link) => {
  const key = link.getAttribute("data-demo-link");
  const url = CONFIG.DEMO_LINKS[key];

  if (url && url !== "#") {
    link.href = url;
  } else {
    link.setAttribute("aria-disabled", "true");
    link.title = t("demoSoon");
    link.addEventListener("click", (event) => event.preventDefault());
  }
});

/* ---------- Υπολογιστής χαμένων εσόδων ---------- */

(function initCalculator() {
  const industry = document.getElementById("calc-industry");
  const missed = document.getElementById("calc-missed");
  const value = document.getElementById("calc-value");
  const amount = document.getElementById("calc-amount");
  const text = document.getElementById("calc-text");
  if (!industry || !missed || !value || !amount) return;

  const fmt = new Intl.NumberFormat("el-GR");

  function applyPreset() {
    const preset = CONFIG.CALC_PRESETS[industry.value] || CONFIG.CALC_PRESETS.allo;
    missed.value = preset.missed;
    value.value = preset.value;
    recalc();
  }

  function recalc() {
    const m = parseFloat(missed.value);
    const v = parseFloat(value.value);

    if (!isFinite(m) || !isFinite(v) || m <= 0 || v <= 0) {
      amount.textContent = "—";
      if (text) text.textContent = t("calcEmpty");
      return;
    }

    const monthly = m * CONFIG.WEEKS_PER_MONTH * CONFIG.CALC_CONVERSION * v;
    const rounded = Math.round(monthly / 10) * 10;
    amount.textContent = t("calcPrefix") + fmt.format(rounded) + t("calcSuffix");
    if (text) text.textContent = t("calcResult");
  }

  // Εκθέτουμε το recalc ώστε να ξανατρέχει όταν αλλάζει η γλώσσα
  window.__recalcCalculator = recalc;

  industry.addEventListener("change", applyPreset);
  missed.addEventListener("input", recalc);
  value.addEventListener("input", recalc);

  applyPreset();
})();

/* ---------- Animation συνομιλίας στο hero ---------- */

(function initChatAnimation() {
  const chat = document.getElementById("chat-body");
  if (!chat) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const messages = Array.from(chat.querySelectorAll(".msg"));
  const typing = chat.querySelector(".typing");
  if (reduceMotion || messages.length === 0) return;

  chat.classList.add("is-anim");

  async function playLoop() {
    while (true) {
      for (const msg of messages) {
        const isBot = msg.classList.contains("msg--bot");
        if (isBot && typing) {
          typing.hidden = false;
          chat.scrollTop = chat.scrollHeight;
          await sleep(900);
          typing.hidden = true;
        }
        msg.classList.add("is-in");
        chat.scrollTop = chat.scrollHeight;
        await sleep(isBot ? 750 : 600);
      }
      await sleep(3800);
      messages.forEach((msg) => msg.classList.remove("is-in"));
      chat.scrollTop = 0;
      await sleep(500);
    }
  }

  playLoop();
})();
