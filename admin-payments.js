
// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-payments.js
// SEHEMU YA 1/4
// =========================================================

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Payments = {
    client: auth ? auth.client : null,

    initialized: false,
    loading: false,

    orders: [],
    filteredOrders: [],

    searchTerm: "",
    statusFilter: "all",

    elements: {},

    // -----------------------------------------------------
    // 1. SAFE HTML TEXT
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
    // 2. FORMAT MONEY IN TANZANIAN SHILLINGS
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
    // 4. TRANSLATE ORDER STATUS
    // -----------------------------------------------------

    statusLabel(status) {
      const labels = {
        pending: "Inasubiri",
        confirmed: "Imethibitishwa",
        completed: "Imekamilika",
        cancelled: "Imeghairiwa"
      };

      const key = String(status || "").toLowerCase();

      return labels[key] || "Haijulikani";
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
          "ZUNE Payments: Admin access check failed:",
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
        document.getElementById("paymentsTableBody");

      this.elements.search =
        document.getElementById("paymentsSearchInput");

      this.elements.statusFilter =
        document.getElementById("paymentsStatusFilter");

      this.elements.count =
        document.getElementById("paymentsTotalCount");

      this.elements.message =
        document.getElementById("paymentsMessage");

      this.elements.refresh =
        document.getElementById("paymentsRefreshBtn");

      this.elements.totalAmount =
        document.getElementById("paymentsTotalAmount");

      this.elements.completedAmount =
        document.getElementById("paymentsCompletedAmount");

      this.elements.pendingAmount =
        document.getElementById("paymentsPendingAmount");
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

      console.log("ZUNE Payments:", message);
    }
  };

  // Make module available to other admin scripts.
  window.AdminPayments = Payments;

  // SEHEMU YA 2, 3 NA 4 ZITAENDELEA HAPA CHINI.
  // USIONGEZE })(); HADI SEHEMU YA 4.

  console.log(
    "ZUNE Payments: Sehemu ya 1 imepakiwa."
  );

// =========================================================
// 8. LOAD PAYMENT-RELATED ORDER RECORDS
// =========================================================

AdminPayments.loadPayments = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia taarifa za malipo...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona taarifa hizi.",
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
    this.updateSummary();

    this.showMessage(
      `Taarifa ${this.orders.length} za oda zimepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error(
      "ZUNE Payments: Load error:",
      error
    );

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Imeshindikana kupakia taarifa.
            Kagua muunganisho na ruhusa za Supabase.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Hitilafu ya kupakia taarifa.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 9. CALCULATE SUMMARY
// =========================================================

AdminPayments.updateSummary = function () {
  const totalAmount = this.orders.reduce(
    (sum, order) => sum + (Number(order.total_price) || 0),
    0
  );

  const completedOrders = this.orders.filter(
    order =>
      String(order.status || "").toLowerCase() === "completed"
  );

  const pendingOrders = this.orders.filter(
    order =>
      String(order.status || "").toLowerCase() === "pending"
  );

  const completedAmount = completedOrders.reduce(
    (sum, order) => sum + (Number(order.total_price) || 0),
    0
  );

  const pendingAmount = pendingOrders.reduce(
    (sum, order) => sum + (Number(order.total_price) || 0),
    0
  );

  if (this.elements.totalAmount) {
    this.elements.totalAmount.textContent =
      this.formatMoney(totalAmount);
  }

  if (this.elements.completedAmount) {
    this.elements.completedAmount.textContent =
      this.formatMoney(completedAmount);
  }

  if (this.elements.pendingAmount) {
    this.elements.pendingAmount.textContent =
      this.formatMoney(pendingAmount);
  }
};


// =========================================================
// 10. FILTER RECORDS
// =========================================================

AdminPayments.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredOrders = this.orders.filter(order => {
    const searchable = [
      order.id,
      order.buyer_id,
      order.product_id,
      order.status
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !term || searchable.includes(term);

    const normalizedStatus =
      String(order.status || "").toLowerCase();

    const matchesStatus =
      this.statusFilter === "all" ||
      normalizedStatus === this.statusFilter;

    return matchesSearch && matchesStatus;
  });

  this.displayPayments();
};


// =========================================================
// 11. UPDATE RECORD COUNT
// =========================================================

AdminPayments.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredOrders.length} kati ya ` +
      `${this.orders.length} rekodi`;
  }
};


// =========================================================
// 12. DISPLAY PAYMENT-RELATED RECORDS
// =========================================================

