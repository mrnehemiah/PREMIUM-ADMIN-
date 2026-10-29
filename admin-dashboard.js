
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   FILE: admin-dashboard.js
   SEHEMU YA 1/4
   Dashboard Statistics + Supabase Data
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 1. CHECK SUPABASE AUTHENTICATION MODULE
  // ---------------------------------------------------------

  const auth = window.AdminAuth;

  if (!auth || !auth.client) {
    console.error(
      "ZUNE Admin: AdminAuth haijapatikana. Kagua admin-auth.js."
    );
    return;
  }

  const db = auth.client;

  const Dashboard = {
    loading: false,
    lastLoadedAt: null,

    // -------------------------------------------------------
    // 2. HTML ELEMENT HELPERS
    // -------------------------------------------------------

    element: function (id) {
      return document.getElementById(id);
    },

    setText: function (id, value) {
      const el = this.element(id);

      if (el) {
        el.textContent = value;
      }
    },

    formatNumber: function (value) {
      return new Intl.NumberFormat("en-US").format(
        Number(value) || 0
      );
    },

    formatMoney: function (value) {
      return new Intl.NumberFormat("en-TZ", {
        style: "currency",
        currency: "TZS",
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    },

    // -------------------------------------------------------
    // 3. LOAD COUNT FROM A TABLE
    // -------------------------------------------------------

    countRows: async function (table, configureQuery) {
      let query = db
        .from(table)
        .select("*", {
          count: "exact",
          head: true
        });

      if (typeof configureQuery === "function") {
        query = configureQuery(query);
      }

      const { count, error } = await query;

      if (error) {
        console.error(
          "ZUNE Admin: Imeshindikana kusoma " + table,
          error.message
        );

        throw error;
      }

      return count || 0;
    },

    // -------------------------------------------------------
    // 4. LOAD BASIC COUNTS
    // -------------------------------------------------------

    loadCounts: async function () {
      const results = await Promise.all([
        this.countRows("orders"),
        this.countRows("products"),
        this.countRows("profiles", (query) =>
          query.eq("role", "vendor")
        ),
        this.countRows("profiles", (query) =>
          query.eq("role", "buyer")
        ),
        this.countRows("seller_applications", (query) =>
          query.eq("status", "pending")
        )
      ]);

      return {
        totalOrders: results[0],
        totalProducts: results[1],
        totalSellers: results[2],
        totalCustomers: results[3],
        pendingApplications: results[4]
      };
    },

    // -------------------------------------------------------
    // 5. DISPLAY BASIC COUNTS
    // -------------------------------------------------------

    displayCounts: function (counts) {
      // IDs hizi zinatoka kwenye index.html yetu.
      this.setText(
        "statTotalOrders",
        this.formatNumber(counts.totalOrders)
      );

      this.setText(
        "statTotalSellers",
        this.formatNumber(counts.totalSellers)
      );

      this.setText(
        "statTotalCustomers",
        this.formatNumber(counts.totalCustomers)
      );

      this.setText(
        "pendingAppsCount",
        this.formatNumber(counts.pendingApplications)
      );

      // Sasisha bidhaa ikiwa kuna sehemu ya kuonyesha idadi.
      this.setText(
        "statTotalProducts",
        this.formatNumber(counts.totalProducts)
      );
    }
  };

  // ---------------------------------------------------------
  // 6. EXPOSE DASHBOARD MODULE
  // ---------------------------------------------------------

  window.AdminDashboard = Dashboard;

  console.log(
    "ZUNE Admin: Dashboard statistics module imepakiwa."
  );

})();

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   SEHEMU YA 2/4
   Sales Statistics + Recent Orders
   ========================================================= */

// ---------------------------------------------------------
// 7. LOAD SALES STATISTICS
// ---------------------------------------------------------

