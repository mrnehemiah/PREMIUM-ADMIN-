
// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-verification.js
// SEHEMU YA 1/4
// =========================================================

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Verification = {
    client: auth ? auth.client : null,

    initialized: false,
    loading: false,

    profiles: [],
    filteredProfiles: [],

    searchTerm: "",
    roleFilter: "all",
    verificationFilter: "all",

    elements: {},

    // -----------------------------------------------------
    // 1. ESCAPE HTML
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
    // 2. FORMAT DATE
    // -----------------------------------------------------

    formatDate(value) {
      if (!value) return "Haijatajwa";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Tarehe haijulikani";
      }

      return new Intl.DateTimeFormat("sw-TZ", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    },

    // -----------------------------------------------------
    // 3. ROLE LABEL
    // -----------------------------------------------------

    roleLabel(role) {
      const labels = {
        buyer: "Mteja",
        vendor: "Muuzaji",
        admin: "Admin"
      };

      return labels[String(role || "").toLowerCase()]
        || "Haijulikani";
    },

    // -----------------------------------------------------
    // 4. VERIFICATION LABEL
    // -----------------------------------------------------

    verificationLabel(isVerified) {
      return isVerified === true
        ? "Imethibitishwa"
        : "Haijathibitishwa";
    },

    // -----------------------------------------------------
    // 5. CHECK ADMIN ACCESS
    // -----------------------------------------------------

    async checkAccess() {
      if (!this.client || !auth) {
        this.showMessage(
          "Supabase haijaunganishwa. Kagua admin-auth.js.",
          "error"
        );

        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        this.showMessage(
          "Mfumo wa kuthibitisha admin haujapatikana.",
          "error"
        );

        return false;
      }

      try {
        const result = await auth.checkAccess();

        return result !== false && result !== null;
      } catch (error) {
        console.error(
          "ZUNE Verification: Access check failed:",
          error
        );

        return false;
      }
    },

    // -----------------------------------------------------
    // 6. CACHE HTML ELEMENTS
    // -----------------------------------------------------

    cacheElements() {
      this.elements.tableBody =
        document.getElementById("verificationTableBody");

      this.elements.search =
        document.getElementById("verificationSearchInput");

      this.elements.roleFilter =
        document.getElementById("verificationRoleFilter");

      this.elements.statusFilter =
        document.getElementById("verificationStatusFilter");

      this.elements.count =
        document.getElementById("verificationTotalCount");

      this.elements.message =
        document.getElementById("verificationMessage");

      this.elements.refresh =
        document.getElementById("verificationRefreshBtn");
    },

    // -----------------------------------------------------
    // 7. DISPLAY MESSAGE
    // -----------------------------------------------------

    showMessage(message, type = "info") {
      const element = this.elements.message;

      if (element) {
        element.textContent = message;
        element.dataset.type = type;
        element.hidden = false;
        return;
      }

      if (auth && typeof auth.showMessage === "function") {
        auth.showMessage(message, type);
        return;
      }

      console.log("ZUNE Verification:", message);
    }
  };

  // Make module available to other scripts.
  window.AdminVerification = Verification;

  // SEHEMU YA 2, 3 NA 4 ZITAENDELEA HAPA CHINI.
  // USIWEKE })(); HADI MWISHO WA SEHEMU YA 4.

  console.log(
    "ZUNE Verification: Sehemu ya 1 imepakiwa."
  );

// =========================================================
// 8. LOAD PROFILES FROM SUPABASE
// =========================================================

