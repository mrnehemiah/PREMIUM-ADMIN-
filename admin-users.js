
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-users.js — SEHEMU YA 1/4
   User Management + Supabase Connection
   ========================================================= */

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Users = {
    client: auth ? auth.client : null,
    initialized: false,
    loading: false,
    allUsers: [],
    filteredUsers: [],
    currentFilter: "all",
    searchTerm: "",

    elements: {},

    // -------------------------------------------------------
    // 1. FORMAT HELPERS
    // -------------------------------------------------------

    escapeHTML(value) {
      return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {
          const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          };

          return entities[character];
        }
      );
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

    getRoleLabel(role) {
      const roles = {
        buyer: "Mteja",
        vendor: "Muuzaji",
        admin: "Admin"
      };

      return roles[role] || "Haijulikani";
    },

    getVerificationLabel(isVerified) {
      return isVerified ? "Imethibitishwa" : "Haijathibitishwa";
    },

    // -------------------------------------------------------
    // 2. CHECK ADMIN ACCESS
    // -------------------------------------------------------

    async checkAccess() {
      if (!this.client || !auth) {
        console.error(
          "ZUNE Users: Supabase au AdminAuth haipatikani."
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        console.error(
          "ZUNE Users: AdminAuth.checkAccess() haipo."
        );
        return false;
      }

      try {
        return Boolean(await auth.checkAccess());
      } catch (error) {
        console.error(
          "ZUNE Users: Imeshindikana kuthibitisha ruhusa.",
          error
        );
        return false;
      }
    },

    // -------------------------------------------------------
    // 3. CACHE PAGE ELEMENTS
    // -------------------------------------------------------

    cacheElements() {
      this.elements = {
        tableBody: document.getElementById("usersTableBody"),
        searchInput: document.getElementById("usersSearchInput"),
        roleFilter: document.getElementById("usersRoleFilter"),
        verificationFilter: document.getElementById(
          "usersVerificationFilter"
        ),
        count: document.getElementById("usersTotalCount"),
        message: document.getElementById("usersMessage"),
        refreshButton: document.getElementById("usersRefreshBtn")
      };
    },

    // -------------------------------------------------------
    // 4. SHOW MESSAGE
    // -------------------------------------------------------

    showMessage(message, type) {
      const element = this.elements.message;

      if (element) {
        element.textContent = message;
        element.dataset.type = type || "info";
        element.hidden = false;
        return;
      }

      if (auth && typeof auth.showMessage === "function") {
        auth.showMessage(message, type || "info");
      } else {
        console.log(message);
      }
    }
  };

  // Tutakamilisha njia za kusoma na kuonyesha watumiaji
  // katika Sehemu ya 2, 3 na 4.

  window.AdminUsers = Users;

  console.log("ZUNE Users: Sehemu ya 1 imepakiwa.");

  // USIWEKE })(); HAPA.
  // Tutafunga IIFE mara moja tu katika Sehemu ya 4.


// =========================================================
// 5. LOAD USERS FROM SUPABASE
// =========================================================

AdminUsers.loadUsers = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia watumiaji...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona orodha ya watumiaji.",
        "error"
      );
      return;
    }

    if (!this.client) {
      throw new Error("Muunganisho wa Supabase haupatikani.");
    }

    const { data, error } = await this.client
      .from("profiles")
      .select("id, full_name, phone_number, role, is_verified, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    this.allUsers = Array.isArray(data) ? data : [];

    this.applyFilters();

    this.showMessage(
      `Watumiaji ${this.allUsers.length} wamepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error("ZUNE Users: Load failed:", error);

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Imeshindikana kupakia watumiaji. Hakikisha ruhusa
            za SELECT za Supabase zimewekwa kwa admin.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Imeshindikana kupakia watumiaji.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 6. FILTER USERS
// =========================================================

AdminUsers.applyFilters = function () {
  const search = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredUsers = this.allUsers.filter((user) => {
    const matchesSearch =
      !search ||
      String(user.full_name || "").toLowerCase().includes(search) ||
      String(user.phone_number || "").toLowerCase().includes(search) ||
      String(user.id || "").toLowerCase().includes(search);

    const matchesRole =
      this.currentFilter === "all" ||
      user.role === this.currentFilter;

    const verificationValue =
      this.elements.verificationFilter?.value || "all";

    const matchesVerification =
      verificationValue === "all" ||
      (verificationValue === "verified" && user.is_verified === true) ||
      (verificationValue === "unverified" && user.is_verified !== true);

    return (
      matchesSearch &&
      matchesRole &&
      matchesVerification
    );
  });

  this.displayUsers();
};


// =========================================================
// 7. UPDATE USER COUNT
// =========================================================

AdminUsers.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredUsers.length} kati ya ${this.allUsers.length} watumiaji`;
  }
};


