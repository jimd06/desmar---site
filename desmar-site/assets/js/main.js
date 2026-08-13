"use strict";

/* ============================================================
   Desmar — main.js
   ΟΛΕΣ οι ρυθμίσεις που θα αλλάξουν στη φάση σύνδεσης με το
   backend βρίσκονται ΕΔΩ, στο CONFIG. Τίποτα άλλο δεν χρειάζεται
   να πειραχτεί μέσα στο αρχείο.
   ============================================================ */

const CONFIG = {
  // TODO: το URL της πλατφόρμας στο Render (χωρίς / στο τέλος)
  API_BASE: "https://REPLACE-ME.onrender.com",

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
  },

  // Ακριβή ονόματα πεδίων που περιμένει το backend στο POST /api/lead.
  // Θα επιβεβαιωθούν στη φάση σύνδεσης — αλλάζουν ΜΟΝΟ εδώ.
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

  // Presets υπολογιστή ανά κλάδο: [αναπάντητες/εβδομάδα, μέση αξία €]
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
};

const ERROR_MESSAGE =
  "Κάτι πήγε στραβά και το αίτημα δεν στάλθηκε. Δοκιμάστε ξανά σε λίγο.";

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

    // Native validation με ελληνικά μηνύματα του browser
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

    const originalLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Αποστολή…";
    }

    try {
      const response = await fetch(CONFIG.API_BASE + "/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      showSuccess();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = ERROR_MESSAGE;
        errorBox.hidden = false;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
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
    // Placeholder: το κουμπί μένει ορατό αλλά ανενεργό μέχρι να μπουν τα links
    link.setAttribute("aria-disabled", "true");
    link.title = "Το demo θα ενεργοποιηθεί σύντομα";
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

  // Τα presets ΜΟΝΟ προσυμπληρώνουν — τα πεδία μένουν πλήρως επεξεργάσιμα
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
      if (text) text.textContent = "Συμπληρώστε τα νούμερά σας για να δείτε την εκτίμηση.";
      return;
    }

    const monthly = m * CONFIG.WEEKS_PER_MONTH * CONFIG.CALC_CONVERSION * v;
    const rounded = Math.round(monthly / 10) * 10;
    amount.textContent = "~" + fmt.format(rounded) + " € / μήνα";
    if (text) text.textContent = "Εκτίμηση χαμένων εσόδων, με βάση τα νούμερά σας.";
  }

  industry.addEventListener("change", applyPreset);
  missed.addEventListener("input", recalc);
  value.addEventListener("input", recalc);

  applyPreset(); // αρχική προσυμπλήρωση για τον προεπιλεγμένο κλάδο
})();

/* ---------- Animation συνομιλίας στο hero ---------- */

(function initChatAnimation() {
  const chat = document.getElementById("chat-body");
  if (!chat) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const messages = Array.from(chat.querySelectorAll(".msg"));
  const typing = chat.querySelector(".typing");
  if (reduceMotion || messages.length === 0) return; // μένει στατικό

  chat.classList.add("is-anim");

  async function playLoop() {
    // eslint-disable-next-line no-constant-condition
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