AdminVerification.loadProfiles = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="5">Inapakia akaunti...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona taarifa za uthibitishaji.",
        "error"
      );
      return;
    }

    const { data, error } = await this.client
      .from("profiles")
      .select(
        "id, full_name, phone_number, role, is_verified, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    this.profiles = Array.isArray(data) ? data : [];

    this.applyFilters();

    this.showMessage(
      `Akaunti ${this.profiles.length} zimepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error(
      "ZUNE Verification: Imeshindikana kupakia akaunti:",
      error
    );

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            Imeshindikana kupakia akaunti.
            Kagua muunganisho na ruhusa za Supabase.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Hitilafu ya kupakia akaunti.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 9. FILTER PROFILES
// =========================================================

AdminVerification.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredProfiles = this.profiles.filter(profile => {
    const searchable = [
      profile.id,
      profile.full_name,
      profile.phone_number,
      profile.role
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !term || searchable.includes(term);

    const normalizedRole =
      String(profile.role || "").toLowerCase();

    const matchesRole =
      this.roleFilter === "all" ||
      normalizedRole === this.roleFilter;

    const isVerified = profile.is_verified === true;

    const matchesVerification =
      this.verificationFilter === "all" ||
      (
        this.verificationFilter === "verified" &&
        isVerified
      ) ||
      (
        this.verificationFilter === "unverified" &&
        !isVerified
      );

    return (
      matchesSearch &&
      matchesRole &&
      matchesVerification
    );
  });

  this.displayProfiles();
};


// =========================================================
// 10. UPDATE PROFILE COUNT
// =========================================================

AdminVerification.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredProfiles.length} kati ya ` +
      `${this.profiles.length} akaunti`;
  }
};


// =========================================================
// 11. DISPLAY VERIFICATION TABLE
// =========================================================

AdminVerification.displayProfiles = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Verification: verificationTableBody haipo."
    );
    return;
  }

  if (this.filteredProfiles.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          Hakuna akaunti zinazolingana na utafutaji.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredProfiles.map(profile => {
    const id = this.escapeHTML(profile.id);
    const name = this.escapeHTML(
      profile.full_name || "Jina halijawekwa"
    );
    const phone = this.escapeHTML(
      profile.phone_number || "Haijawekwa"
    );
    const role = this.escapeHTML(
      this.roleLabel(profile.role)
    );
    const status = this.escapeHTML(
      this.verificationLabel(profile.is_verified)
    );
    const date = this.escapeHTML(
      this.formatDate(profile.created_at)
    );

    const statusClass =
      profile.is_verified === true
        ? "is-verified"
        : "is-pending";

    return `
      <tr>
        <td>
          <strong>${name}</strong>
          <small>${phone}</small>
          <small>${id}</small>
        </td>

        <td>${role}</td>

        <td>
          <span class="admin-status ${statusClass}">
            ${status}
          </span>
        </td>

        <td>${date}</td>

        <td>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-verification-details="${id}"
          >
            Maelezo
          </button>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 12. CACHE PAGE ELEMENTS
// =========================================================

AdminVerification.cacheElements = function () {
  this.elements.tableBody =
    document.getElementById("verificationTableBody");

  this.elements.search =
    document.getElementById("verificationSearchInput");

  this.elements.roleFilter =
    document.getElementById("verificationRoleFilter");

  this.elements.statusFilter =
    document.getElementById("verificationStatusFilter");

  this.elements.count =
    document.getElementById("verificationTotalCount");

  this.elements.message =
    document.getElementById("verificationMessage");

  this.elements.refresh =
    document.getElementById("verificationRefreshBtn");
};


// =========================================================
// 13. SHOW PROFILE DETAILS
// =========================================================

AdminVerification.showProfileDetails = function (profileId) {
  const profile = this.profiles.find(
    item => String(item.id) === String(profileId)
  );

  if (!profile) {
    this.showMessage("Akaunti haijapatikana.", "error");
    return;
  }

  const details = [
    ["Jina", profile.full_name || "Halijawekwa"],
    ["Namba ya simu", profile.phone_number || "Haijawekwa"],
    ["Aina ya akaunti", this.roleLabel(profile.role)],
    [
      "Hali ya uthibitishaji",
      this.verificationLabel(profile.is_verified)
    ],
    ["Tarehe ya kuundwa", this.formatDate(profile.created_at)],
    ["Account ID", profile.id]
  ];

  const safe = value => this.escapeHTML(value);

  const html = `
    <div class="verification-details-list">
      ${details.map(([label, value]) => `
        <div class="verification-detail-row">
          <span>${safe(label)}</span>
          <strong>${safe(value)}</strong>
        </div>
      `).join("")}
    </div>
    <p class="admin-muted">
      Haya ni maelezo yaliyosomwa kutoka Supabase.
      Hakuna taarifa ya akaunti iliyobadilishwa.
    </p>
  `;

  const backdrop = document.getElementById("adminModalBackdrop");
  const modal = document.getElementById("adminModal");
  const title = document.getElementById("adminModalTitle");
  const body = document.getElementById("adminModalBody");
  const actions = document.getElementById("adminModalActions");

  if (!backdrop || !modal || !title || !body) {
    this.showMessage(
      "Dirisha la maelezo halipatikani kwenye index.html.",
      "error"
    );
    return;
  }

  title.textContent = "Maelezo ya Akaunti";
  body.innerHTML = html;

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        class="admin-btn admin-btn-primary"
        id="verificationDetailsClose"
      >
        Funga
      </button>
    `;

    const closeButton = document.getElementById(
      "verificationDetailsClose"
    );

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        backdrop.hidden = true;
        modal.hidden = true;
      });
    }
  }

  backdrop.hidden = false;
  modal.hidden = false;
};