AdminDashboard.loadSales = async function () {
  // Oda zilizokamilika pekee ndizo zinazohesabiwa
  // kama mauzo yaliyokamilika.
  const { data, error } = await db
    .from("orders")
    .select("total_price, status")
    .eq("status", "completed");

  if (error) {
    console.error(
      "ZUNE Admin: Imeshindikana kusoma mauzo:",
      error.message
    );

    throw error;
  }

  const totalSales = (data || []).reduce(
    (sum, order) => sum + (Number(order.total_price) || 0),
    0
  );

  this.setText(
    "statTotalSales",
    this.formatMoney(totalSales)
  );

  return totalSales;
};

// ---------------------------------------------------------
// 8. LOAD RECENT ORDERS
// ---------------------------------------------------------

AdminDashboard.loadRecentOrders = async function () {
  const { data, error } = await db
    .from("orders")
    .select("id, buyer_id, product_id, quantity, total_price, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error(
      "ZUNE Admin: Imeshindikana kusoma oda za karibuni:",
      error.message
    );

    throw error;
  }

  this.displayRecentOrders(data || []);

  return data || [];
};

// ---------------------------------------------------------
// 9. FORMAT ORDER STATUS
// ---------------------------------------------------------

AdminDashboard.formatOrderStatus = function (status) {
  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa"
  };

  return labels[String(status || "").toLowerCase()] ||
    "Haijulikani";
};

// ---------------------------------------------------------
// 10. DISPLAY RECENT ORDERS
// ---------------------------------------------------------

AdminDashboard.displayRecentOrders = function (orders) {
  const tbody = this.element("recentOrdersTableBody");

  // Ruhusu ID mbadala ikiwa HTML yako inatumia
  // ordersTableBody kwa jedwali la oda.
  const target = tbody ||
    this.element("ordersTableBody");

  if (!target) {
    console.warn(
      "ZUNE Admin: Jedwali la oda halijapatikana kwenye index.html."
    );
    return;
  }

  target.replaceChildren();

  if (!orders.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent = "Hakuna oda zilizopatikana.";
    cell.className = "empty-table-message";

    row.appendChild(cell);
    target.appendChild(row);
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");

    const values = [
      String(order.id || "").slice(0, 8).toUpperCase(),
      order.product_id
        ? String(order.product_id).slice(0, 8)
        : "—",
      this.formatNumber(order.quantity),
      this.formatMoney(order.total_price),
      this.formatOrderStatus(order.status),
      order.created_at
        ? new Date(order.created_at).toLocaleDateString("en-GB")
        : "—"
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    target.appendChild(row);
  });
};

// ---------------------------------------------------------
// 11. LOAD ALL DASHBOARD STATISTICS
// ---------------------------------------------------------

AdminDashboard.loadStatistics = async function () {
  if (this.loading) return;

  this.loading = true;

  try {
    // Hakikisha session ya sasa ina ruhusa ya admin.
    const allowed = await auth.checkAccess();

    if (!allowed) {
      this.setText("statTotalSales", "—");
      this.setText("statTotalOrders", "—");
      this.setText("statTotalSellers", "—");
      this.setText("statTotalCustomers", "—");

      auth.showMessage(
        "Takwimu hazijapakiwa kwa sababu ruhusa ya admin haijathibitishwa.",
        "error"
      );

      return;
    }

    const [counts, sales] = await Promise.all([
      this.loadCounts(),
      this.loadSales()
    ]);

    this.displayCounts(counts);

    this.lastLoadedAt = new Date();

    this.setText(
      "adminLastUpdated",
      "Imesasishwa: " +
        this.lastLoadedAt.toLocaleTimeString("en-GB")
    );

    return {
      counts: counts,
      totalSales: sales
    };

  } catch (error) {
    console.error(
      "ZUNE Admin: Kushindwa kupakia takwimu:",
      error
    );

    auth.showMessage(
      "Takwimu hazijapakiwa. Kagua muunganisho wa Supabase na sera za RLS.",
      "error"
    );

    return null;

  } finally {
    this.loading = false;
  }
};