// =========================================================
// 8. DISPLAY USERS TABLE
// =========================================================

AdminUsers.displayUsers = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Users: Element usersTableBody haipo kwenye index.html."
    );
    return;
  }

  if (this.filteredUsers.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">Hakuna watumiaji wanaolingana na utafutaji.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredUsers.map((user) => {
    const name = this.escapeHTML(
      user.full_name || "Bila jina"
    );

    const phone = this.escapeHTML(
      user.phone_number || "Haijawekwa"
    );

    const role = this.escapeHTML(
      this.getRoleLabel(user.role)
    );

    const verification = this.escapeHTML(
      this.getVerificationLabel(user.is_verified)
    );

    const createdAt = this.escapeHTML(
      this.formatDate(user.created_at)
    );

    const userId = this.escapeHTML(user.id);

    return `
      <tr>
        <td>
          <div class="admin-user-name">${name}</div>
          <small>${userId}</small>
        </td>
        <td>${phone}</td>
        <td>${role}</td>
        <td>
          <span class="admin-status ${
            user.is_verified ? "is-verified" : "is-pending"
          }">${verification}</span>
        </td>
        <td>${createdAt}</td>
        <td>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-user-details="${userId}"
          >
            Maelezo
          </button>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 9. OPEN USER DETAILS
// =========================================================

AdminUsers.openUserDetails = async function (userId) {
  const user = this.allUsers.find(
    (item) => String(item.id) === String(userId)
  );

  if (!user) {
    this.showMessage("Mtumiaji hakupatikana.", "error");
    return;
  }

  const details = `
    <div class="admin-user-details">
      <p><strong>Jina:</strong> ${this.escapeHTML(
        user.full_name || "Bila jina"
      )}</p>

      <p><strong>User ID:</strong> ${this.escapeHTML(
        user.id
      )}</p>

      <p><strong>Namba ya simu:</strong> ${this.escapeHTML(
        user.phone_number || "Haijawekwa"
      )}</p>

      <p><strong>Aina ya akaunti:</strong> ${this.escapeHTML(
        this.getRoleLabel(user.role)
      )}</p>

      <p><strong>Uthibitishaji:</strong> ${this.escapeHTML(
        this.getVerificationLabel(user.is_verified)
      )}</p>

      <p><strong>Tarehe ya kujiunga:</strong> ${this.escapeHTML(
        this.formatDate(user.created_at)
      )}</p>
    </div>
  `;

  // Tumia modal ya dashboard ikiwa inapatikana.
  if (
    window.ZUNEAdmin &&
    typeof window.ZUNEAdmin.openModal === "function"
  ) {
    window.ZUNEAdmin.openModal(
      "Maelezo ya Mtumiaji",
      details
    );
    return;
  }

  // Fallback salama kama modal haipo.
  const message = [
    `Jina: ${user.full_name || "Bila jina"}`,
    `User ID: ${user.id}`,
    `Simu: ${user.phone_number || "Haijawekwa"}`,
    `Aina: ${this.getRoleLabel(user.role)}`,
    `Uthibitishaji: ${this.getVerificationLabel(user.is_verified)}`,
    `Tarehe: ${this.formatDate(user.created_at)}`
  ].join("\n");

  window.alert(message);
};


// =========================================================
// 10. CONNECT SEARCH AND FILTERS
// =========================================================

AdminUsers.connectControls = function () {
  const searchInput = this.elements.searchInput;
  const roleFilter = this.elements.roleFilter;
  const verificationFilter = this.elements.verificationFilter;
  const refreshButton = this.elements.refreshButton;

  if (searchInput && !searchInput.dataset.usersBound) {
    searchInput.addEventListener("input", () => {
      this.searchTerm = searchInput.value || "";
      this.applyFilters();
    });

    searchInput.dataset.usersBound = "true";
  }

  if (roleFilter && !roleFilter.dataset.usersBound) {
    roleFilter.addEventListener("change", () => {
      this.currentFilter = roleFilter.value || "all";
      this.applyFilters();
    });

    roleFilter.dataset.usersBound = "true";
  }

  if (
    verificationFilter &&
    !verificationFilter.dataset.usersBound
  ) {
    verificationFilter.addEventListener("change", () => {
      this.applyFilters();
    });

    verificationFilter.dataset.usersBound = "true";
  }

  if (refreshButton && !refreshButton.dataset.usersBound) {
    refreshButton.addEventListener("click", async () => {
      await this.loadUsers();
    });

    refreshButton.dataset.usersBound = "true";
  }

  const tableBody = this.elements.tableBody;

  if (tableBody && !tableBody.dataset.usersBound) {
    tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-user-details]");

      if (!button) return;

      this.openUserDetails(
        button.getAttribute("data-user-details")
      );
    });

    tableBody.dataset.usersBound = "true";
  }
};


// =========================================================
// 11. INITIALIZE USER MANAGEMENT
// =========================================================

AdminUsers.initialize = async function () {
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

  await this.loadUsers();
  this.initialized = true;
};


// =========================================================
// 12. RELOAD USER LIST
// =========================================================

AdminUsers.refresh = async function () {
  this.cacheElements();
  await this.loadUsers();
};

// =========================================================
// 13. BIND SEARCH AND FILTER CONTROLS
// =========================================================

AdminUsers.connectControls = function () {
  const searchInput = this.elements.searchInput;
  const roleFilter = this.elements.roleFilter;
  const verificationFilter = this.elements.verificationFilter;
  const refreshButton = this.elements.refreshButton;
  const tableBody = this.elements.tableBody;

  if (searchInput && !searchInput.dataset.usersBound) {
    searchInput.addEventListener("input", () => {
      this.searchTerm = searchInput.value;
      this.applyFilters();
    });

    searchInput.dataset.usersBound = "true";
  }

  if (roleFilter && !roleFilter.dataset.usersBound) {
    roleFilter.addEventListener("change", () => {
      this.currentFilter = roleFilter.value || "all";
      this.applyFilters();
    });

    roleFilter.dataset.usersBound = "true";
  }

  if (
    verificationFilter &&
    !verificationFilter.dataset.usersBound
  ) {
    verificationFilter.addEventListener("change", () => {
      this.applyFilters();
    });

    verificationFilter.dataset.usersBound = "true";
  }

  if (refreshButton && !refreshButton.dataset.usersBound) {
    refreshButton.addEventListener("click", () => {
      this.loadUsers();
    });

    refreshButton.dataset.usersBound = "true";
  }

  if (tableBody && !tableBody.dataset.usersBound) {
    tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-user-details]");

      if (!button) return;

      this.showUserDetails(button.dataset.userDetails);
    });

    tableBody.dataset.usersBound = "true";
  }
};


// =========================================================
// 14. SHOW USER DETAILS
// =========================================================

AdminUsers.showUserDetails = function (userId) {
  const user = this.allUsers.find(
    (item) => String(item.id) === String(userId)
  );

  if (!user) {
    this.showMessage(
      "Taarifa za mtumiaji huyo hazijapatikana.",
      "error"
    );
    return;
  }

  const details = [
    `Jina: ${user.full_name || "Bila jina"}`,
    `Namba ya simu: ${user.phone_number || "Haijawekwa"}`,
    `Aina ya akaunti: ${this.getRoleLabel(user.role)}`,
    `Uthibitishaji: ${this.getVerificationLabel(user.is_verified)}`,
    `Tarehe ya kujiunga: ${this.formatDate(user.created_at)}`,
    `ID: ${user.id}`
  ].join("\n");

  // Tumia modal iliyopo ikiwa app.js imeiweka.
  if (
    window.ZUNEAdmin &&
    typeof window.ZUNEAdmin.openModal === "function"
  ) {
    window.ZUNEAdmin.openModal({
      title: "Maelezo ya Mtumiaji",
      body: details
    });
    return;
  }

  // Fallback salama: maelezo yanaonyeshwa bila HTML.
  window.alert(details);
};


// =========================================================
// 15. INITIALIZE USERS PAGE
// =========================================================

AdminUsers.initialize = async function () {
  if (this.initialized) return;

  this.cacheElements();
  this.connectControls();

  const allowed = await this.checkAccess();

  if (!allowed) {
    this.showMessage(
      "Ingia kwa akaunti yenye ruhusa ya admin ili kuona watumiaji.",
      "error"
    );
    return;
  }

  await this.loadUsers();

  this.initialized = true;
};


// =========================================================
// 16. PAGE NAVIGATION + STARTUP
// =========================================================

AdminUsers.onPageOpen = async function () {
  if (!this.initialized) {
    await this.initialize();
    return;
  }

  await this.loadUsers();
};

document.addEventListener("DOMContentLoaded", function () {
  AdminUsers.cacheElements();
  AdminUsers.connectControls();

  const usersNavLinks = document.querySelectorAll(
    '[data-page="users"]'
  );

  usersNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(() => {
        AdminUsers.onPageOpen();
      }, 100);
    });
  });

  // Kama sehemu ya watumiaji imefunguliwa tayari,
  // jaribu kuanzisha ukurasa.
  const usersPage = document.getElementById("page-users");

  if (usersPage && usersPage.classList.contains("active")) {
    AdminUsers.initialize();
  }
});

console.log("ZUNE Users: Sehemu zote nne zimepakiwa.");

})();
