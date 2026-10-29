
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-orders.js — SEHEMU YA 1/4
   Order Management + Supabase
   ========================================================= */

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Orders = {
    client: auth ? auth.client : null,
    initialized: false,
    loading: false,
    orders: [],
    filteredOrders: [],
    searchTerm: "",
    statusFilter: "all",
    elements: {},

    // -------------------------------------------------------
    // 1. ESCAPE HTML
    // -------------------------------------------------------

    escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    },

    // -------------------------------------------------------
    // 2. FORMAT MONEY
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 3. FORMAT DATE
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 4. ORDER STATUS LABEL
    // -------------------------------------------------------

    statusLabel(status) {
      const labels = {
        pending: "Inasubiri",
        confirmed: "Imethibitishwa",
        completed: "Imekamilika",
        cancelled: "Imeghairiwa"
      };

      return labels[String(status || "").toLowerCase()]
        || status
        || "Haijulikani";
    },

    // -------------------------------------------------------
    // 5. CHECK ADMIN ACCESS
    // -------------------------------------------------------

    async checkAccess() {
      if (!auth || !this.client) {
        console.error(
          "ZUNE Orders: AdminAuth/Supabase haipatikani."
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        console.error(
          "ZUNE Orders: checkAccess() haipatikani."
        );
        return false;
      }

      try {
        return Boolean(await auth.checkAccess());
      } catch (error) {
        console.error(
          "ZUNE Orders: Imeshindikana kuthibitisha ruhusa.",
          error
        );
        return false;
      }
    },

    // -------------------------------------------------------
    // 6. CACHE HTML ELEMENTS
    // -------------------------------------------------------

    cacheElements() {
      this.elements = {
        tableBody: document.getElementById("ordersTableBody"),
        search: document.getElementById("ordersSearchInput"),
        status: document.getElementById("ordersStatusFilter"),
        count: document.getElementById("ordersTotalCount"),
        message: document.getElementById("ordersMessage"),
        refresh: document.getElementById("ordersRefreshBtn")
      };
    },

    // -------------------------------------------------------
    // 7. SHOW MESSAGE
    // -------------------------------------------------------

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

  window.AdminOrders = Orders;

  // Sehemu ya 2, 3 na 4 itaongezwa chini ya hii.
  // Usiongeze })(); mpaka mwisho wa Sehemu ya 4.

  console.log("ZUNE Orders: Sehemu ya 1 imepakiwa.");

// =========================================================
// 8. LOAD ORDERS FROM SUPABASE
// =========================================================

AdminOrders.loadOrders = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia oda...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona oda.",
        "error"
      );
      return;
    }

    const { data, error } = await this.client
      .from("orders")
      .select(
        "id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    this.orders = Array.isArray(data) ? data : [];

    this.applyFilters();

    this.showMessage(
      `Oda ${this.orders.length} zimepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error(
      "ZUNE Orders: Imeshindikana kupakia oda:",
      error
    );

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Imeshindikana kupakia oda. Kagua ruhusa za
            Supabase na muundo wa jedwali la orders.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Hitilafu wakati wa kupakia oda.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 9. FILTER ORDERS
// =========================================================

AdminOrders.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredOrders = this.orders.filter((order) => {
    const searchable = [
      order.id,
      order.buyer_id,
      order.product_id,
      order.status
    ].join(" ").toLowerCase();

    const matchesSearch =
      !term || searchable.includes(term);

    const matchesStatus =
      this.statusFilter === "all" ||
      String(order.status || "").toLowerCase() ===
        this.statusFilter;

    return matchesSearch && matchesStatus;
  });

  this.displayOrders();
};


// =========================================================
// 10. UPDATE ORDER COUNT
// =========================================================

AdminOrders.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredOrders.length} kati ya ` +
      `${this.orders.length} oda`;
  }
};


// =========================================================
// 11. DISPLAY ORDERS TABLE
// =========================================================

