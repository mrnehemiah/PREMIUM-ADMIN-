
/* =========================================================
   ZUNE PREMIUM ADMIN
   admin-sellers.js — SEHEMU YA 1/4
   Seller Management Configuration
   ========================================================= */

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Sellers = {
    client: auth ? auth.client : null,
    initialized: false,
    loading: false,
    applications: [],
    filteredApplications: [],
    searchTerm: "",
    statusFilter: "all",
    elements: {},

    escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    },

    formatDate(value) {
      if (!value) return "Haijapatikana";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Haijapatikana";
      }

      return new Intl.DateTimeFormat("sw-TZ", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    },

    statusLabel(status) {
      const labels = {
        pending: "Inasubiri",
        approved: "Imekubaliwa",
        rejected: "Imekataliwa",
        accepted: "Imekubaliwa"
      };

      return labels[String(status || "").toLowerCase()]
        || status
        || "Haijulikani";
    },

    async checkAccess() {
      if (!auth || !this.client) {
        console.error(
          "ZUNE Sellers: AdminAuth/Supabase haipatikani."
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        console.error(
          "ZUNE Sellers: checkAccess() haipatikani."
        );
        return false;
      }

      try {
        return Boolean(await auth.checkAccess());
      } catch (error) {
        console.error(
          "ZUNE Sellers: Imeshindikana kuthibitisha admin.",
          error
        );
        return false;
      }
    },

    cacheElements() {
      this.elements = {
        tableBody: document.getElementById("sellersTableBody"),
        search: document.getElementById("sellersSearchInput"),
        status: document.getElementById("sellersStatusFilter"),
        count: document.getElementById("sellersTotalCount"),
        message: document.getElementById("sellersMessage"),
        refresh: document.getElementById("sellersRefreshBtn")
      };
    },

    showMessage(message, type = "info") {
      const element = this.elements.message;

      if (element) {
        element.textContent = message;
        element.dataset.type = type;
        element.hidden = false;
      } else if (auth && typeof auth.showMessage === "function") {
        auth.showMessage(message, type);
      } else {
        console.log(message);
      }
    }
  };

  window.AdminSellers = Sellers;

  // Sehemu ya 2, 3 na 4 itaendelea ndani ya IIFE hii.
  // Usiongeze })(); mwishoni mwa sehemu hii.

// =========================================================
// 2. LOAD SELLER APPLICATIONS FROM SUPABASE
// =========================================================

AdminSellers.loadApplications = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia maombi ya wauzaji...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona maombi ya wauzaji.",
        "error"
      );
      return;
    }

    const { data, error } = await this.client
      .from("seller_applications")
      .select(
        "id, store_name, owner_name, phone, country, city, category, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    this.applications = Array.isArray(data) ? data : [];

    this.applyFilters();

    this.showMessage(
      `Maombi ${this.applications.length} yamepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error(
      "ZUNE Sellers: Imeshindikana kupakia maombi:",
      error
    );

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Imeshindikana kupakia maombi. Kagua ruhusa za
            Supabase na majina ya safu za jedwali.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Hitilafu wakati wa kupakia maombi.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 3. FILTER APPLICATIONS
// =========================================================

AdminSellers.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredApplications = this.applications.filter(
    (application) => {
      const searchable = [
        application.store_name,
        application.owner_name,
        application.phone,
        application.country,
        application.city,
        application.category,
        application.id
      ].join(" ").toLowerCase();

      const matchesSearch =
        !term || searchable.includes(term);

      const status = String(
        application.status || "pending"
      ).toLowerCase();

      const matchesStatus =
        this.statusFilter === "all" ||
        status === this.statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  this.displayApplications();
};


// =========================================================
// 4. UPDATE APPLICATION COUNT
// =========================================================

AdminSellers.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredApplications.length} kati ya ` +
      `${this.applications.length} maombi`;
  }
};


// =========================================================
// 5. DISPLAY APPLICATIONS
// =========================================================

