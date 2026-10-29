
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   FILE: admin-reports.js
   SEHEMU YA 1/4
   Reports Foundation + Supabase Data
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 1. CHECK ADMIN AUTHENTICATION MODULE
  // ---------------------------------------------------------

  const auth = window.AdminAuth;

  if (!auth || !auth.client) {
    console.error(
      "ZUNE Reports: AdminAuth haijapatikana. Kagua admin-auth.js."
    );
    return;
  }

  const db = auth.client;

  // ---------------------------------------------------------
  // 2. CREATE REPORTS MODULE
  // ---------------------------------------------------------

  const Reports = {
    loading: false,
    lastReport: null,

    element: function (id) {
      return document.getElementById(id);
    },

    setText: function (id, value) {
      const element = this.element(id);

      if (element) {
        element.textContent = value;
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
    // 3. CHECK ADMIN ACCESS
    // -------------------------------------------------------

    checkAccess: async function () {
      const result = await auth.checkAccess();

      if (!result) {
        auth.showMessage(
          "Huna ruhusa ya kuona ripoti hizi.",
          "error"
        );

        return false;
      }

      return true;
    },

    // -------------------------------------------------------
    // 4. GET DATE RANGE
    // -------------------------------------------------------

    getDateRange: function (period) {
      const end = new Date();
      const start = new Date(end);

      if (period === "7days") {
        start.setDate(start.getDate() - 6);
      } else if (period === "30days") {
        start.setDate(start.getDate() - 29);
      } else if (period === "90days") {
        start.setDate(start.getDate() - 89);
      } else if (period === "year") {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
      } else {
        // Default: siku 30 zilizopita.
        start.setDate(start.getDate() - 29);
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return {
        start: start.toISOString(),
        end: end.toISOString()
      };
    },

    // -------------------------------------------------------
    // 5. FETCH COMPLETED ORDERS FOR A PERIOD
    // -------------------------------------------------------

    fetchCompletedOrders: async function (period) {
      const allowed = await this.checkAccess();

      if (!allowed) {
        return [];
      }

      const range = this.getDateRange(period);

      const { data, error } = await db
        .from("orders")
        .select(
          "id, total_price, commission_fee, status, created_at"
        )
        .eq("status", "completed")
        .gte("created_at", range.start)
        .lte("created_at", range.end)
        .order("created_at", {
          ascending: true
        });

      if (error) {
        console.error(
          "ZUNE Reports: Imeshindikana kupata oda:",
          error.message
        );

        throw error;
      }

      return data || [];
    },

    // -------------------------------------------------------
    // 6. CALCULATE SUMMARY
    // -------------------------------------------------------

    calculateSummary: function (orders) {
      const totalSales = orders.reduce(
        (sum, order) =>
          sum + (Number(order.total_price) || 0),
        0
      );

      const totalCommission = orders.reduce(
        (sum, order) =>
          sum + (Number(order.commission_fee) || 0),
        0
      );

      return {
        completedOrders: orders.length,
        totalSales: totalSales,
        totalCommission: totalCommission
      };
    },

    // -------------------------------------------------------
    // 7. EXPOSE REPORTS MODULE
    // -------------------------------------------------------

    init: function () {
      console.log(
        "ZUNE Reports: Msingi wa ripoti umeanzishwa."
      );
    }
  };

  window.AdminReports = Reports;

  console.log(
    "ZUNE Premium Admin Reports — Sehemu ya 1 imepakiwa."
  );

})();

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-reports.js — SEHEMU YA 2/4
   Daily Sales + Report Rendering
   ========================================================= */

// ---------------------------------------------------------
// 8. GROUP ORDERS BY DAY
// ---------------------------------------------------------

AdminReports.groupOrdersByDay = function (orders) {
  const grouped = {};

  (orders || []).forEach((order) => {
    if (!order.created_at) return;

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) return;

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        orders: 0,
        sales: 0,
        commission: 0
      };
    }

    grouped[key].orders += 1;
    grouped[key].sales += Number(order.total_price) || 0;
    grouped[key].commission += Number(order.commission_fee) || 0;
  });

  return Object.values(grouped).sort(
    (a, b) => a.date.localeCompare(b.date)
  );
};

// ---------------------------------------------------------
// 9. DISPLAY SUMMARY CARDS
// ---------------------------------------------------------

AdminReports.displaySummary = function (summary) {
  this.setText(
    "reportCompletedOrders",
    this.formatNumber(summary.completedOrders)
  );

  this.setText(
    "reportTotalSales",
    this.formatMoney(summary.totalSales)
  );

  this.setText(
    "reportTotalCommission",
    this.formatMoney(summary.totalCommission)
  );
};

