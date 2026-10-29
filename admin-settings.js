
// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-settings.js
// SEHEMU YA 1/4
// =========================================================

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Settings = {
    client: auth ? auth.client : null,

    initialized: false,
    loading: false,
    saving: false,

    settings: {},
    originalSettings: {},

    elements: {},

    // -----------------------------------------------------
    // ESCAPE HTML
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
    // DISPLAY MESSAGE
    // -----------------------------------------------------

    showMessage(message, type = "info") {
      const target =
        this.elements.message ||
        document.getElementById("settingsMessage");

      if (!target) {
        console.log(
          `[ZUNE Settings: ${type}] ${message}`
        );
        return;
      }

      target.textContent = message;
      target.className =
        `admin-message admin-message-${type}`;
      target.hidden = false;
    },

    // -----------------------------------------------------
    // CHECK ADMIN ACCESS
    // -----------------------------------------------------

    async checkAccess() {
      if (!auth || !this.client) {
        this.showMessage(
          "AdminAuth haijapakiwa. Kagua admin-auth.js.",
          "error"
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        this.showMessage(
          "Mfumo wa kuhakiki ruhusa za admin haupatikani.",
          "error"
        );
        return false;
      }

      try {
        const result = await auth.checkAccess();

        // Usikubali matokeo yasiyo wazi kama uthibitisho.
        if (result === true) return true;

        if (
          result &&
          typeof result === "object" &&
          (
            result.allowed === true ||
            result.isAdmin === true ||
            result.role === "admin"
          )
        ) {
          return true;
        }

        return false;
      } catch (error) {
        console.error(
          "ZUNE Settings access error:",
          error
        );
        return false;
      }
    },

    // -----------------------------------------------------
    // CACHE HTML ELEMENTS
    // -----------------------------------------------------

    cacheElements() {
      this.elements.message =
        document.getElementById("settingsMessage");

      this.elements.form =
        document.getElementById("settingsForm");

      this.elements.refresh =
        document.getElementById("settingsRefreshBtn");

      this.elements.save =
        document.getElementById("settingsSaveBtn");

      this.elements.siteName =
        document.getElementById("settingSiteName");

      this.elements.supportEmail =
        document.getElementById("settingSupportEmail");

      this.elements.supportPhone =
        document.getElementById("settingSupportPhone");

      this.elements.maintenance =
        document.getElementById("settingMaintenanceMode");

      this.elements.announcement =
        document.getElementById("settingAnnouncement");
    }
  };

  // Ruhusu scripts nyingine kuitumia.
  window.AdminSettings = Settings;

  console.log(
    "ZUNE Settings: Sehemu ya 1 imepakiwa."
  );

// SEHEMU YA 2 ITAENDELEA HAPA.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-settings.js
// SEHEMU YA 2/4
// =========================================================

// ---------------------------------------------------------
// 1. LOAD SETTINGS
// ---------------------------------------------------------

AdminSettings.loadSettings = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.save) {
    this.elements.save.disabled = true;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kusoma mipangilio hii. Kagua akaunti yako ya admin.",
        "error"
      );
      return;
    }

    /*
      Schema ya jedwali la settings haijathibitishwa.

      Kwa hiyo sehemu hii haisomi wala kubadilisha
      jedwali lolote la Supabase.

      Thamani hizi ni za kuonyesha kwenye fomu tu,
      si mipangilio rasmi iliyohifadhiwa.
    */

    this.settings = {
      site_name: "ZUNE",
      support_email: "",
      support_phone: "",
      maintenance_mode: false,
      announcement: ""
    };

    this.originalSettings = {
      ...this.settings
    };

    this.populateForm();

    this.showMessage(
      "Fomu imeandaliwa. Muundo wa database ya settings unahitaji kuthibitishwa kabla ya kuhifadhi.",
      "info"
    );
  } catch (error) {
    console.error(
      "ZUNE Settings load error:",
      error
    );

    this.showMessage(
      "Imeshindikana kuandaa mipangilio.",
      "error"
    );
  } finally {
    this.loading = false;

    if (this.elements.save) {
      this.elements.save.disabled = false;
    }
  }
};