AdminSellers.displayApplications = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Sellers: sellersTableBody haipo kwenye index.html."
    );
    return;
  }

  if (this.filteredApplications.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna maombi ya wauzaji yanayolingana na vigezo.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredApplications.map((application) => {
    const id = this.escapeHTML(application.id);
    const store = this.escapeHTML(
      application.store_name || "Duka halina jina"
    );
    const owner = this.escapeHTML(
      application.owner_name || "Haijatajwa"
    );
    const phone = this.escapeHTML(
      application.phone || "Haijawekwa"
    );
    const location = this.escapeHTML(
      [application.city, application.country]
        .filter(Boolean)
        .join(", ") || "Haijatajwa"
    );
    const status = this.escapeHTML(
      this.statusLabel(application.status)
    );
    const date = this.escapeHTML(
      this.formatDate(application.created_at)
    );

    const normalizedStatus = String(
      application.status || "pending"
    ).toLowerCase();

    const statusClass =
      normalizedStatus === "approved" ||
      normalizedStatus === "accepted"
        ? "is-verified"
        : normalizedStatus === "rejected"
          ? "is-rejected"
          : "is-pending";

    return `
      <tr>
        <td>
          <strong>${store}</strong>
          <small>${id}</small>
        </td>
        <td>${owner}</td>
        <td>${phone}</td>
        <td>${location}</td>
        <td>
          <span class="admin-status ${statusClass}">
            ${status}
          </span>
        </td>
        <td>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-seller-details="${id}"
          >
            Maelezo
          </button>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 6. SHOW SELLER APPLICATION DETAILS
// =========================================================

AdminSellers.showApplicationDetails = function (applicationId) {
  const application = this.applications.find(
    (item) => String(item.id) === String(applicationId)
  );

  if (!application) {
    this.showMessage("Ombi halijapatikana.", "error");
    return;
  }

  const details = `
    <div class="admin-seller-details">
      <p><strong>Jina la duka:</strong>
        ${this.escapeHTML(application.store_name || "Halijawekwa")}
      </p>

      <p><strong>Mmiliki:</strong>
        ${this.escapeHTML(application.owner_name || "Hajatajwa")}
      </p>

      <p><strong>Simu:</strong>
        ${this.escapeHTML(application.phone || "Haijawekwa")}
      </p>

      <p><strong>Nchi:</strong>
        ${this.escapeHTML(application.country || "Haijatajwa")}
      </p>

      <p><strong>Mji:</strong>
        ${this.escapeHTML(application.city || "Haijatajwa")}
      </p>

      <p><strong>Kategoria:</strong>
        ${this.escapeHTML(application.category || "Haijatajwa")}
      </p>

      <p><strong>Hali ya ombi:</strong>
        ${this.escapeHTML(this.statusLabel(application.status))}
      </p>

      <p><strong>Tarehe ya maombi:</strong>
        ${this.escapeHTML(this.formatDate(application.created_at))}
      </p>

      <p><strong>Application ID:</strong>
        ${this.escapeHTML(application.id)}
      </p>
    </div>
  `;

  if (
    window.ZUNEAdmin &&
    typeof window.ZUNEAdmin.openModal === "function"
  ) {
    window.ZUNEAdmin.openModal(
      "Maelezo ya Ombi la Muuzaji",
      details
    );
    return;
  }

  window.alert(
    [
      `Duka: ${application.store_name || "Halijawekwa"}`,
      `Mmiliki: ${application.owner_name || "Hajatajwa"}`,
      `Simu: ${application.phone || "Haijawekwa"}`,
      `Nchi: ${application.country || "Haijatajwa"}`,
      `Mji: ${application.city || "Haijatajwa"}`,
      `Hali: ${this.statusLabel(application.status)}`,
      `ID: ${application.id}`
    ].join("\n")
  );
};


// =========================================================
// 7. CONNECT SEARCH, FILTER AND REFRESH
// =========================================================

AdminSellers.connectControls = function () {
  const search = this.elements.search;
  const status = this.elements.status;
  const refresh = this.elements.refresh;
  const body = this.elements.tableBody;

  if (search && !search.dataset.sellersBound) {
    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });

    search.dataset.sellersBound = "true";
  }

  if (status && !status.dataset.sellersBound) {
    status.addEventListener("change", () => {
      this.statusFilter = status.value || "all";
      this.applyFilters();
    });

    status.dataset.sellersBound = "true";
  }

  if (refresh && !refresh.dataset.sellersBound) {
    refresh.addEventListener("click", () => {
      this.loadApplications();
    });

    refresh.dataset.sellersBound = "true";
  }

  if (body && !body.dataset.sellersBound) {
    body.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-seller-details]"
      );

      if (!button) return;

      this.showApplicationDetails(
        button.getAttribute("data-seller-details")
      );
    });

    body.dataset.sellersBound = "true";
  }
};


// =========================================================
// 8. INITIALIZE SELLER MANAGEMENT
// =========================================================

AdminSellers.initialize = async function () {
  if (this.initialized) return;

  this.cacheElements();
  this.connectControls();

  const allowed = await this.checkAccess();

  if (!allowed) {
    this.showMessage(
      "Ingia kwa akaunti ya admin yenye ruhusa.",
      "error"
    );
    return;
  }

  await this.loadApplications();

  this.initialized = true;
};


// =========================================================
// 9. REFRESH SELLER APPLICATIONS
// =========================================================

AdminSellers.refresh = async function () {
  this.cacheElements();
  await this.loadApplications();
};

// =========================================================
// 10. HANDLE SELLERS PAGE NAVIGATION
// =========================================================

AdminSellers.onPageOpen = async function () {
  if (!this.initialized) {
    await this.initialize();
    return;
  }

  await this.loadApplications();
};


// =========================================================
// 11. STARTUP
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
  AdminSellers.cacheElements();
  AdminSellers.connectControls();

  const sellerLinks = document.querySelectorAll(
    '[data-page="sellers"]'
  );

  sellerLinks.forEach((link) => {
    if (link.dataset.sellersNavigationBound) return;

    link.addEventListener("click", function () {
      window.setTimeout(() => {
        AdminSellers.onPageOpen();
      }, 100);
    });

    link.dataset.sellersNavigationBound = "true";
  });

  const sellerPage = document.getElementById("page-sellers");

  if (sellerPage && sellerPage.classList.contains("active")) {
    AdminSellers.initialize();
  }
});


// =========================================================
// 12. GLOBAL REFRESH FUNCTION
// =========================================================

window.refreshZuneAdminSellers = function () {
  return AdminSellers.refresh();
};


// =========================================================
// 13. FILE COMPLETE
// =========================================================

console.log(
  "ZUNE Sellers: admin-sellers.js imepakiwa."
);

})();
