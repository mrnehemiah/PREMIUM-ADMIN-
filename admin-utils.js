
// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-utils.js
// SEHEMU YA 1/4
// =========================================================

(function () {
  "use strict";

  const AdminUtils = {

    // -----------------------------------------------------
    // 1. ESCAPE HTML
    // Huzuia maandishi ya data kuingizwa kama HTML.
    // -----------------------------------------------------

    escapeHTML(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },


    // -----------------------------------------------------
    // 2. FORMAT MONEY
    // -----------------------------------------------------

    formatMoney(value, currency = "TZS") {
      const amount = Number(value);

      if (!Number.isFinite(amount)) {
        return currency === "TZS" ? "TZS 0" : "0";
      }

      try {
        return new Intl.NumberFormat("sw-TZ", {
          style: "currency",
          currency,
          maximumFractionDigits: 2
        }).format(amount);
      } catch (error) {
        console.warn(
          "Currency formatting error:",
          error
        );

        return `${currency} ${amount.toFixed(2)}`;
      }
    },


    // -----------------------------------------------------
    // 3. FORMAT DATE
    // -----------------------------------------------------

    formatDate(value, includeTime = true) {
      if (!value) return "Haijawekwa";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Tarehe haijulikani";
      }

      try {
        return new Intl.DateTimeFormat("sw-TZ", {
          dateStyle: "medium",
          ...(includeTime
            ? { timeStyle: "short" }
            : {})
        }).format(date);
      } catch (error) {
        return date.toLocaleDateString();
      }
    },


    // -----------------------------------------------------
    // 4. FORMAT NUMBER
    // -----------------------------------------------------

    formatNumber(value, maximumFractionDigits = 0) {
      const number = Number(value);

      if (!Number.isFinite(number)) return "0";

      return new Intl.NumberFormat("sw-TZ", {
        maximumFractionDigits
      }).format(number);
    },


    // -----------------------------------------------------
    // 5. FORMAT PERCENTAGE
    // -----------------------------------------------------

    formatPercentage(value, decimals = 1) {
      const number = Number(value);

      if (!Number.isFinite(number)) return "0%";

      return `${number.toFixed(decimals)}%`;
    },


    // -----------------------------------------------------
    // 6. NORMALIZE TEXT
    // -----------------------------------------------------

    normalizeText(value) {
      return String(value ?? "")
        .trim()
        .toLowerCase();
    },


    // -----------------------------------------------------
    // 7. NORMALIZE CODE
    // -----------------------------------------------------

    normalizeCode(value) {
      return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
    }

  };

  // Fanya functions zipatikane kwa scripts nyingine.
  window.AdminUtils = AdminUtils;

  console.log(
    "ZUNE AdminUtils: Sehemu ya 1 imepakiwa."
  );

// SEHEMU YA 2 ITAENDELEA HAPA.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-utils.js
// SEHEMU YA 2/4
// =========================================================

// ---------------------------------------------------------
// 8. SAFE JSON PARSING
// ---------------------------------------------------------

AdminUtils.safeJSONParse = function (
  value,
  fallback = null
) {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(
      "ZUNE AdminUtils: JSON haikuweza kusomwa.",
      error
    );

    return fallback;
  }
};


// ---------------------------------------------------------
// 9. TRUNCATE TEXT
// ---------------------------------------------------------

AdminUtils.truncateText = function (
  value,
  maxLength = 100
) {
  const text = String(value ?? "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
};


// ---------------------------------------------------------
// 10. GET INITIALS
// ---------------------------------------------------------

AdminUtils.getInitials = function (value) {
  const name = String(value ?? "").trim();

  if (!name) return "ZU";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
};


// ---------------------------------------------------------
// 11. NORMALIZE STATUS
// ---------------------------------------------------------

AdminUtils.normalizeStatus = function (value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
};


// ---------------------------------------------------------
// 12. GET STATUS LABEL
// ---------------------------------------------------------

AdminUtils.getStatusLabel = function (value) {
  const status = this.normalizeStatus(value);

  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    active: "Inatumika",
    inactive: "Haifanyi kazi",
    published: "Imechapishwa",
    draft: "Rasimu",
    scheduled: "Imepangwa",
    expired: "Muda umeisha",
    paid: "Imelipwa",
    unpaid: "Haijalipwa",
    refunded: "Imerejeshwa",
    verified: "Imethibitishwa",
    unverified: "Haijathibitishwa"
  };

  return labels[status] || status || "Haijulikani";
};


