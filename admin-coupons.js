
// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-coupons.js
// SEHEMU YA 1/4
// =========================================================

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Coupons = {
    client: auth ? auth.client : null,

    initialized: false,
    loading: false,
    saving: false,

    coupons: [],
    filteredCoupons: [],

    searchTerm: "",
    statusFilter: "all",

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
    // 2. FORMAT MONEY
    // -----------------------------------------------------

    formatMoney(value) {
      const amount = Number(value);

      if (!Number.isFinite(amount)) {
        return "TZS 0";
      }

      return new Intl.NumberFormat("sw-TZ", {
        style: "currency",
        currency: "TZS",
        maximumFractionDigits: 0
      }).format(amount);
    },

    // -----------------------------------------------------
    // 3. FORMAT DATE
    // -----------------------------------------------------

    formatDate(value) {
      if (!value) return "Haijawekwa";

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
    // 4. NORMALIZE COUPON CODE
    // -----------------------------------------------------

    normalizeCode(value) {
      return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
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
          "ZUNE Coupons: Access check failed:",
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
        document.getElementById("couponsTableBody");

      this.elements.search =
        document.getElementById("couponsSearchInput");

      this.elements.statusFilter =
        document.getElementById("couponsStatusFilter");

      this.elements.count =
        document.getElementById("couponsTotalCount");

      this.elements.message =
        document.getElementById("couponsMessage");

      this.elements.refresh =
        document.getElementById("couponsRefreshBtn");

      this.elements.create =
        document.getElementById("couponCreateBtn");

      this.elements.form =
        document.getElementById("couponForm");
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

      console.log("ZUNE Coupons:", message);
    }
  };

  // Expose module for other admin scripts.
  window.AdminCoupons = Coupons;

  // SEHEMU YA 2, 3 NA 4 ZITAENDELEA HAPA CHINI.
  // USIONGEZE })(); HADI MWISHO WA SEHEMU YA 4.

  console.log(
    "ZUNE Coupons: Sehemu ya 1 imepakiwa."
  );

// =========================================================
// 8. LOAD COUPONS
// =========================================================

AdminCoupons.loadCoupons = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia kuponi...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona kuponi.",
        "error"
      );
      return;
    }

    /*
      Hakuna jedwali la coupons lililothibitishwa bado.
      Hatufanyi query ya jedwali lisilothibitishwa,
      ili kuepuka kudhani schema isiyokuwepo.
    */

    this.coupons = [];
    this.applyFilters();

    this.showMessage(
      "Muundo wa jedwali la kuponi unahitaji kuthibitishwa kabla ya kuunganisha database.",
      "info"
    );

  } catch (error) {
    console.error(
      "ZUNE Coupons: Load error:",
      error
    );

    this.showMessage(
      error.message || "Imeshindikana kupakia kuponi.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 9. FILTER COUPONS
// =========================================================

AdminCoupons.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredCoupons = this.coupons.filter(coupon => {
    const searchable = [
      coupon.code,
      coupon.description,
      coupon.discount_type
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !term || searchable.includes(term);

    const active = coupon.is_active === true;

    const matchesStatus =
      this.statusFilter === "all" ||
      (
        this.statusFilter === "active" &&
        active
      ) ||
      (
        this.statusFilter === "inactive" &&
        !active
      );

    return matchesSearch && matchesStatus;
  });

  this.displayCoupons();
};


// =========================================================
// 10. UPDATE COUPON COUNT
// =========================================================

AdminCoupons.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredCoupons.length} kati ya ` +
      `${this.coupons.length} kuponi`;
  }
};


// =========================================================
// 11. DISPLAY COUPONS
// =========================================================

AdminCoupons.displayCoupons = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Coupons: couponsTableBody haipo kwenye index.html."
    );
    return;
  }

  if (this.filteredCoupons.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna kuponi za kuonyesha. Hakikisha jedwali la
          kuponi limeunganishwa kabla ya kuunda kuponi mpya.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredCoupons.map(coupon => {
    const code = this.escapeHTML(coupon.code);
    const description = this.escapeHTML(
      coupon.description || "Hakuna maelezo"
    );

    const discount = this.escapeHTML(
      coupon.discount_type === "percentage"
        ? `${coupon.discount_value}%`
        : this.formatMoney(coupon.discount_value)
    );

    const status = coupon.is_active === true
      ? "Inatumika"
      : "Haifanyi kazi";

    const statusClass = coupon.is_active === true
      ? "is-verified"
      : "is-pending";

    const expiry = this.escapeHTML(
      this.formatDate(coupon.expires_at)
    );

    return `
      <tr>
        <td>
          <strong>${code}</strong>
          <small>${description}</small>
        </td>

        <td>${discount}</td>

        <td>
          <span class="admin-status ${statusClass}">
            ${status}
          </span>
        </td>

        <td>${expiry}</td>

        <td>
          <span class="admin-muted">
            ${this.escapeHTML(coupon.usage_count ?? 0)}
          </span>
        </td>

        <td>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-coupon-details="${this.escapeHTML(coupon.id)}"
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

AdminCoupons.cacheElements = function () {
  this.elements.tableBody =
    document.getElementById("couponsTableBody");

  this.elements.search =
    document.getElementById("couponsSearchInput");

  this.elements.statusFilter =
    document.getElementById("couponsStatusFilter");

  this.elements.count =
    document.getElementById("couponsTotalCount");

  this.elements.message =
    document.getElementById("couponsMessage");

  this.elements.refresh =
    document.getElementById("couponsRefreshBtn");

  this.elements.create =
    document.getElementById("couponCreateBtn");

  this.elements.form =
    document.getElementById("couponForm");
};


// =========================================================
// 13. SHOW COUPON DETAILS
// =========================================================

AdminCoupons.showCouponDetails = function (couponId) {
  const coupon = this.coupons.find(
    item => String(item.id) === String(couponId)
  );

  if (!coupon) {
    this.showMessage(
      "Kuponi haijapatikana.",
      "error"
    );
    return;
  }

  const details = [
    ["Code", coupon.code],
    ["Maelezo", coupon.description],
    ["Aina ya punguzo", coupon.discount_type],
    ["Thamani ya punguzo", coupon.discount_value],
    ["Hali", coupon.is_active ? "Inatumika" : "Haifanyi kazi"],
    ["Mwisho wa matumizi", coupon.expires_at],
    ["Idadi ya matumizi", coupon.usage_count]
  ];

  const html = `
    <div class="coupon-details-list">
      ${details.map(([label, value]) => `
        <div class="coupon-detail-row">
          <span>${this.escapeHTML(label)}</span>
          <strong>${this.escapeHTML(value ?? "Haijatajwa")}</strong>
        </div>
      `).join("")}
    </div>
    <p class="admin-muted">
      Maelezo haya yanaonyeshwa tu. Hakuna taarifa
      iliyobadilishwa kwenye database.
    </p>
  `;

  const backdrop = document.getElementById(
    "adminModalBackdrop"
  );
  const modal = document.getElementById("adminModal");
  const title = document.getElementById("adminModalTitle");
  const body = document.getElementById("adminModalBody");
  const actions = document.getElementById("adminModalActions");

  if (!backdrop || !modal || !title || !body) {
    this.showMessage(
      "Modal ya maelezo haipatikani kwenye index.html.",
      "error"
    );
    return;
  }

  title.textContent = "Maelezo ya Kuponi";
  body.innerHTML = html;

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        class="admin-btn admin-btn-primary"
        id="couponDetailsClose"
      >
        Funga
      </button>
    `;

    document.getElementById("couponDetailsClose")
      ?.addEventListener("click", () => {
        backdrop.hidden = true;
        modal.hidden = true;
      });
  }

  backdrop.hidden = false;
  modal.hidden = false;
};


// =========================================================
// 14. CONNECT SEARCH, FILTER AND REFRESH
// =========================================================

AdminCoupons.connectControls = function () {
  const search = this.elements.search;
  const filter = this.elements.statusFilter;
  const refresh = this.elements.refresh;
  const body = this.elements.tableBody;

  if (search && !search.dataset.couponsBound) {
    search.dataset.couponsBound = "true";

    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });
  }

  if (filter && !filter.dataset.couponsBound) {
    filter.dataset.couponsBound = "true";

    filter.addEventListener("change", () => {
      this.statusFilter = String(
        filter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (refresh && !refresh.dataset.couponsBound) {
    refresh.dataset.couponsBound = "true";

    refresh.addEventListener("click", () => {
      this.loadCoupons();
    });
  }

  if (body && !body.dataset.couponsBound) {
    body.dataset.couponsBound = "true";

    body.addEventListener("click", event => {
      const button = event.target.closest(
        "[data-coupon-details]"
      );

      if (!button) return;

      this.showCouponDetails(
        button.getAttribute("data-coupon-details")
      );
    });
  }
};


// =========================================================
// 15. RESET FILTERS
// =========================================================

AdminCoupons.resetFilters = function () {
  this.searchTerm = "";
  this.statusFilter = "all";

  if (this.elements.search) {
    this.elements.search.value = "";
  }

  if (this.elements.statusFilter) {
    this.elements.statusFilter.value = "all";
  }

  this.applyFilters();
};

// =========================================================
// 16. INITIALIZE COUPONS MODULE
// =========================================================

AdminCoupons.initialize = async function () {
  if (this.initialized) {
    await this.loadCoupons();
    return;
  }

  this.cacheElements();
  this.connectControls();

  this.initialized = true;

  await this.loadCoupons();

  console.log(
    "ZUNE Coupons: Module imeanzishwa."
  );
};


// =========================================================
// 17. PUBLIC REFRESH FUNCTION
// =========================================================

AdminCoupons.refresh = async function () {
  await this.loadCoupons();
};


// =========================================================
// 18. NAVIGATION SUPPORT
// =========================================================

document.addEventListener("click", event => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  const page = navLink.getAttribute("data-page");

  if (page === "coupons") {
    AdminCoupons.initialize();
  }
});


// =========================================================
// 19. START WHEN DOCUMENT IS READY
// =========================================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminCoupons.initialize(),
    { once: true }
  );
} else {
  AdminCoupons.initialize();
}


// =========================================================
// END OF admin-coupons.js
// =========================================================

})();