AdminOrders.displayOrders = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Orders: ordersTableBody haipo kwenye index.html."
    );
    return;
  }

  if (this.filteredOrders.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna oda zinazolingana na utafutaji.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredOrders.map((order) => {
    const id = this.escapeHTML(order.id);
    const buyer = this.escapeHTML(order.buyer_id || "Haijulikani");
    const product = this.escapeHTML(order.product_id || "Haijulikani");
    const quantity = this.escapeHTML(order.quantity ?? 0);
    const total = this.escapeHTML(this.formatMoney(order.total_price));
    const status = this.escapeHTML(this.statusLabel(order.status));
    const date = this.escapeHTML(this.formatDate(order.created_at));

    const normalizedStatus = String(order.status || "").toLowerCase();

    const statusClass =
      normalizedStatus === "completed"
        ? "is-verified"
        : normalizedStatus === "cancelled"
          ? "is-rejected"
          : "is-pending";

    return `
      <tr>
        <td>
          <strong>${id}</strong>
          <small>${date}</small>
        </td>
        <td>${buyer}</td>
        <td>${product}</td>
        <td>${quantity}</td>
        <td>${total}</td>
        <td>
          <span class="admin-status ${statusClass}">
            ${status}
          </span>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-order-details="${id}"
          >
            Maelezo
          </button>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 12. VIEW ORDER DETAILS
// =========================================================

AdminOrders.showOrderDetails = function (orderId) {
  const order = this.orders.find(
    (item) => String(item.id) === String(orderId)
  );

  if (!order) {
    this.showMessage("Oda haijapatikana.", "error");
    return;
  }

  const details = [
    ["Namba ya oda", order.id],
    ["ID ya mteja", order.buyer_id],
    ["ID ya bidhaa", order.product_id],
    ["Idadi", order.quantity],
    ["Jumla ya oda", this.formatMoney(order.total_price)],
    ["Kamisheni", this.formatMoney(order.commission_fee)],
    ["Hali ya oda", this.statusLabel(order.status)],
    ["Tarehe", this.formatDate(order.created_at)]
  ];

  const safe = (value) =>
    this.escapeHTML(value ?? "Haijatajwa");

  const html = `
    <div class="order-details-list">
      ${details.map(([label, value]) => `
        <div class="order-detail-row">
          <span>${safe(label)}</span>
          <strong>${safe(value)}</strong>
        </div>
      `).join("")}
    </div>
    <p class="admin-muted">
      Maelezo haya yamesomwa kutoka kwenye rekodi ya oda.
      Hakuna taarifa iliyobadilishwa.
    </p>
  `;

  if (
    window.ZUNEAdmin &&
    typeof window.ZUNEAdmin.openModal === "function"
  ) {
    window.ZUNEAdmin.openModal(
      "Maelezo ya Oda",
      html
    );
    return;
  }

  // Njia mbadala ikiwa modal ya jumla haipatikani.
  const backdrop = document.getElementById(
    "adminModalBackdrop"
  );
  const modal = document.getElementById("adminModal");
  const title = document.getElementById("adminModalTitle");
  const body = document.getElementById("adminModalBody");
  const actions = document.getElementById("adminModalActions");

  if (backdrop && modal && title && body) {
    title.textContent = "Maelezo ya Oda";
    body.innerHTML = html;

    if (actions) {
      actions.innerHTML = `
        <button
          type="button"
          class="admin-btn admin-btn-primary"
          id="orderDetailsClose"
        >
          Funga
        </button>
      `;

      const closeButton = document.getElementById(
        "orderDetailsClose"
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
    return;
  }

  this.showMessage(
    "Sehemu ya maelezo ya oda haipatikani kwenye index.html.",
    "error"
  );
};


// =========================================================
// 13. CONNECT SEARCH AND FILTER CONTROLS
// =========================================================

AdminOrders.connectControls = function () {
  const search = this.elements.search;
  const filter = this.elements.statusFilter;
  const refresh = this.elements.refresh;
  const body = this.elements.tableBody;

  if (search && !search.dataset.ordersBound) {
    search.dataset.ordersBound = "true";

    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });
  }

  if (filter && !filter.dataset.ordersBound) {
    filter.dataset.ordersBound = "true";

    filter.addEventListener("change", () => {
      this.statusFilter = String(
        filter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (refresh && !refresh.dataset.ordersBound) {
    refresh.dataset.ordersBound = "true";

    refresh.addEventListener("click", () => {
      this.loadOrders();
    });
  }

  if (body && !body.dataset.ordersBound) {
    body.dataset.ordersBound = "true";

    body.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-order-details]"
      );

      if (!button) return;

      this.showOrderDetails(
        button.getAttribute("data-order-details")
      );
    });
  }
};


// =========================================================
// 14. CACHE PAGE ELEMENTS
// =========================================================

AdminOrders.cacheElements = function () {
  this.elements.tableBody = document.getElementById(
    "ordersTableBody"
  );

  this.elements.search = document.getElementById(
    "ordersSearchInput"
  );

  this.elements.statusFilter = document.getElementById(
    "ordersStatusFilter"
  );

  this.elements.count = document.getElementById(
    "ordersTotalCount"
  );

  this.elements.message = document.getElementById(
    "ordersMessage"
  );

  this.elements.refresh = document.getElementById(
    "ordersRefreshBtn"
  );
};

// =========================================================
// 15. INITIALIZE ORDERS MODULE
// =========================================================

AdminOrders.initialize = async function () {
  if (this.initialized) {
    await this.loadOrders();
    return;
  }

  this.cacheElements();
  this.connectControls();

  this.initialized = true;

  await this.loadOrders();

  console.log("ZUNE Orders: Module imeanzishwa.");
};


// =========================================================
// 16. PUBLIC REFRESH FUNCTION
// =========================================================

AdminOrders.refresh = async function () {
  await this.loadOrders();
};


// =========================================================
// 17. NAVIGATION SUPPORT
// =========================================================

document.addEventListener("click", (event) => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  const page = navLink.getAttribute("data-page");

  if (page === "orders") {
    AdminOrders.initialize();
  }
});


// =========================================================
// 18. START MODULE WHEN PAGE IS READY
// =========================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    AdminOrders.initialize();
  }, { once: true });
} else {
  AdminOrders.initialize();
}


// =========================================================
// END OF ZUNE PREMIUM ADMIN — admin-orders.js
// =========================================================

})();