// ---------------------------------------------------------
// 13. STATUS CSS CLASS
// ---------------------------------------------------------

AdminUtils.getStatusClass = function (value) {
  const status = this.normalizeStatus(value);

  const classes = {
    completed: "is-verified",
    approved: "is-verified",
    active: "is-verified",
    published: "is-verified",
    paid: "is-verified",
    verified: "is-verified",

    pending: "is-pending",
    scheduled: "is-pending",
    draft: "is-pending",
    unpaid: "is-pending",
    unverified: "is-pending",

    cancelled: "is-rejected",
    rejected: "is-rejected",
    inactive: "is-rejected",
    expired: "is-rejected"
  };

  // Thamani inayorejeshwa ni class ya CSS pekee.
  return classes[status] || "is-pending";
};


// ---------------------------------------------------------
// 14. CLAMP NUMBER
// ---------------------------------------------------------

AdminUtils.clamp = function (
  value,
  minimum,
  maximum
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, number)
  );
};


console.log(
  "ZUNE AdminUtils: Sehemu ya 2 imepakiwa."
);

// Sehemu ya 3 itaendelea hapa.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-utils.js
// SEHEMU YA 3/4
// =========================================================

// ---------------------------------------------------------
// 15. DEBOUNCE
// Hupunguza kurudia kazi nyingi wakati wa kutafuta.
// ---------------------------------------------------------

AdminUtils.debounce = function (callback, delay = 300) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
};


// ---------------------------------------------------------
// 16. EMAIL VALIDATION
// ---------------------------------------------------------