// ---------------------------------------------------------
// 2. POPULATE SETTINGS FORM
// ---------------------------------------------------------

AdminSettings.populateForm = function () {
  const settings = this.settings;

  if (this.elements.siteName) {
    this.elements.siteName.value =
      settings.site_name || "";
  }

  if (this.elements.supportEmail) {
    this.elements.supportEmail.value =
      settings.support_email || "";
  }

  if (this.elements.supportPhone) {
    this.elements.supportPhone.value =
      settings.support_phone || "";
  }

  if (this.elements.maintenance) {
    this.elements.maintenance.checked =
      settings.maintenance_mode === true;
  }

  if (this.elements.announcement) {
    this.elements.announcement.value =
      settings.announcement || "";
  }
};


// ---------------------------------------------------------
// 3. READ CURRENT FORM VALUES
// ---------------------------------------------------------

AdminSettings.readForm = function () {
  return {
    site_name: this.elements.siteName
      ? this.elements.siteName.value.trim()
      : "",

    support_email: this.elements.supportEmail
      ? this.elements.supportEmail.value.trim()
      : "",

    support_phone: this.elements.supportPhone
      ? this.elements.supportPhone.value.trim()
      : "",

    maintenance_mode: this.elements.maintenance
      ? this.elements.maintenance.checked
      : false,

    announcement: this.elements.announcement
      ? this.elements.announcement.value.trim()
      : ""
  };
};


// ---------------------------------------------------------
// 4. VALIDATE SETTINGS
// ---------------------------------------------------------

AdminSettings.validateSettings = function (settings) {
  if (!settings.site_name) {
    return {
      valid: false,
      message: "Jina la mfumo haliwezi kuwa tupu."
    };
  }

  if (settings.site_name.length > 100) {
    return {
      valid: false,
      message: "Jina la mfumo limezidi herufi 100."
    };
  }

  if (
    settings.support_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      settings.support_email
    )
  ) {
    return {
      valid: false,
      message: "Weka barua pepe sahihi ya msaada."
    };
  }

  if (settings.support_phone.length > 40) {
    return {
      valid: false,
      message: "Namba ya simu imezidi urefu unaoruhusiwa."
    };
  }

  if (settings.announcement.length > 2000) {
    return {
      valid: false,
      message: "Tangazo limezidi herufi 2000."
    };
  }

  return {
    valid: true,
    message: "Mipangilio imekaguliwa."
  };
};


// ---------------------------------------------------------
// 5. CHECK WHETHER SETTINGS CHANGED
// ---------------------------------------------------------

AdminSettings.hasChanges = function () {
  const current = this.readForm();

  return Object.keys(current).some(key => {
    return current[key] !== this.originalSettings[key];
  });
};


console.log(
  "ZUNE Settings: Sehemu ya 2 imepakiwa."
);

// Sehemu ya 3 itaendelea hapa.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-settings.js
// SEHEMU YA 3/4
// =========================================================

// ---------------------------------------------------------
// 6. SAVE SETTINGS - SAFE VALIDATION ONLY
// ---------------------------------------------------------