// =========================================================
// 14. CONNECT SEARCH AND FILTER CONTROLS
// =========================================================

AdminVerification.connectControls = function () {
  const search = this.elements.search;
  const roleFilter = this.elements.roleFilter;
  const statusFilter = this.elements.statusFilter;
  const refresh = this.elements.refresh;
  const body = this.elements.tableBody;

  if (search && !search.dataset.verificationBound) {
    search.dataset.verificationBound = "true";

    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });
  }

  if (roleFilter && !roleFilter.dataset.verificationBound) {
    roleFilter.dataset.verificationBound = "true";

    roleFilter.addEventListener("change", () => {
      this.roleFilter = String(
        roleFilter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (statusFilter && !statusFilter.dataset.verificationBound) {
    statusFilter.dataset.verificationBound = "true";

    statusFilter.addEventListener("change", () => {
      this.verificationFilter = String(
        statusFilter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (refresh && !refresh.dataset.verificationBound) {
    refresh.dataset.verificationBound = "true";

    refresh.addEventListener("click", () => {
      this.loadProfiles();
    });
  }

  if (body && !body.dataset.verificationBound) {
    body.dataset.verificationBound = "true";

    body.addEventListener("click", event => {
      const button = event.target.closest(
        "[data-verification-details]"
      );

      if (!button) return;

      this.showProfileDetails(
        button.getAttribute("data-verification-details")
      );
    });
  }
};


// =========================================================
// 15. RESET FILTERS
// =========================================================

AdminVerification.resetFilters = function () {
  this.searchTerm = "";
  this.roleFilter = "all";
  this.verificationFilter = "all";

  if (this.elements.search) {
    this.elements.search.value = "";
  }

  if (this.elements.roleFilter) {
    this.elements.roleFilter.value = "all";
  }

  if (this.elements.statusFilter) {
    this.elements.statusFilter.value = "all";
  }

  this.applyFilters();
};

// =========================================================
// 16. INITIALIZE VERIFICATION MODULE
// =========================================================

AdminVerification.initialize = async function () {
  if (this.initialized) {
    await this.loadProfiles();
    return;
  }

  this.cacheElements();
  this.connectControls();

  this.initialized = true;

  await this.loadProfiles();

  console.log(
    "ZUNE Verification: Module imeanzishwa."
  );
};


// =========================================================
// 17. PUBLIC REFRESH FUNCTION
// =========================================================

AdminVerification.refresh = async function () {
  await this.loadProfiles();
};


// =========================================================
// 18. NAVIGATION SUPPORT
// =========================================================

document.addEventListener("click", event => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  const page = navLink.getAttribute("data-page");

  if (page === "verification") {
    AdminVerification.initialize();
  }
});


// =========================================================
// 19. START WHEN DOCUMENT IS READY
// =========================================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminVerification.initialize(),
    { once: true }
  );
} else {
  AdminVerification.initialize();
}


// =========================================================
// END OF admin-verification.js
// =========================================================

})();