// ---------------------------------------------------------
// 10. DISPLAY DAILY SALES TABLE
// ---------------------------------------------------------

AdminReports.displayDailyTable = function (dailyData) {
  const tableBody =
    this.element("reportDailyTableBody");

  if (!tableBody) {
    console.warn(
      "ZUNE Reports: reportDailyTableBody haipo kwenye index.html."
    );
    return;
  }

  tableBody.replaceChildren();

  if (!dailyData.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.textContent =
      "Hakuna oda zilizokamilika katika kipindi hiki.";

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  dailyData.forEach((item) => {
    const row = document.createElement("tr");

    const values = [
      item.date,
      this.formatNumber(item.orders),
      this.formatMoney(item.sales),
      this.formatMoney(item.commission)
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
};

// ---------------------------------------------------------
// 11. DISPLAY PERIOD LABEL
// ---------------------------------------------------------

AdminReports.displayPeriod = function (period) {
  const labels = {
    "7days": "Siku 7 zilizopita",
    "30days": "Siku 30 zilizopita",
    "90days": "Siku 90 zilizopita",
    "year": "Mwaka huu"
  };

  this.setText(
    "reportPeriodLabel",
    labels[period] || labels["30days"]
  );
};

// ---------------------------------------------------------
// 12. LOAD AND RENDER A REPORT
// ---------------------------------------------------------

AdminReports.loadReport = async function (period) {
  if (this.loading) return null;

  this.loading = true;

  try {
    const orders = await this.fetchCompletedOrders(
      period || "30days"
    );

    const summary = this.calculateSummary(orders);
    const dailyData = this.groupOrdersByDay(orders);

    this.displaySummary(summary);
    this.displayDailyTable(dailyData);
    this.displayPeriod(period || "30days");

    this.lastReport = {
      period: period || "30days",
      summary: summary,
      dailyData: dailyData,
      generatedAt: new Date().toISOString()
    };

    return this.lastReport;

  } catch (error) {
    console.error(
      "ZUNE Reports: Imeshindikana kutengeneza ripoti:",
      error
    );

    auth.showMessage(
      "Ripoti haikuweza kupakiwa. Kagua Supabase na ruhusa za database.",
      "error"
    );

    return null;

  } finally {
    this.loading = false;
  }
};

// ---------------------------------------------------------
// 13. LOAD DEFAULT REPORT
// ---------------------------------------------------------

AdminReports.loadDefaultReport = async function () {
  return this.loadReport("30days");
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-reports.js — SEHEMU YA 3/4
   Period Selector + Refresh + CSV Export
   ========================================================= */

// ---------------------------------------------------------
// 14. GET SELECTED REPORT PERIOD
// ---------------------------------------------------------

AdminReports.getSelectedPeriod = function () {
  const selector = this.element("reportPeriodSelect");
  const allowedPeriods = ["7days", "30days", "90days", "year"];

  const selected = selector ? selector.value : "30days";

  return allowedPeriods.includes(selected)
    ? selected
    : "30days";
};

// ---------------------------------------------------------
// 15. BIND PERIOD SELECTOR
// ---------------------------------------------------------

AdminReports.bindPeriodSelector = function () {
  const selector = this.element("reportPeriodSelect");

  if (!selector || selector.dataset.reportsBound === "true") {
    return;
  }

  selector.dataset.reportsBound = "true";

  selector.addEventListener("change", async () => {
    await this.loadReport(this.getSelectedPeriod());
  });
};

// ---------------------------------------------------------
// 16. BIND REFRESH BUTTON
// ---------------------------------------------------------

AdminReports.bindRefreshButton = function () {
  const button = this.element("reportRefreshBtn");

  if (!button || button.dataset.reportsBound === "true") {
    return;
  }

  button.dataset.reportsBound = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();

    button.disabled = true;

    try {
      await this.loadReport(this.getSelectedPeriod());
    } finally {
      button.disabled = false;
    }
  });
};

// ---------------------------------------------------------
// 17. CSV ESCAPING
// ---------------------------------------------------------

AdminReports.csvCell = function (value) {
  const safeValue = String(value ?? "");

  // Escape double quotes so commas and quotes in values
  // do not break the CSV columns.
  return '"' + safeValue.replace(/"/g, '""') + '"';
};

// ---------------------------------------------------------
// 18. EXPORT REPORT AS CSV
// ---------------------------------------------------------

AdminReports.exportCSV = async function () {
  // Ruhusa ikaguliwe tena kabla ya kutoa ripoti.
  const allowed = await this.checkAccess();

  if (!allowed) return false;

  // Pakia ripoti mpya ili faili liwe na taarifa za sasa.
  const report = await this.loadReport(
    this.getSelectedPeriod()
  );

  if (!report) return false;

  const rows = [
    ["ZUNE PREMIUM ADMIN — SALES REPORT"],
    ["Period", report.period],
    ["Generated at", report.generatedAt],
    [],
    ["Date", "Completed Orders", "Sales (TZS)", "Commission (TZS)"]
  ];

  report.dailyData.forEach((item) => {
    rows.push([
      item.date,
      item.orders,
      item.sales,
      item.commission
    ]);
  });

  rows.push([]);
  rows.push([
    "TOTAL",
    report.summary.completedOrders,
    report.summary.totalSales,
    report.summary.totalCommission
  ]);

  const csv = rows
    .map((row) => row.map(this.csvCell).join(","))
    .join("\r\n");

  // BOM husaidia Excel kusoma encoding kwa usahihi.
  const blob = new Blob(
    ["\uFEFF", csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    "zune-sales-report-" +
    report.period +
    "-" +
    new Date().toISOString().slice(0, 10) +
    ".csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return true;
};

// ---------------------------------------------------------
// 19. BIND CSV EXPORT BUTTON
// ---------------------------------------------------------

AdminReports.bindExportButton = function () {
  const button = this.element("reportExportBtn");

  if (!button || button.dataset.reportsBound === "true") {
    return;
  }

  button.dataset.reportsBound = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();

    button.disabled = true;

    try {
      const exported = await this.exportCSV();

      if (exported) {
        auth.showMessage(
          "Ripoti ya CSV imetayarishwa.",
          "success"
        );
      }
    } catch (error) {
      console.error("ZUNE Reports: CSV export failed:", error);

      auth.showMessage(
        "Imeshindikana kuandaa faili la ripoti.",
        "error"
      );
    } finally {
      button.disabled = false;
    }
  });
};

// ---------------------------------------------------------
// 20. CONNECT REPORT CONTROLS
// ---------------------------------------------------------

AdminReports.connectControls = function () {
  this.bindPeriodSelector();
  this.bindRefreshButton();
  this.bindExportButton();
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-reports.js — SEHEMU YA 4/4
   Initialization + Safe Startup
   ========================================================= */

// ---------------------------------------------------------
// 21. INITIALIZE REPORTS
// ---------------------------------------------------------

AdminReports.initialized = false;
AdminReports.initializing = false;

AdminReports.initialize = async function () {
  if (this.initialized || this.initializing) {
    return;
  }

  this.initializing = true;

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      console.warn(
        "ZUNE Reports: Admin access was not granted."
      );
      return;
    }

    this.connectControls();

    await this.loadDefaultReport();

    this.initialized = true;

    console.log(
      "ZUNE Reports: Initialized successfully."
    );
  } catch (error) {
    console.error(
      "ZUNE Reports: Initialization failed:",
      error
    );

    if (typeof auth.showMessage === "function") {
      auth.showMessage(
        "Imeshindikana kupakia ripoti. Jaribu tena.",
        "error"
      );
    }
  } finally {
    this.initializing = false;
  }
};

// ---------------------------------------------------------
// 22. REINITIALIZE WHEN REPORTS PAGE OPENS
// ---------------------------------------------------------

AdminReports.onPageOpen = async function () {
  const allowed = await this.checkAccess();

  if (!allowed) return;

  if (!this.initialized) {
    await this.initialize();
    return;
  }

  await this.loadReport(this.getSelectedPeriod());
};

// ---------------------------------------------------------
// 23. START AFTER AUTHENTICATION IS READY
// ---------------------------------------------------------

AdminReports.start = async function () {
  if (this.starting) return;

  this.starting = true;

  try {
    // Subiri client ya Supabase na auth module ziwepo.
    if (!window.AdminAuth || !window.AdminAuth.client) {
      console.error(
        "ZUNE Reports: AdminAuth is not available."
      );
      return;
    }

    const allowed = await this.checkAccess();

    if (!allowed) return;

    await this.initialize();
  } finally {
    this.starting = false;
  }
};

// ---------------------------------------------------------
// 24. STARTUP
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  AdminReports.start();
});

// ---------------------------------------------------------
// 25. OPTIONAL GLOBAL REFRESH FUNCTION
// ---------------------------------------------------------

window.refreshZuneAdminReports = function () {
  return AdminReports.loadReport(
    AdminReports.getSelectedPeriod()
  );
};

console.log(
  "ZUNE Reports: All four sections loaded."
);

})();