AdminPayments.displayPayments = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Payments: paymentsTableBody haipo."
    );
    return;
  }

  if (this.filteredOrders.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna rekodi zinazolingana na utafutaji.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredOrders.map(order => {
    const id = this.escapeHTML(order.id);
    const buyer = this.escapeHTML(
      order.buyer_id || "Haijulikani"
    );
    const amount = this.escapeHTML(
      this.formatMoney(order.total_price)
    );
    const commission = this.escapeHTML(
      this.formatMoney(order.commission_fee)
    );
    const status = this.escapeHTML(
      this.statusLabel(order.status)
    );
    const date = this.escapeHTML(
      this.formatDate(order.created_at)
    );

    return `
      <tr>
        <td>
          <strong>${id}</strong>
          <small>${date}</small>
        </td>

        <td>${buyer}</td>

        <td>${amount}</td>

        <td>${commission}</td>

        <td>
          <span class="admin-status">
            ${status}
          </span>
        </td>

        <td>
          <span class="admin-muted">
            Taarifa ya oda
          </span>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 13. CACHE PAGE ELEMENTS
// =========================================================

AdminPayments.cacheElements = function () {
  this.elements.tableBody =
    document.getElementById("paymentsTableBody");

  this.elements.search =
    document.getElementById("paymentsSearchInput");

  this.elements.statusFilter =
    document.getElementById("paymentsStatusFilter");

  this.elements.count =
    document.getElementById("paymentsTotalCount");

  this.elements.message =
    document.getElementById("paymentsMessage");

  this.elements.refresh =
    document.getElementById("paymentsRefreshBtn");

  this.elements.totalAmount =
    document.getElementById("paymentsTotalAmount");

  this.elements.completedAmount =
    document.getElementById("paymentsCompletedAmount");

  this.elements.pendingAmount =
    document.getElementById("paymentsPendingAmount");
};


// =========================================================
// 14. CONNECT SEARCH, FILTER AND REFRESH
// =========================================================

AdminPayments.connectControls = function () {
  const search = this.elements.search;
  const filter = this.elements.statusFilter;
  const refresh = this.elements.refresh;

  if (search && !search.dataset.paymentsBound) {
    search.dataset.paymentsBound = "true";

    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });
  }

  if (filter && !filter.dataset.paymentsBound) {
    filter.dataset.paymentsBound = "true";

    filter.addEventListener("change", () => {
      this.statusFilter = String(
        filter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (refresh && !refresh.dataset.paymentsBound) {
    refresh.dataset.paymentsBound = "true";

    refresh.addEventListener("click", () => {
      this.loadPayments();
    });
  }
};


// =========================================================
// 15. EXPORT VISIBLE RECORDS TO CSV
// =========================================================

AdminPayments.exportCSV = function () {
  if (!this.filteredOrders.length) {
    this.showMessage(
      "Hakuna rekodi za kuhamisha kwa sasa.",
      "info"
    );
    return;
  }

  const rows = [
    [
      "Order ID",
      "Buyer ID",
      "Product ID",
      "Quantity",
      "Total TZS",
      "Commission TZS",
      "Status",
      "Created At"
    ]
  ];

  this.filteredOrders.forEach(order => {
    rows.push([
      order.id ?? "",
      order.buyer_id ?? "",
      order.product_id ?? "",
      order.quantity ?? "",
      order.total_price ?? 0,
      order.commission_fee ?? 0,
      order.status ?? "",
      order.created_at ?? ""
    ]);
  });

  // Escape CSV values, including commas and quotes.
  const csv = rows.map(row =>
    row.map(value => {
      let text = String(value);

      // Prevent spreadsheet formula execution.
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "zune-payment-records.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  this.showMessage(
    "Faili la CSV limeandaliwa.",
    "success"
  );
};


// =========================================================
// 16. CONNECT EXPORT BUTTON
// =========================================================

AdminPayments.connectExportButton = function () {
  const button = document.getElementById(
    "paymentsExportBtn"
  );

  if (!button || button.dataset.paymentsBound) {
    return;
  }

  button.dataset.paymentsBound = "true";

  button.addEventListener("click", () => {
    this.exportCSV();
  });
};


// =========================================================
// 17. RESET FILTERS
// =========================================================

AdminPayments.resetFilters = function () {
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
// 18. INITIALIZE PAYMENTS MODULE
// =========================================================

AdminPayments.initialize = async function () {
  if (this.initialized) {
    await this.loadPayments();
    return;
  }

  this.cacheElements();
  this.connectControls();
  this.connectExportButton();

  this.initialized = true;

  await this.loadPayments();

  console.log(
    "ZUNE Payments: Module imeanzishwa."
  );
};


// =========================================================
// 19. PUBLIC REFRESH FUNCTION
// =========================================================

AdminPayments.refresh = async function () {
  await this.loadPayments();
};


// =========================================================
// 20. NAVIGATION SUPPORT
// =========================================================

document.addEventListener("click", event => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  const page = navLink.getAttribute("data-page");

  if (page === "payments") {
    AdminPayments.initialize();
  }
});


// =========================================================
// 21. START WHEN DOCUMENT IS READY
// =========================================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminPayments.initialize(),
    { once: true }
  );
} else {
  AdminPayments.initialize();
}


// =========================================================
// END OF admin-payments.js
// =========================================================

})();