AdminSettings.saveSettings = async function () {
  if (this.saving) return;

  const allowed = await this.checkAccess();

  if (!allowed) {
    this.showMessage(
      "Huna ruhusa ya kubadilisha mipangilio.",
      "error"
    );
    return;
  }

  const settings = this.readForm();
  const validation = this.validateSettings(settings);

  if (!validation.valid) {
    this.showMessage(
      validation.message,
      "error"
    );
    return;
  }

  /*
    Usalama:
    Jedwali la settings halijathibitishwa bado.
    Hatuwezi kuandika data kwa jedwali lisilojulikana.

    Tunahifadhi mabadiliko kwenye kumbukumbu ya ukurasa
    pekee kwa ajili ya hakiki. Data hii itapotea ukurasa
    ukifungwa au ukifanyiwa refresh.
  */

  this.saving = true;

  if (this.elements.save) {
    this.elements.save.disabled = true;
  }

  try {
    this.settings = { ...settings };

    this.showMessage(
      "Mipangilio imekaguliwa na kuandaliwa kwenye ukurasa huu pekee. Bado haijahifadhiwa kwenye Supabase.",
      "info"
    );

    console.log(
      "ZUNE Settings draft:",
      this.settings
    );
  } catch (error) {
    console.error(
      "ZUNE Settings draft error:",
      error
    );

    this.showMessage(
      "Imeshindikana kuandaa mabadiliko.",
      "error"
    );
  } finally {
    this.saving = false;

    if (this.elements.save) {
      this.elements.save.disabled = false;
    }
  }
};


// ---------------------------------------------------------
// 7. RESET FORM
// ---------------------------------------------------------

AdminSettings.resetSettings = function () {
  this.settings = {
    ...this.originalSettings
  };

  this.populateForm();

  this.showMessage(
    "Mabadiliko ya fomu yamerejeshwa kwenye thamani za mwanzo.",
    "info"
  );
};


// ---------------------------------------------------------
// 8. CONNECT FORM CONTROLS
// ---------------------------------------------------------

AdminSettings.connectControls = function () {
  const form = this.elements.form;
  const refresh = this.elements.refresh;
  const save = this.elements.save;

  if (form && !form.dataset.settingsBound) {
    form.dataset.settingsBound = "true";

    form.addEventListener("submit", event => {
      event.preventDefault();
      this.saveSettings();
    });
  }

  if (save && !save.dataset.settingsBound) {
    save.dataset.settingsBound = "true";

    save.addEventListener("click", event => {
      if (
        !form ||
        save.type !== "submit"
      ) {
        event.preventDefault();
        this.saveSettings();
      }
    });
  }

  if (refresh && !refresh.dataset.settingsBound) {
    refresh.dataset.settingsBound = "true";

    refresh.addEventListener("click", () => {
      this.resetSettings();
    });
  }
};


// ---------------------------------------------------------
// 9. WARN ABOUT UNSAVED FORM CHANGES
// ---------------------------------------------------------

AdminSettings.connectChangeWarning = function () {
  const form = this.elements.form;

  if (!form || form.dataset.changeWarningBound) {
    return;
  }

  form.dataset.changeWarningBound = "true";

  form.addEventListener("input", () => {
    if (this.hasChanges()) {
      this.showMessage(
        "Una mabadiliko ambayo bado hayajahifadhiwa.",
        "info"
      );
    }
  });
};


console.log(
  "ZUNE Settings: Sehemu ya 3 imepakiwa."
);

// Sehemu ya 4 itakamilisha initialization.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-settings.js
// SEHEMU YA 4/4
// =========================================================

// ---------------------------------------------------------
// 10. INITIALIZE SETTINGS MODULE
// ---------------------------------------------------------

AdminSettings.initialize = async function () {
  if (this.initialized) {
    await this.loadSettings();
    return;
  }

  this.cacheElements();
  this.connectControls();
  this.connectChangeWarning();

  this.initialized = true;

  await this.loadSettings();

  console.log(
    "ZUNE Settings: Module imeanzishwa."
  );
};


// ---------------------------------------------------------
// 11. REFRESH SETTINGS
// ---------------------------------------------------------

AdminSettings.refresh = async function () {
  await this.loadSettings();
};


// ---------------------------------------------------------
// 12. NAVIGATION SUPPORT
// ---------------------------------------------------------

document.addEventListener("click", event => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  const page = navLink.getAttribute("data-page");

  if (page === "settings") {
    AdminSettings.initialize();
  }
});


// ---------------------------------------------------------
// 13. START MODULE
// ---------------------------------------------------------

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminSettings.initialize(),
    { once: true }
  );
} else {
  AdminSettings.initialize();
}


// =========================================================
// END OF admin-settings.js
// =========================================================

})();