AdminUtils.isValidEmail = function (value) {
  const email = String(value ?? "").trim();

  if (!email || email.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};


// ---------------------------------------------------------
// 17. PHONE VALIDATION
// Inakubali namba za kimataifa zenye alama ya +.
// ---------------------------------------------------------

AdminUtils.isValidPhone = function (value) {
  const phone = String(value ?? "").trim();

  if (!phone) return false;

  const normalized = phone.replace(/[\s()-]/g, "");

  return /^\+?[0-9]{7,15}$/.test(normalized);
};


// ---------------------------------------------------------
// 18. SLUGIFY
// Hubadilisha maandishi kuwa slug inayofaa kwa URL.
// ---------------------------------------------------------

AdminUtils.slugify = function (value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};


// ---------------------------------------------------------
// 19. SAFE CSV CELL
// Hupunguza hatari ya CSV Formula Injection.
// ---------------------------------------------------------

AdminUtils.safeCSVCell = function (value) {
  let text = String(value ?? "");

  // Zuia mistari mipya isivunje mpangilio wa CSV.
  text = text.replace(/\r\n/g, "\n");

  // Zuia programu za spreadsheet kutafsiri thamani
  // zinazoanza na alama za fomula kama fomula.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  // Escape alama za nukuu.
  text = text.replace(/"/g, '""');

  return `"${text}"`;
};


// ---------------------------------------------------------
// 20. EXPORT DATA TO CSV
// Hutengeneza faili la CSV linaloweza kufunguliwa
// kwenye Excel na programu nyingine za spreadsheet.
// ---------------------------------------------------------

AdminUtils.exportCSV = function (
  rows,
  filename = "zune-admin-export.csv"
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(
      "ZUNE AdminUtils: Hakuna data ya ku-export."
    );

    return false;
  }

  const headers = Object.keys(rows[0] || {});

  if (headers.length === 0) {
    return false;
  }

  const csvRows = [
    headers.map(header => this.safeCSVCell(header)).join(","),

    ...rows.map(row =>
      headers
        .map(header => this.safeCSVCell(row?.[header]))
        .join(",")
    )
  ];

  const csvContent = "\uFEFF" + csvRows.join("\r\n");

  const blob = new Blob(
    [csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return true;
};


console.log(
  "ZUNE AdminUtils: Sehemu ya 3 imepakiwa."
);

// Sehemu ya 4 itaendelea hapa.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-utils.js
// SEHEMU YA 4/4 — MWISHO
// =========================================================

// ---------------------------------------------------------
// 21. SAFE HTML ELEMENT CREATION
// Tengeneza element bila kuingiza HTML isiyoaminika.
// ---------------------------------------------------------

AdminUtils.createElement = function (
  tagName,
  options = {}
) {
  const allowedTags = new Set([
    "div", "span", "p", "button",
    "input", "label", "section",
    "article", "strong", "small",
    "h2", "h3", "ul", "li"
  ]);

  const tag = String(tagName ?? "").toLowerCase();

  if (!allowedTags.has(tag)) {
    throw new Error(
      "ZUNE AdminUtils: HTML tag hairuhusiwi."
    );
  }

  const element = document.createElement(tag);

  if (options.className) {
    element.className = String(options.className);
  }

  if (options.text !== undefined) {
    element.textContent = String(options.text ?? "");
  }

  if (options.id) {
    element.id = String(options.id);
  }

  if (options.title) {
    element.title = String(options.title);
  }

  if (options.type && tag === "button") {
    element.type = String(options.type);
  }

  if (options.disabled !== undefined && "disabled" in element) {
    element.disabled = Boolean(options.disabled);
  }

  return element;
};


// ---------------------------------------------------------
// 22. SAFE QUERY SELECTOR
// ---------------------------------------------------------

AdminUtils.getElement = function (
  selector,
  root = document
) {
  if (typeof selector !== "string" || !selector.trim()) {
    return null;
  }

  try {
    return root.querySelector(selector);
  } catch (error) {
    console.warn(
      "ZUNE AdminUtils: Selector si sahihi.",
      error
    );

    return null;
  }
};


// ---------------------------------------------------------
// 23. SAFE QUERY SELECTOR ALL
// ---------------------------------------------------------

AdminUtils.getElements = function (
  selector,
  root = document
) {
  if (typeof selector !== "string" || !selector.trim()) {
    return [];
  }

  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (error) {
    console.warn(
      "ZUNE AdminUtils: Selector si sahihi.",
      error
    );

    return [];
  }
};


// ---------------------------------------------------------
// 24. COPY TEXT
// ---------------------------------------------------------

AdminUtils.copyText = async function (value) {
  const text = String(value ?? "");

  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    return copied;
  } catch (error) {
    console.warn(
      "ZUNE AdminUtils: Nakala haikuweza kunakiliwa.",
      error
    );

    return false;
  }
};


// ---------------------------------------------------------
// 25. GENERATE REFERENCE
// Kwa matumizi ya ndani ya UI pekee.
// Si ID rasmi ya database au malipo.
// ---------------------------------------------------------

AdminUtils.generateReference = function (prefix = "ZUNE") {
  const safePrefix = String(prefix)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12) || "ZUNE";

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase();

  return `${safePrefix}-${Date.now()}-${randomPart}`;
};


// ---------------------------------------------------------
// 26. CHECK LIBRARY AVAILABILITY
// ---------------------------------------------------------

AdminUtils.checkDependencies = function () {
  const results = {
    document: typeof document !== "undefined",
    fetch: typeof fetch === "function",
    supabaseClient: Boolean(
      window.AdminAuth && window.AdminAuth.client
    ),
    dashboardApp: Boolean(window.ZUNEAdmin)
  };

  const missing = Object.entries(results)
    .filter(([, available]) => !available)
    .map(([name]) => name);

  return {
    ok: missing.length === 0,
    dependencies: results,
    missing
  };
};


// ---------------------------------------------------------
// 27. FINAL INITIALIZATION
// ---------------------------------------------------------

window.AdminUtils = AdminUtils;

console.log(
  "ZUNE Premium Admin: admin-utils.js imepakiwa."
);

// Funga IIFE — USIONGEZE CODE YA SEHEMU NYINGINE CHINI.
})();
