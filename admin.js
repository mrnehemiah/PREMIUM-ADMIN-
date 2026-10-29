
"use strict";

/* =========================================================
   ZUNE PREMIUM ADMIN
   SEHEMU YA 1/5
   Supabase, helpers, login, session na navigation
========================================================= */

const ZUNE_SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const ZUNE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

let zuneSupabase = null;
let zuneAdminSession = null;
let zuneAdminProfile = null;
let zuneCurrentSection = "overviewSection";
let zuneAdminBusy = false;
let zuneInitialized = false;

const ZUNE = {
  currency: "TZS",
  pageSize: 10,

  number(value) {
    return new Intl.NumberFormat("en-TZ").format(
      Number(value) || 0
    );
  },

  money(value) {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: this.currency,
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  },

  date(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("sw-TZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  },

  el(selector, parent = document) {
    return parent.querySelector(selector);
  },

  all(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  setText(selector, value) {
    const element = this.el(selector);
    if (element) element.textContent = value ?? "—";
  },

  message(target, message, type = "info") {
    const element = typeof target === "string"
      ? this.el(target)
      : target;

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
    element.hidden = false;
    element.classList.remove("hidden");
    element.setAttribute("role", "status");
  },

  clearMessage(target) {
    const element = typeof target === "string"
      ? this.el(target)
      : target;

    if (!element) return;

    element.textContent = "";
    element.hidden = true;
    element.classList.add("hidden");
  },

  toast(message, type = "info") {
    const container =
      this.el("#adminToastContainer") ||
      this.el("#adminToast");

    if (container && container.id === "adminToastContainer") {
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;

      const icon = document.createElement("i");
      icon.className = type === "error"
        ? "fa-solid fa-circle-exclamation"
        : type === "success"
          ? "fa-solid fa-circle-check"
          : "fa-solid fa-circle-info";

      const text = document.createElement("p");
      text.textContent = message;

      toast.append(icon, text);
      container.appendChild(toast);

      window.setTimeout(() => toast.remove(), 4500);
      return;
    }

    let fallback = this.el("#zuneAdminToastFallback");

    if (!fallback) {
      fallback = document.createElement("div");
      fallback.id = "zuneAdminToastFallback";
      fallback.style.cssText =
        "position:fixed;bottom:18px;right:18px;z-index:9999;" +
        "background:#173f32;color:white;padding:14px 18px;" +
        "border-radius:10px;max-width:90vw;box-shadow:0 5px 25px #0002";
      document.body.appendChild(fallback);
    }

    fallback.textContent = message;
    fallback.style.background =
      type === "error" ? "#b42332" : "#173f32";

    window.clearTimeout(fallback._timer);
    fallback._timer = window.setTimeout(() => {
      fallback.remove();
    }, 4000);
  },

  async query(table, buildQuery) {
    if (!zuneSupabase) {
      throw new Error("Muunganisho wa Supabase haujaanzishwa.");
    }

    const result = await buildQuery(zuneSupabase.from(table));

    if (result.error) {
      console.error(`ZUNE Admin / ${table}:`, result.error);
      throw result.error;
    }

    return result.data;
  },

  errorMessage(error) {
    const message = String(error?.message || "");

    if (/Invalid login credentials/i.test(message)) {
      return "Email au password si sahihi.";
    }

    if (/Email not confirmed/i.test(message)) {
      return "Thibitisha email yako kabla ya kuingia.";
    }

    if (/Failed to fetch|NetworkError/i.test(message)) {
      return "Mtandao haujapatikana. Kagua internet kisha ujaribu tena.";
    }

    if (/row-level security|permission denied|not allowed/i.test(message)) {
      return "Huna ruhusa ya kufanya kitendo hiki. Kagua sera za usalama za Supabase.";
    }

    return message || "Hitilafu imetokea. Jaribu tena.";
  }
};


/* =========================================================
   KUANZISHA SUPABASE
========================================================= */

function zuneConnectSupabase() {
  if (zuneSupabase) return zuneSupabase;

  if (!window.supabase?.createClient) {
    throw new Error(
      "Supabase SDK haijapakiwa. Kagua script ya Supabase kwenye admin.html."
    );
  }

  zuneSupabase = window.supabase.createClient(
    ZUNE_SUPABASE_URL,
    ZUNE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return zuneSupabase;
}


/* =========================================================
   KUONYESHA LOGIN AU DASHBOARD
========================================================= */

function zuneShowLogin() {
  const login = ZUNE.el("#adminLoginScreen");
  const dashboard = ZUNE.el("#adminDashboard");

  if (login) {
    login.hidden = false;
    login.classList.remove("hidden");
  }

  if (dashboard) {
    dashboard.hidden = true;
    dashboard.classList.add("hidden");
  }
}

function zuneShowDashboard() {
  const login = ZUNE.el("#adminLoginScreen");
  const dashboard = ZUNE.el("#adminDashboard");

  if (login) {
    login.hidden = true;
    login.classList.add("hidden");
  }

  if (dashboard) {
    dashboard.hidden = false;
    dashboard.classList.remove("hidden");
  }
}

function zuneSetBusy(isBusy) {
  zuneAdminBusy = isBusy;

  const button = ZUNE.el("#adminLoginButton");

  if (button) {
    button.disabled = isBusy;
    button.setAttribute("aria-busy", String(isBusy));

    const label = ZUNE.el("span", button);

    if (label) {
      label.textContent = isBusy
        ? "Inathibitisha..."
        : "Ingia kwenye Admin";
    }
  }

  const refreshButton = ZUNE.el("#adminRefreshButton");
  if (refreshButton) refreshButton.disabled = isBusy;
}


/* =========================================================
   KUTHIBITISHA RUHUSA ZA ADMIN
========================================================= */

async function zuneVerifyAdmin(session) {
  if (!session?.user?.id) {
    throw new Error("Hakuna session halali. Tafadhali ingia tena.");
  }

  const { data: profile, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, phone_number, role, is_verified, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!profile || profile.role !== "admin") {
    await zuneSupabase.auth.signOut();

    zuneAdminSession = null;
    zuneAdminProfile = null;

    throw new Error(
      "Akaunti hii haina ruhusa ya kutumia ZUNE Admin Dashboard."
    );
  }

  zuneAdminSession = session;
  zuneAdminProfile = profile;

  return profile;
}


/* =========================================================
   TAARIFA ZA ADMIN ALIYEINGIA
========================================================= */

function zuneUpdateAdminIdentity() {
  const name =
    zuneAdminProfile?.full_name ||
    zuneAdminSession?.user?.email ||
    "ZUNE Admin";

  const email = zuneAdminSession?.user?.email || "—";
  const avatar = name.trim().charAt(0).toUpperCase() || "A";

  [
    "#sidebarAdminName",
    "#settingsAdminName"
  ].forEach(selector => ZUNE.setText(selector, name));

  [
    "#settingsAdminEmail"
  ].forEach(selector => ZUNE.setText(selector, email));

  [
    "#sidebarAdminAvatar",
    "#settingsAdminAvatar"
  ].forEach(selector => ZUNE.setText(selector, avatar));

  ZUNE.setText("#settingsAdminRole", zuneAdminProfile?.role || "admin");
  ZUNE.setText("#settingsSessionStatus", "Imeunganishwa");
}


/* =========================================================
   LOGIN KUPITIA SUPABASE AUTH
========================================================= */

async function zuneAdminLogin(event) {
  event.preventDefault();

  if (zuneAdminBusy) return;

  const form = event.currentTarget;
  const email = ZUNE.el("[name='email']", form)?.value?.trim();
  const password = ZUNE.el("[name='password']", form)?.value;

  const message = ZUNE.el("#loginMessage");
  ZUNE.clearMessage(message);

  if (!email || !password) {
    ZUNE.message(
      message,
      "Weka email na password yako.",
      "error"
    );
    return;
  }

  zuneSetBusy(true);

  try {
    const { data, error } =
      await zuneSupabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    await zuneVerifyAdmin(data.session);

    zuneShowDashboard();
    zuneUpdateAdminIdentity();

    zuneOpenSection("overviewSection");

    form.reset();

    ZUNE.toast(
      "Umeingia kwenye ZUNE Premium Admin.",
      "success"
    );
  } catch (error) {
    console.error("ZUNE Admin login:", error);

    ZUNE.message(
      message,
      ZUNE.errorMessage(error),
      "error"
    );

    zuneShowLogin();
  } finally {
    zuneSetBusy(false);
  }
}


/* =========================================================
   KUTOKA KWENYE AKAUNTI
========================================================= */

async function zuneAdminLogout() {
  if (zuneAdminBusy || !zuneSupabase) return;

  const confirmed = window.confirm(
    "Una uhakika unataka kutoka kwenye Admin Dashboard?"
  );

  if (!confirmed) return;

  zuneSetBusy(true);

  try {
    const { error } = await zuneSupabase.auth.signOut();

    if (error) throw error;

    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin();

    ZUNE.clearMessage("#loginMessage");
    ZUNE.toast("Umetoka kwenye akaunti.", "success");
  } catch (error) {
    console.error("Admin logout:", error);
    ZUNE.toast(ZUNE.errorMessage(error), "error");
  } finally {
    zuneSetBusy(false);
  }
}


/* =========================================================
   NAVIGATION YA DASHBOARD
========================================================= */

const ZUNE_SECTIONS = {
  overviewSection: {
    title: "Muhtasari",
    subtitle: "Muhtasari wa shughuli za ZUNE Marketplace"
  },
  analyticsSection: {
    title: "Takwimu na Ripoti",
    subtitle: "Takwimu za biashara kutoka Supabase"
  },
  applicationsSection: {
    title: "Maombi ya Wauzaji",
    subtitle: "Kagua na simamia maombi ya wauzaji"
  },
  productsSection: {
    title: "Bidhaa",
    subtitle: "Angalia bidhaa zilizowekwa kwenye soko"
  },
  ordersSection: {
    title: "Oda na Malipo",
    subtitle: "Fuatilia oda na hali zake"
  },
  usersSection: {
    title: "Watumiaji",
    subtitle: "Simamia akaunti za ZUNE"
  },
  announcementsSection: {
    title: "Matangazo ya Admin",
    subtitle: "Tengeneza na simamia matangazo"
  },
  notificationsSection: {
    title: "Notifications",
    subtitle: "Taarifa za mfumo"
  },
  verificationSection: {
    title: "Uhakiki wa Akaunti",
    subtitle: "Simamia hali ya uhakiki"
  },
  settingsSection: {
    title: "Mipangilio",
    subtitle: "Mapendeleo na usalama wa akaunti"
  }
};

function zuneOpenSection(sectionName) {
  const section = ZUNE_SECTIONS[sectionName];

  if (!section) {
    ZUNE.toast("Sehemu uliyochagua haipo.", "error");
    return;
  }

  zuneCurrentSection = sectionName;

  ZUNE.all(".page-section").forEach(element => {
    const active = element.id === sectionName;

    element.hidden = !active;
    element.classList.toggle("active", active);
  });

  ZUNE.all("[data-section]").forEach(button => {
    const active = button.dataset.section === sectionName;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  ZUNE.setText("#currentPageTitle", section.title);
  ZUNE.setText("#currentPageSubtitle", section.subtitle);

  ZUNE.el("#adminSidebar")?.classList.remove("open");
  ZUNE.el("#sidebarBackdrop")?.classList.remove("visible");

  if (sectionName === "overviewSection") {
    zuneLoadOverview();
  }

  if (sectionName === "analyticsSection") {
    zuneLoadAnalytics();
  }

  if (sectionName === "applicationsSection") {
    zuneLoadApplications();
  }

  if (sectionName === "productsSection") {
    zuneLoadProducts();
  }

  if (sectionName === "ordersSection") {
    zuneLoadOrders();
  }

  if (sectionName === "usersSection") {
    zuneLoadUsers();
  }

  if (sectionName === "announcementsSection") {
    zuneLoadAnnouncements();
  }

  if (sectionName === "notificationsSection") {
    zuneLoadNotifications();
  }

  if (sectionName === "verificationSection") {
    zuneLoadVerification();
  }
}


/* =========================================================
   KUFUNGA/KUFUNGUA SIDEBAR KWENYE SIMU
========================================================= */

function zuneBindNavigation() {
  ZUNE.all("[data-section]").forEach(button => {
    if (button.dataset.zuneBound === "true") return;

    button.dataset.zuneBound = "true";

    button.addEventListener("click", () => {
      zuneOpenSection(button.dataset.section);
    });
  });

  ZUNE.el("#adminMenuToggle")?.addEventListener("click", () => {
    ZUNE.el("#adminSidebar")?.classList.toggle("open");
    ZUNE.el("#sidebarBackdrop")?.classList.toggle("visible");
  });

  ZUNE.el("#sidebarBackdrop")?.addEventListener("click", () => {
    ZUNE.el("#adminSidebar")?.classList.remove("open");
    ZUNE.el("#sidebarBackdrop")?.classList.remove("visible");
  });

  ZUNE.el("#adminLogoutButton")?.addEventListener(
    "click",
    zuneAdminLogout
  );

  ZUNE.el("#settingsLogoutButton")?.addEventListener(
    "click",
    zuneAdminLogout
  );

  ZUNE.el("#adminRefreshButton")?.addEventListener(
    "click",
    zuneRefreshCurrentSection
  );
}

/* =========================================================
   ZUNE PREMIUM ADMIN
   SEHEMU YA 2/5
   Dashboard overview, analytics na takwimu
========================================================= */


/* =========================================================
   HELPERS ZA DATA
========================================================= */

async function zuneCountRows(table, configure) {
  let query = zuneSupabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (typeof configure === "function") {
    query = configure(query);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

async function zuneFetchRows(
  table,
  columns = "*",
  configure = null
) {
  let query = zuneSupabase.from(table).select(columns);

  if (typeof configure === "function") {
    query = configure(query);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function zuneSafeCount(table, configure) {
  try {
    return await zuneCountRows(table, configure);
  } catch (error) {
    console.error(`Kuhesabu ${table} kumeshindikana:`, error);
    return null;
  }
}

function zuneSetStat(selector, value) {
  const element = ZUNE.el(selector);
  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? "—"
      : ZUNE.number(value);
}

function zuneSetMoneyStat(selector, value) {
  const element = ZUNE.el(selector);
  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? "—"
      : ZUNE.money(value);
}

function zuneSetLoading(selector, text = "Inapakia...") {
  const element = ZUNE.el(selector);
  if (element) element.textContent = text;
}

function zuneRequireAdmin() {
  if (!zuneAdminSession?.user?.id || !zuneAdminProfile) {
    throw new Error(
      "Session ya admin haipo. Tafadhali ingia tena."
    );
  }

  if (zuneAdminProfile.role !== "admin") {
    throw new Error("Huna ruhusa ya kutumia dashboard hii.");
  }
}


/* =========================================================
   KUPAKIA TAKWIMU ZA DASHBOARD
========================================================= */

async function zuneLoadOverview() {
  if (!zuneSupabase || !zuneAdminSession) return;

  try {
    zuneRequireAdmin();

    const statSelectors = [
      "#statTotalSales",
      "#statTotalOrders",
      "#statTotalSellers",
      "#statTotalCustomers",
      "#pendingAppsCount"
    ];

    statSelectors.forEach(selector => {
      zuneSetLoading(selector);
    });

    const results = await Promise.all([
      zuneSafeCount("orders"),
      zuneSafeCount("products"),
      zuneSafeCount("profiles", query =>
        query.eq("role", "vendor")
      ),
      zuneSafeCount("profiles", query =>
        query.eq("role", "buyer")
      ),
      zuneSafeCount("seller_applications", query =>
        query.eq("status", "pending")
      )
    ]);

    const [
      totalOrders,
      totalProducts,
      totalSellers,
      totalCustomers,
      pendingApplications
    ] = results;

    zuneSetStat("#statTotalOrders", totalOrders);
    zuneSetStat("#statTotalProducts", totalProducts);
    zuneSetStat("#statTotalSellers", totalSellers);
    zuneSetStat("#statTotalCustomers", totalCustomers);
    zuneSetStat("#pendingAppsCount", pendingApplications);

    const salesResult = await zuneFetchRows(
      "orders",
      "total_price,status"
    ).catch(error => {
      console.error("Kusoma mauzo kumeshindikana:", error);
      return null;
    });

    if (salesResult) {
      const completedSales = salesResult
        .filter(order => order.status === "completed")
        .reduce(
          (total, order) =>
            total + (Number(order.total_price) || 0),
          0
        );

      zuneSetMoneyStat("#statTotalSales", completedSales);
    } else {
      zuneSetMoneyStat("#statTotalSales", null);
    }

    zuneSetStat("#statTotalProducts", totalProducts);

    const statusElement = ZUNE.el("#adminDataStatus");

    if (statusElement) {
      const failed = results.some(value => value === null);

      statusElement.textContent = failed
        ? "Baadhi ya takwimu hazikupatikana. Kagua ruhusa za Supabase."
        : "Takwimu zimepakiwa kutoka Supabase.";

      statusElement.classList.toggle("error", failed);
    }

    await zuneLoadRecentOrders();
    await zuneLoadRecentApplications();

  } catch (error) {
    console.error("ZUNE overview error:", error);

    ZUNE.toast(
      ZUNE.errorMessage(error),
      "error"
    );
  }
}


/* =========================================================
   ODA ZA KARIBUNI KWENYE DASHBOARD
========================================================= */

async function zuneLoadRecentOrders() {
  const container =
    ZUNE.el("#recentOrdersTableBody") ||
    ZUNE.el("#recentOrdersBody");

  if (!container || !zuneAdminSession) return;

  container.replaceChildren();

  try {
    const orders = await zuneFetchRows(
      "orders",
      "id,buyer_id,product_id,quantity,total_price,status,created_at",
      query => query
        .order("created_at", { ascending: false })
        .limit(5)
    );

    if (!orders.length) {
      zuneRenderEmptyRow(
        container,
        5,
        "Hakuna oda zilizopatikana."
      );
      return;
    }

    orders.forEach(order => {
      const row = document.createElement("tr");

      const values = [
        String(order.id).slice(0, 8),
        order.product_id
          ? String(order.product_id).slice(0, 8)
          : "—",
        ZUNE.money(order.total_price),
        order.status || "—",
        ZUNE.date(order.created_at)
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      container.appendChild(row);
    });

  } catch (error) {
    console.error("Recent orders error:", error);

    zuneRenderEmptyRow(
      container,
      5,
      "Imeshindwa kupakia oda."
    );
  }
}


/* =========================================================
   MAOMBI YA W A U Z A J I YA KARIBUNI
========================================================= */

async function zuneLoadRecentApplications() {
  const container =
    ZUNE.el("#recentApplicationsTableBody") ||
    ZUNE.el("#recentApplicationsBody");

  if (!container || !zuneAdminSession) return;

  container.replaceChildren();

  try {
    const applications = await zuneFetchRows(
      "seller_applications",
      "id,store_name,owner_name,country,status,created_at",
      query => query
        .order("created_at", { ascending: false })
        .limit(5)
    );

    if (!applications.length) {
      zuneRenderEmptyRow(
        container,
        5,
        "Hakuna maombi ya wauzaji."
      );
      return;
    }

    applications.forEach(application => {
      const row = document.createElement("tr");

      [
        application.store_name || "—",
        application.owner_name || "—",
        application.country || "—",
        application.status || "pending",
        ZUNE.date(application.created_at)
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      container.appendChild(row);
    });

  } catch (error) {
    console.error("Recent applications error:", error);

    zuneRenderEmptyRow(
      container,
      5,
      "Imeshindwa kupakia maombi."
    );
  }
}


/* =========================================================
   KUONYESHA ROW TUPU
========================================================= */

function zuneRenderEmptyRow(container, columnCount, message) {
  if (!container) return;

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = columnCount;
  cell.textContent = message;
  cell.className = "empty-state";

  row.appendChild(cell);
  container.appendChild(row);
}


/* =========================================================
   ANALYTICS NA RIPOTI
========================================================= */

async function zuneLoadAnalytics() {
  if (!zuneSupabase || !zuneAdminSession) return;

  try {
    zuneRequireAdmin();

    const orders = await zuneFetchRows(
      "orders",
      "total_price,status,created_at"
    );

    const productsCount = await zuneSafeCount("products");
    const usersCount = await zuneSafeCount("profiles");

    const completedOrders = orders.filter(
      order => order.status === "completed"
    );

    const pendingOrders = orders.filter(
      order => order.status === "pending"
    );

    const cancelledOrders = orders.filter(
      order => order.status === "cancelled"
    );

    const completedRevenue = completedOrders.reduce(
      (total, order) =>
        total + (Number(order.total_price) || 0),
      0
    );

    ZUNE.setText(
      "#analyticsTotalRevenue",
      ZUNE.money(completedRevenue)
    );

    zuneSetStat("#analyticsTotalOrders", orders.length);
    zuneSetStat("#analyticsCompletedOrders", completedOrders.length);
    zuneSetStat("#analyticsPendingOrders", pendingOrders.length);
    zuneSetStat("#analyticsCancelledOrders", cancelledOrders.length);
    zuneSetStat("#analyticsTotalProducts", productsCount);
    zuneSetStat("#analyticsTotalUsers", usersCount);

    zuneRenderSalesByMonth(orders);

  } catch (error) {
    console.error("Analytics error:", error);

    ZUNE.toast(
      "Imeshindwa kupakia takwimu. Kagua ruhusa za Supabase.",
      "error"
    );
  }
}


/* =========================================================
   MAUZO KWA MWEZI
========================================================= */

function zuneRenderSalesByMonth(orders) {
  const container = ZUNE.el("#salesByMonth");

  if (!container) return;

  container.replaceChildren();

  const months = new Map();

  orders
    .filter(order => order.status === "completed")
    .forEach(order => {
      const date = new Date(order.created_at);

      if (Number.isNaN(date.getTime())) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0")
      ].join("-");

      months.set(
        key,
        (months.get(key) || 0) +
          (Number(order.total_price) || 0)
      );
    });

  const entries = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.textContent = "Hakuna data ya mauzo iliyokamilika bado.";
    container.appendChild(empty);
    return;
  }

  entries.forEach(([month, amount]) => {
    const item = document.createElement("div");
    item.className = "sales-month-item";

    const label = document.createElement("span");
    label.textContent = month;

    const value = document.createElement("strong");
    value.textContent = ZUNE.money(amount);

    item.append(label, value);
    container.appendChild(item);
  });
}


/* =========================================================
   KUBORESHA SEHEMU ILIYO WAZI
========================================================= */

async function zuneRefreshCurrentSection() {
  if (!zuneAdminSession) {
    ZUNE.toast("Tafadhali ingia tena.", "error");
    return;
  }

  ZUNE.toast("Inasasisha data...", "info");

  switch (zuneCurrentSection) {
    case "overviewSection":
      await zuneLoadOverview();
      break;

    case "analyticsSection":
      await zuneLoadAnalytics();
      break;

    case "applicationsSection":
      await zuneLoadApplications();
      break;

    case "productsSection":
      await zuneLoadProducts();
      break;

    case "ordersSection":
      await zuneLoadOrders();
      break;

    case "usersSection":
      await zuneLoadUsers();
      break;

    case "announcementsSection":
      await zuneLoadAnnouncements();
      break;

    case "notificationsSection":
      await zuneLoadNotifications();
      break;

    case "verificationSection":
      await zuneLoadVerification();
      break;

    default:
      ZUNE.toast("Sehemu hii haina data ya kusasisha.", "info");
  }
}

/* =========================================================
   ZUNE PREMIUM ADMIN
   SEHEMU YA 3/5
   Sellers, Products, Orders na Users
========================================================= */


/* =========================================================
   HELPERS ZA KUJENGA JEDWALI
========================================================= */

function zuneBuildCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined
    ? "—"
    : String(value);
  return cell;
}

function zuneBuildActionButton(label, action, id, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = String(id);
  button.className = `admin-action-button ${variant}`.trim();
  return button;
}

function zuneGetTableBody(...selectors) {
  for (const selector of selectors) {
    const element = ZUNE.el(selector);
    if (element) return element;
  }
  return null;
}

function zuneRenderTableMessage(container, columns, message) {
  if (!container) return;

  container.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = columns;
  cell.textContent = message;
  cell.className = "empty-state";

  row.appendChild(cell);
  container.appendChild(row);
}

function zuneFormatStatus(status) {
  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    active: "Hai",
    inactive: "Haifanyi kazi"
  };

  return labels[String(status || "").toLowerCase()] ||
    status ||
    "—";
}

function zuneEnsureAdminActionAllowed() {
  zuneRequireAdmin();

  if (!zuneSupabase || !zuneAdminSession) {
    throw new Error("Session ya admin haipo.");
  }
}


/* =========================================================
   1. MAOMBI YA WAUZAJI
========================================================= */

async function zuneLoadApplications() {
  const body = zuneGetTableBody(
    "#applicationsTableBody",
    "#sellerApplicationsTableBody",
    "#applicationsTable tbody"
  );

  if (!body || !zuneAdminSession) return;

  body.replaceChildren();

  try {
    zuneRequireAdmin();

    const applications = await zuneFetchRows(
      "seller_applications",
      "id,store_name,owner_name,phone,country,region,district,status,created_at",
      query => query.order("created_at", { ascending: false })
    );

    if (!applications.length) {
      zuneRenderTableMessage(
        body,
        7,
        "Hakuna maombi ya wauzaji yaliyopatikana."
      );
      return;
    }

    applications.forEach(application => {
      const row = document.createElement("tr");

      [
        application.store_name,
        application.owner_name,
        application.phone,
        application.country,
        application.region,
        zuneFormatStatus(application.status),
        ZUNE.date(application.created_at)
      ].forEach(value => row.appendChild(zuneBuildCell(value)));

      const actionCell = document.createElement("td");

      if (application.status === "pending") {
        actionCell.append(
          zuneBuildActionButton(
            "Idhinisha",
            "approve-application",
            application.id,
            "success"
          ),
          zuneBuildActionButton(
            "Kataa",
            "reject-application",
            application.id,
            "danger"
          )
        );
      } else {
        actionCell.textContent = "Hakuna hatua";
      }

      row.appendChild(actionCell);
      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load seller applications:", error);

    zuneRenderTableMessage(
      body,
      8,
      ZUNE.errorMessage(error)
    );
  }
}


async function zuneUpdateApplicationStatus(id, status) {
  zuneEnsureAdminActionAllowed();

  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Hali ya ombi si sahihi.");
  }

  const confirmed = window.confirm(
    status === "approved"
      ? "Una uhakika unataka kuidhinisha ombi hili?"
      : "Una uhakika unataka kukataa ombi hili?"
  );

  if (!confirmed) return;

  const { data, error } = await zuneSupabase
    .from("seller_applications")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,status")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Ombi halijabadilishwa. Linaweza kuwa limeshughulikiwa tayari au huna ruhusa."
    );
  }

  ZUNE.toast(
    status === "approved"
      ? "Ombi limeidhinishwa."
      : "Ombi limekataliwa.",
    "success"
  );

  await zuneLoadApplications();
  await zuneLoadOverview();
}


/* =========================================================
   2. BIDHAA
========================================================= */

async function zuneLoadProducts() {
  const body = zuneGetTableBody(
    "#productsTableBody",
    "#adminProductsTableBody",
    "#productsTable tbody"
  );

  if (!body || !zuneAdminSession) return;

  body.replaceChildren();

  try {
    zuneRequireAdmin();

    const products = await zuneFetchRows(
      "products",
      "id,title,description,price,stock_quantity,vendor_id,created_at",
      query => query.order("created_at", { ascending: false })
    );

    if (!products.length) {
      zuneRenderTableMessage(
        body,
        6,
        "Hakuna bidhaa zilizopatikana."
      );
      return;
    }

    products.forEach(product => {
      const row = document.createElement("tr");

      [
        product.title,
        ZUNE.money(product.price),
        ZUNE.number(product.stock_quantity),
        product.vendor_id
          ? String(product.vendor_id).slice(0, 8)
          : "—",
        ZUNE.date(product.created_at)
      ].forEach(value => row.appendChild(zuneBuildCell(value)));

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Tazama",
          "view-product",
          product.id
        )
      );

      row.appendChild(actions);
      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load products:", error);

    zuneRenderTableMessage(
      body,
      6,
      ZUNE.errorMessage(error)
    );
  }
}


async function zuneViewProduct(id) {
  zuneEnsureAdminActionAllowed();

  const { data, error } = await zuneSupabase
    .from("products")
    .select("id,title,description,price,stock_quantity,vendor_id,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Bidhaa haijapatikana.");
  }

  const details = [
    `Jina: ${data.title || "—"}`,
    `Bei: ${ZUNE.money(data.price)}`,
    `Stock: ${ZUNE.number(data.stock_quantity)}`,
    `Vendor ID: ${data.vendor_id || "—"}`,
    `Maelezo: ${data.description || "Hakuna maelezo."}`
  ].join("\n\n");

  window.alert(details);
}


/* =========================================================
   3. ODA
========================================================= */

async function zuneLoadOrders() {
  const body = zuneGetTableBody(
    "#ordersTableBody",
    "#adminOrdersTableBody",
    "#ordersTable tbody"
  );

  if (!body || !zuneAdminSession) return;

  body.replaceChildren();

  try {
    zuneRequireAdmin();

    const orders = await zuneFetchRows(
      "orders",
      "id,buyer_id,product_id,quantity,total_price,commission_fee,status,created_at",
      query => query.order("created_at", { ascending: false })
    );

    if (!orders.length) {
      zuneRenderTableMessage(
        body,
        7,
        "Hakuna oda zilizopatikana."
      );
      return;
    }

    orders.forEach(order => {
      const row = document.createElement("tr");

      [
        String(order.id).slice(0, 8),
        order.buyer_id
          ? String(order.buyer_id).slice(0, 8)
          : "—",
        order.product_id
          ? String(order.product_id).slice(0, 8)
          : "—",
        ZUNE.number(order.quantity),
        ZUNE.money(order.total_price),
        zuneFormatStatus(order.status),
        ZUNE.date(order.created_at)
      ].forEach(value => row.appendChild(zuneBuildCell(value)));

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Angalia",
          "view-order",
          order.id
        )
      );

      row.appendChild(actions);
      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load orders:", error);

    zuneRenderTableMessage(
      body,
      8,
      ZUNE.errorMessage(error)
    );
  }
}


async function zuneViewOrder(id) {
  zuneEnsureAdminActionAllowed();

  const { data, error } = await zuneSupabase
    .from("orders")
    .select("id,buyer_id,product_id,quantity,total_price,commission_fee,status,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Oda haijapatikana.");
  }

  window.alert([
    `Oda: ${data.id}`,
    `Mteja: ${data.buyer_id || "—"}`,
    `Bidhaa ID: ${data.product_id || "—"}`,
    `Idadi: ${ZUNE.number(data.quantity)}`,
    `Jumla: ${ZUNE.money(data.total_price)}`,
    `Commission: ${ZUNE.money(data.commission_fee)}`,
    `Hali: ${zuneFormatStatus(data.status)}`,
    `Tarehe: ${ZUNE.date(data.created_at)}`
  ].join("\n\n"));
}


/* =========================================================
   4. WATUMIAJI
========================================================= */

async function zuneLoadUsers() {
  const body = zuneGetTableBody(
    "#usersTableBody",
    "#adminUsersTableBody",
    "#usersTable tbody"
  );

  if (!body || !zuneAdminSession) return;

  body.replaceChildren();

  try {
    zuneRequireAdmin();

    const users = await zuneFetchRows(
      "profiles",
      "id,full_name,phone_number,role,is_verified,created_at",
      query => query.order("created_at", { ascending: false })
    );

    if (!users.length) {
      zuneRenderTableMessage(
        body,
        6,
        "Hakuna watumiaji waliopatikana."
      );
      return;
    }

    users.forEach(user => {
      const row = document.createElement("tr");

      [
        user.full_name || "—",
        user.phone_number || "—",
        user.role || "buyer",
        user.is_verified ? "Amethibitishwa" : "Hajathibitishwa",
        String(user.id).slice(0, 8),
        ZUNE.date(user.created_at)
      ].forEach(value => row.appendChild(zuneBuildCell(value)));

      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load users:", error);

    zuneRenderTableMessage(
      body,
      6,
      ZUNE.errorMessage(error)
    );
  }
}


/* =========================================================
   5. VITENDO VYA JEDWALI
========================================================= */

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");

  if (!button || button.disabled) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (!action || !id) return;

  try {
    button.disabled = true;

    switch (action) {
      case "approve-application":
        await zuneUpdateApplicationStatus(id, "approved");
        break;

      case "reject-application":
        await zuneUpdateApplicationStatus(id, "rejected");
        break;

      case "view-product":
        await zuneViewProduct(id);
        break;

      case "view-order":
        await zuneViewOrder(id);
        break;

      default:
        return;
    }

  } catch (error) {
    console.error(`Admin action ${action}:`, error);

    ZUNE.toast(
      ZUNE.errorMessage(error),
      "error"
    );

  } finally {
    button.disabled = false;
  }
});

/* =========================================================
   ZUNE PREMIUM ADMIN
   SEHEMU YA 4/5
   Announcements, Notifications, Verification, Settings
========================================================= */


/* =========================================================
   HELPERS ZA FOMU
========================================================= */

function zuneFormValue(form, name) {
  return form.querySelector(`[name="${name}"]`)?.value?.trim() || "";
}

function zuneBindOnce(element, eventName, callback, key) {
  if (!element) return;

  const marker = `zuneBound${key}`;

  if (element.dataset[marker] === "true") return;

  element.dataset[marker] = "true";
  element.addEventListener(eventName, callback);
}


/* =========================================================
   1. MATANGAZO YA ADMIN
   Jedwali linalotarajiwa: admin_announcements
========================================================= */

async function zuneLoadAnnouncements() {
  const body = zuneGetTableBody(
    "#announcementsTableBody",
    "#adminAnnouncementsTableBody",
    "#announcementsTable tbody"
  );

  if (!zuneAdminSession) return;

  try {
    zuneRequireAdmin();

    const announcements = await zuneFetchRows(
      "admin_announcements",
      "*",
      query => query.order("created_at", { ascending: false })
    );

    if (body) {
      body.replaceChildren();

      if (!announcements.length) {
        zuneRenderTableMessage(
          body,
          6,
          "Hakuna matangazo yaliyopatikana."
        );
      } else {
        announcements.forEach(item => {
          const row = document.createElement("tr");

          [
            item.title || "—",
            item.audience || "all",
            item.display_type || "notification",
            zuneFormatStatus(item.status),
            ZUNE.date(item.expires_at),
            ZUNE.date(item.created_at)
          ].forEach(value => {
            row.appendChild(zuneBuildCell(value));
          });

          body.appendChild(row);
        });
      }
    }

    zuneRenderAnnouncementHistory(announcements);

  } catch (error) {
    console.error("Load announcements:", error);

    if (body) {
      zuneRenderTableMessage(
        body,
        6,
        ZUNE.errorMessage(error)
      );
    }
  }
}


function zuneRenderAnnouncementHistory(items) {
  const container = ZUNE.el("#announcementHistory");
  if (!container) return;

  container.replaceChildren();

  items.slice(0, 10).forEach(item => {
    const card = document.createElement("article");
    card.className = "announcement-history-item";

    const title = document.createElement("h4");
    title.textContent = item.title || "Tangazo";

    const message = document.createElement("p");
    message.textContent = item.message || "";

    const meta = document.createElement("small");
    meta.textContent =
      `${item.audience || "all"} · ${zuneFormatStatus(item.status)}`;

    card.append(title, message, meta);
    container.appendChild(card);
  });
}


function zuneBindAnnouncementForm() {
  const form = ZUNE.el("#announcementForm");
  if (!form) return;

  zuneBindOnce(form, "submit", async event => {
    event.preventDefault();

    try {
      zuneRequireAdmin();

      const title = zuneFormValue(form, "title");
      const message = zuneFormValue(form, "message");
      const audience = zuneFormValue(form, "audience") || "all";
      const displayType =
        zuneFormValue(form, "display_type") || "notification";
      const priority =
        zuneFormValue(form, "priority") || "normal";
      const expiresAt = zuneFormValue(form, "expires_at");

      if (!title || !message) {
        throw new Error("Weka kichwa na ujumbe wa tangazo.");
      }

      if (!["all", "buyers", "vendors"].includes(audience)) {
        throw new Error("Walengwa wa tangazo si sahihi.");
      }

      if (!["notification", "banner", "both"].includes(displayType)) {
        throw new Error("Aina ya tangazo si sahihi.");
      }

      const payload = {
        title,
        message,
        audience,
        display_type: displayType,
        priority,
        status: "published",
        created_by: zuneAdminSession.user.id,
        expires_at: expiresAt || null
      };

      const { error } = await zuneSupabase
        .from("admin_announcements")
        .insert(payload);

      if (error) throw error;

      form.reset();

      ZUNE.toast("Tangazo limehifadhiwa.", "success");

      await zuneLoadAnnouncements();

    } catch (error) {
      console.error("Create announcement:", error);

      ZUNE.toast(
        ZUNE.errorMessage(error),
        "error"
      );
    }
  }, "AnnouncementForm");
}


/* =========================================================
   2. NOTIFICATIONS
   Jedwali linalotarajiwa: notifications
========================================================= */

async function zuneLoadNotifications() {
  const body = zuneGetTableBody(
    "#notificationsTableBody",
    "#adminNotificationsTableBody",
    "#notificationsTable tbody"
  );

  if (!zuneAdminSession) return;

  try {
    zuneRequireAdmin();

    const notifications = await zuneFetchRows(
      "notifications",
      "*",
      query => query.order("created_at", { ascending: false }).limit(100)
    );

    if (!body) return;

    body.replaceChildren();

    if (!notifications.length) {
      zuneRenderTableMessage(
        body,
        4,
        "Hakuna notifications zilizopatikana."
      );
      return;
    }

    notifications.forEach(item => {
      const row = document.createElement("tr");

      [
        item.title || "—",
        item.message || "—",
        item.user_id || item.recipient_id || "—",
        ZUNE.date(item.created_at)
      ].forEach(value => {
        row.appendChild(zuneBuildCell(value));
      });

      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load notifications:", error);

    if (body) {
      zuneRenderTableMessage(
        body,
        4,
        ZUNE.errorMessage(error)
      );
    }
  }
}


/* =========================================================
   3. VERIFICATION
   Kusoma profiles zilizowekwa is_verified
========================================================= */

async function zuneLoadVerification() {
  const body = zuneGetTableBody(
    "#verificationTableBody",
    "#adminVerificationTableBody",
    "#verificationTable tbody"
  );

  if (!zuneAdminSession) return;

  try {
    zuneRequireAdmin();

    const profiles = await zuneFetchRows(
      "profiles",
      "id,full_name,phone_number,role,is_verified,created_at",
      query => query.order("created_at", { ascending: false })
    );

    if (!body) return;

    body.replaceChildren();

    if (!profiles.length) {
      zuneRenderTableMessage(
        body,
        5,
        "Hakuna akaunti zilizopatikana."
      );
      return;
    }

    profiles.forEach(profile => {
      const row = document.createElement("tr");

      [
        profile.full_name || "—",
        profile.phone_number || "—",
        profile.role || "buyer",
        profile.is_verified ? "Verified" : "Not verified"
      ].forEach(value => {
        row.appendChild(zuneBuildCell(value));
      });

      const actionCell = document.createElement("td");

      const status = document.createElement("span");
      status.textContent = profile.is_verified
        ? "Imethibitishwa"
        : "Inasubiri uhakiki";

      actionCell.appendChild(status);
      row.appendChild(actionCell);
      body.appendChild(row);
    });

  } catch (error) {
    console.error("Load verification:", error);

    if (body) {
      zuneRenderTableMessage(
        body,
        5,
        ZUNE.errorMessage(error)
      );
    }
  }
}


/* =========================================================
   4. SETTINGS
========================================================= */

function zuneLoadSettings() {
  if (!zuneAdminSession || !zuneAdminProfile) return;

  zuneUpdateAdminIdentity();

  ZUNE.setText(
    "#settingsProjectName",
    "ZUNE Premium Admin"
  );

  ZUNE.setText(
    "#settingsProjectUrl",
    ZUNE_SUPABASE_URL
  );

  ZUNE.setText(
    "#settingsAdminCreated",
    ZUNE.date(zuneAdminProfile.created_at)
  );

  ZUNE.setText(
    "#settingsUserId",
    zuneAdminSession.user.id
  );
}


/* =========================================================
   5. PREVIEW YA TANGAZO
========================================================= */

function zuneBindAnnouncementPreview() {
  const form = ZUNE.el("#announcementForm");
  const preview = ZUNE.el("#announcementPreview");

  if (!form || !preview) return;

  const updatePreview = () => {
    const title =
      zuneFormValue(form, "title") || "Kichwa cha tangazo";

    const message =
      zuneFormValue(form, "message") ||
      "Ujumbe wa tangazo utaonekana hapa.";

    const heading = preview.querySelector("[data-preview-title]");
    const body = preview.querySelector("[data-preview-message]");

    if (heading) heading.textContent = title;
    if (body) body.textContent = message;
  };

  zuneBindOnce(
    form,
    "input",
    updatePreview,
    "AnnouncementPreview"
  );

  updatePreview();
}


/* =========================================================
   6. KUANZISHA VIFAA VYA SEHEMU HII
========================================================= */

function zuneBindAdminForms() {
  zuneBindAnnouncementForm();
  zuneBindAnnouncementPreview();

  zuneBindOnce(
    ZUNE.el("#adminThemeToggle"),
    "click",
    () => {
      document.documentElement.classList.toggle("dark");
    },
    "ThemeToggle"
  );
}


/* =========================================================
   7. KUHAKIKISHA SETTINGS ZINAJAZWA
========================================================= */

function zuneOnAdminSettingsOpen() {
  zuneLoadSettings();
}
/* =========================================================
   ZUNE PREMIUM ADMIN
   SEHEMU YA 5/5 — INITIALIZATION & SESSION MANAGEMENT
   ========================================================= */

function zuneBindLoginForm() {
  const loginScreen = zuneEl("#adminLoginScreen");

  const loginForm =
    zuneEl("#adminLoginForm") ||
    loginScreen?.querySelector("form");

  if (!loginForm) {
    console.warn(
      "ZUNE Admin: Login form haijapatikana. Kagua admin.html."
    );
    return;
  }

  zuneBindOnce(
    loginForm,
    "submit",
    zuneAdminLogin,
    "LoginSubmit"
  );
}

function zuneBindSettingsSection() {
  if (window.zuneSettingsSectionBound) return;

  window.zuneSettingsSectionBound = true;

  document.addEventListener("click", function (event) {
    const sectionLink = event.target.closest("[data-section]");

    if (!sectionLink) return;

    const sectionName = sectionLink.getAttribute("data-section");

    if (sectionName === "settingsSection") {
      window.setTimeout(function () {
        if (zuneAdminSession && zuneAdminProfile) {
          zuneOnAdminSettingsOpen();
        }
      }, 0);
    }
  });
}

function zuneBindExtraControls() {
  const refreshButton = zuneEl("#adminRefreshButton");

  zuneBindOnce(
    refreshButton,
    "click",
    async function (event) {
      event.preventDefault();

      if (!zuneAdminSession || zuneAdminBusy) return;

      await zuneRefreshCurrentSection();
    },
    "ExtraRefresh"
  );

  const themeButton = zuneEl("#adminThemeToggle");

  zuneBindOnce(
    themeButton,
    "click",
    function (event) {
      event.preventDefault();

      document.documentElement.classList.toggle("dark");

      const enabled =
        document.documentElement.classList.contains("dark");

      themeButton.setAttribute(
        "aria-pressed",
        String(enabled)
      );
    },
    "ExtraTheme"
  );
}

async function zuneRestoreAdminSession() {
  if (!zuneSupabase) return;

  try {
    const { data, error } =
      await zuneSupabase.auth.getSession();

    if (error) throw error;

    const session = data?.session;

    if (!session) {
      zuneAdminSession = null;
      zuneAdminProfile = null;
      zuneShowLogin();
      return;
    }

    await zuneVerifyAdmin(session);

    zuneShowDashboard();
    zuneUpdateAdminIdentity();

    zuneOpenSection("overviewSection");

    zuneClearMessage(
      "#loginMessage",
      "#adminGlobalMessage"
    );
  } catch (error) {
    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin();

    zuneMessage(
      "#loginMessage",
      zuneErrorMessage(error),
      "error"
    );
  }
}

function zuneListenForAuthChanges() {
  if (!zuneSupabase || window.zuneAuthListenerBound) return;

  window.zuneAuthListenerBound = true;

  zuneSupabase.auth.onAuthStateChange(
    function (event, session) {
      /*
       * Epuka kuita Supabase Auth methods moja kwa moja
       * ndani ya callback hii.
       */
      if (event === "SIGNED_OUT" || !session) {
        zuneAdminSession = null;
        zuneAdminProfile = null;

        zuneShowLogin();
      }
    }
  );
}

async function zuneInitializeAdmin() {
  if (zuneInitialized) return;

  zuneInitialized = true;

  zuneShowLogin();

  zuneBindNavigation();
  zuneBindAdminForms();
  zuneBindLoginForm();
  zuneBindSettingsSection();
  zuneBindExtraControls();

  try {
    zuneConnectSupabase();

    zuneListenForAuthChanges();

    await zuneRestoreAdminSession();
  } catch (error) {
    zuneShowLogin();

    zuneMessage(
      "#loginMessage",
      zuneErrorMessage(error),
      "error"
    );

    console.error(
      "ZUNE Admin initialization error:",
      error
    );
  }
}

/* Anzisha mfumo baada ya HTML kuwa tayari. */
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    zuneInitializeAdmin,
    { once: true }
  );
} else {
  zuneInitializeAdmin();
}