// ---------------------------------------------------------
// 12. LOAD DASHBOARD ORDERS AND STATISTICS
// ---------------------------------------------------------

AdminDashboard.loadDashboardData = async function () {
  const allowed = await auth.checkAccess();

  if (!allowed) return false;

  const results = await Promise.allSettled([
    this.loadStatistics(),
    this.loadRecentOrders()
  ]);

  const failed = results.some(
    (result) => result.status === "rejected"
  );

  if (failed) {
    console.warn(
      "ZUNE Admin: Baadhi ya taarifa hazikuweza kupakiwa."
    );
  }

  return !failed;
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   SEHEMU YA 3/4
   Refresh + Loading State + Dashboard Initialization
   ========================================================= */

// ---------------------------------------------------------
// 13. SHOW / HIDE LOADING STATE
// ---------------------------------------------------------

AdminDashboard.setLoadingState = function (isLoading) {
  const refreshButton = document.getElementById(
    "adminRefreshBtn"
  );

  const loadingIndicator = document.getElementById(
    "adminLoadingIndicator"
  );

  if (refreshButton) {
    refreshButton.disabled = Boolean(isLoading);

    refreshButton.setAttribute(
      "aria-busy",
      String(Boolean(isLoading))
    );

    const label = refreshButton.querySelector(
      "[data-refresh-label]"
    );

    if (label) {
      label.textContent = isLoading
        ? "Inasasisha..."
        : "Sasisha";
    }
  }

  if (loadingIndicator) {
    loadingIndicator.hidden = !isLoading;
    loadingIndicator.textContent = isLoading
      ? "Tafadhali subiri, tunapakia taarifa..."
      : "";
  }
};

// ---------------------------------------------------------
// 14. REFRESH DASHBOARD
// ---------------------------------------------------------

AdminDashboard.refresh = async function () {
  this.setLoadingState(true);

  try {
    const allowed = await auth.checkAccess();

    if (!allowed) {
      auth.showMessage(
        "Huna ruhusa ya kuona takwimu hizi.",
        "error"
      );
      return false;
    }

    const success = await this.loadDashboardData();

    if (success) {
      auth.showMessage(
        "Taarifa za dashboard zimesasishwa.",
        "success"
      );
    }

    return Boolean(success);

  } catch (error) {
    console.error(
      "ZUNE Admin: Refresh failed:",
      error
    );

    auth.showMessage(
      "Imeshindikana kusasisha dashboard. Jaribu tena.",
      "error"
    );

    return false;

  } finally {
    this.setLoadingState(false);
  }
};

// ---------------------------------------------------------
// 15. BIND REFRESH BUTTON
// ---------------------------------------------------------

AdminDashboard.bindRefreshButton = function () {
  const button = document.getElementById(
    "adminRefreshBtn"
  );

  if (!button || button.dataset.dashboardBound === "true") {
    return;
  }

  button.dataset.dashboardBound = "true";

  button.addEventListener("click", async function (event) {
    event.preventDefault();
    await AdminDashboard.refresh();
  });
};

// ---------------------------------------------------------
// 16. LOAD DASHBOARD WHEN OPENED
// ---------------------------------------------------------

AdminDashboard.bindNavigationRefresh = function () {
  const dashboardLinks = document.querySelectorAll(
    '[data-page="dashboard"]'
  );

  dashboardLinks.forEach((link) => {
    if (link.dataset.dashboardRefreshBound === "true") {
      return;
    }

    link.dataset.dashboardRefreshBound = "true";

    link.addEventListener("click", function () {
      window.setTimeout(function () {
        if (auth.isAdmin) {
          AdminDashboard.loadDashboardData();
        }
      }, 0);
    });
  });
};

// ---------------------------------------------------------
// 17. INITIALIZE DASHBOARD MODULE
// ---------------------------------------------------------

AdminDashboard.initialize = async function () {
  this.bindRefreshButton();
  this.bindNavigationRefresh();

  // Pakia dashboard mara ya kwanza baada ya auth
  // kuthibitisha session na role ya admin.
  const allowed = await auth.checkAccess();

  if (!allowed) {
    return false;
  }

  return await this.refresh();
};

// ---------------------------------------------------------
// 18. WAIT FOR AUTH MODULE TO LOAD
// ---------------------------------------------------------

AdminDashboard.start = function () {
  if (!auth || !auth.client) {
    console.error(
      "ZUNE Admin: Supabase auth haijapatikana."
    );
    return;
  }

  this.initialize().catch((error) => {
    console.error(
      "ZUNE Admin: Initialization error:",
      error
    );
  });
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   SEHEMU YA 4/4
   Final Initialization + Safe Error Handling
   ========================================================= */

// ---------------------------------------------------------
// 19. PREVENT DUPLICATE INITIALIZATION
// ---------------------------------------------------------

AdminDashboard.initialized = false;
AdminDashboard.starting = false;

AdminDashboard.start = async function () {
  if (this.initialized || this.starting) {
    return;
  }

  this.starting = true;

  try {
    this.bindRefreshButton();
    this.bindNavigationRefresh();

    // Ruhusa lazima ithibitishwe kabla ya kusoma data.
    const allowed = await auth.checkAccess();

    if (!allowed) {
      this.setText("statTotalSales", "—");
      this.setText("statTotalOrders", "—");
      this.setText("statTotalSellers", "—");
      this.setText("statTotalCustomers", "—");

      return;
    }

    const loaded = await this.loadDashboardData();

    if (loaded) {
      this.initialized = true;
    }

  } catch (error) {
    console.error(
      "ZUNE Admin: Dashboard startup error:",
      error
    );

    auth.showMessage(
      "Dashboard haikuweza kupakia taarifa. Tafadhali jaribu kusasisha.",
      "error"
    );

  } finally {
    this.starting = false;
  }
};

// ---------------------------------------------------------
// 20. REINITIALIZE AFTER LOGIN
// ---------------------------------------------------------

AdminDashboard.handleLoginSuccess = async function () {
  this.initialized = false;

  await this.start();
};

// ---------------------------------------------------------
// 21. RELOAD WHEN TAB BECOMES VISIBLE
// ---------------------------------------------------------

AdminDashboard.bindVisibilityRefresh = function () {
  if (this.visibilityRefreshBound) return;

  this.visibilityRefreshBound = true;

  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      auth.isAdmin
    ) {
      this.loadDashboardData();
    }
  });
};

// ---------------------------------------------------------
// 22. CONNECT DASHBOARD EVENTS
// ---------------------------------------------------------

AdminDashboard.connect = function () {
  this.bindRefreshButton();
  this.bindNavigationRefresh();
  this.bindVisibilityRefresh();
};

// ---------------------------------------------------------
// 23. START WHEN DOCUMENT IS READY
// ---------------------------------------------------------

function startZuneAdminDashboard() {
  if (!window.AdminAuth || !window.AdminDashboard) {
    console.error(
      "ZUNE Admin: Hakikisha admin-auth.js imepakiwa kabla ya admin-dashboard.js."
    );
    return;
  }

  AdminDashboard.connect();

  // Subiri authentication module ikamilishe ukaguzi.
  AdminAuth.client.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error(
        "ZUNE Admin: Session check failed:",
        error.message
      );
      return;
    }

    if (data.session) {
      AdminDashboard.start();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startZuneAdminDashboard,
    { once: true }
  );
} else {
  startZuneAdminDashboard();
}

// ---------------------------------------------------------
// 24. FINAL MODULE STATUS
// ---------------------------------------------------------

console.log(
  "ZUNE Premium Admin Dashboard module loaded."
);

// Hakikisha faili limefungwa mara moja tu.
})();
