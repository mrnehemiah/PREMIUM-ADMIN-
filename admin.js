"use strict";
const ZUNE_SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const ZUNE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

let zuneSupabase = null;
let zuneAdminSession = null;
let zuneAdminProfile = null;
let zuneCurrentSection = "overview";
let zuneAdminBusy = false;
let zuneAdminInitialized = false;

const ZUNE = {
  moneyFormatter: new Intl.NumberFormat("sw-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }),

  numberFormatter: new Intl.NumberFormat("sw-TZ"),

  money(value) {
    return this.moneyFormatter.format(Number(value) || 0);
  },

  number(value) {
    return this.numberFormatter.format(Number(value) || 0);
  },

  date(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

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

  element(selector, parent = document) {
    return parent.querySelector(selector);
  },

  all(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  setText(selector, value) {
    const element = this.element(selector);

    if (element) {
      element.textContent = value ?? "—";
    }
  },

  message(target, message, type = "info") {
    const element = typeof target === "string"
      ? this.element(target)
      : target;

    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
    element.hidden = false;
  },

  clearMessage(target) {
    const element = typeof target === "string"
      ? this.element(target)
      : target;

    if (!element) return;

    element.textContent = "";
    element.hidden = true;
  },

  toast(message, type = "info") {
    let toast = this.element("#adminToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "adminToast";
      toast.className = "admin-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(toast._hideTimer);

    toast._hideTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  },

  async query(table, operation) {
    if (!zuneSupabase) {
      throw new Error("Supabase haijaunganishwa.");
    }

    const result = await operation(
      zuneSupabase.from(table)
    );

    if (result.error) {
      console.error(
        `ZUNE Supabase error (${table}):`,
        result.error
      );

      throw result.error;
    }

    return result.data;
  }
};
function zuneConnectSupabase() {
  if (zuneSupabase) {
    return zuneSupabase;
  }

  if (!window.supabase?.createClient) {
    throw new Error(
      "Supabase SDK haijapakiwa. Kagua admin.html."
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
function zuneShowLogin(message = "") {
  const loginPanel =
    ZUNE.element("#adminLoginPanel") ||
    ZUNE.element("#adminLoginScreen");

  const dashboard =
    ZUNE.element("#adminDashboard");

  if (loginPanel) {
    loginPanel.hidden = false;
    loginPanel.style.display = "";
  }

  if (dashboard) {
    dashboard.hidden = true;
    dashboard.style.display = "none";
  }

  if (message) {
    ZUNE.message(
      ZUNE.element("#loginMessage") ||
      ZUNE.element("#adminLoginMessage"),
      message,
      "error"
    );
  }
}


function zuneShowDashboard() {
  const loginPanel =
    ZUNE.element("#adminLoginPanel") ||
    ZUNE.element("#adminLoginScreen");

  const dashboard =
    ZUNE.element("#adminDashboard");

  if (loginPanel) {
    loginPanel.hidden = true;
    loginPanel.style.display = "none";
  }

  if (dashboard) {
    dashboard.hidden = false;
    dashboard.style.display = "";
  }
}


function zuneSetLoginBusy(busy) {
  zuneAdminBusy = busy;

  const form =
    ZUNE.element("#adminLoginForm") ||
    ZUNE.element("#adminLoginPanel form") ||
    ZUNE.element("#adminLoginScreen form");

  if (!form) return;

  ZUNE.all(
    "button[type='submit'], input[type='submit']",
    form
  ).forEach(button => {
    button.disabled = busy;
  });
}
async function zuneVerifyAdmin(session) {
  if (!session?.user?.id) {
    throw new Error(
      "Tafadhali ingia kwa akaunti yako ya admin."
    );
  }

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select(
      "id, full_name, phone_number, role, is_verified, created_at"
    )
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.role !== "admin") {
    throw new Error(
      "Akaunti hii haina ruhusa ya kutumia Admin Dashboard."
    );
  }

  zuneAdminSession = session;
  zuneAdminProfile = data;

  return data;
}
function zuneUpdateAdminIdentity() {
  const profile = zuneAdminProfile;
  const email = zuneAdminSession?.user?.email || "";

  const name =
    profile?.full_name ||
    email ||
    "ZUNE Admin";

  [
    "#adminName",
    "#adminUserName",
    "#sidebarAdminName",
    "[data-admin-name]"
  ].forEach(selector => {
    ZUNE.all(selector).forEach(element => {
      element.textContent = name;
    });
  });

  [
    "#adminEmail",
    "#adminUserEmail",
    "[data-admin-email]"
  ].forEach(selector => {
    ZUNE.all(selector).forEach(element => {
      element.textContent = email;
    });
  });
}
function zuneFriendlyError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  if (
    message.includes("invalid login credentials")
  ) {
    return "Email au password si sahihi.";
  }

  if (
    message.includes("email not confirmed")
  ) {
    return "Thibitisha email yako kabla ya kuingia.";
  }

  if (
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "Ruhusa za Supabase haziruhusu kitendo hiki.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Tatizo la mtandao. Jaribu tena.";
  }

  return error?.message ||
    "Hitilafu imetokea. Tafadhali jaribu tena.";
}
async function zuneAdminLogin(event) {
  event.preventDefault();

  if (zuneAdminBusy) return;

  const form = event.currentTarget;
  const email = form.querySelector(
    '[name="email"], #adminEmail, #loginEmail'
  )?.value?.trim();

  const password = form.querySelector(
    '[name="password"], #adminPassword, #loginPassword'
  )?.value;

  const messageElement =
    ZUNE.element("#loginMessage") ||
    ZUNE.element("#adminLoginMessage");

  ZUNE.clearMessage(messageElement);

  if (!email || !password) {
    ZUNE.message(
      messageElement,
      "Weka email na password yako.",
      "error"
    );
    return;
  }

  try {
    zuneConnectSupabase();
    zuneSetLoginBusy(true);

    const { data, error } =
      await zuneSupabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    await zuneVerifyAdmin(data.session);

    zuneShowDashboard();
    zuneUpdateAdminIdentity();

    form.reset();

    zuneToast(
      "Umeingia kwenye ZUNE Premium Admin.",
      "success"
    );

    zuneOpenSection("overviewSection");
  } catch (error) {
    console.error("ZUNE admin login error:", error);

    zuneShowLogin();

    ZUNE.message(
      messageElement,
      zuneFriendlyError(error),
      "error"
    );
  } finally {
    zuneSetLoginBusy(false);
  }
}
async function zuneAdminLogout() {
  if (!zuneSupabase) {
    zuneShowLogin();
    return;
  }

  const confirmed = window.confirm(
    "Una uhakika unataka kutoka kwenye Admin Dashboard?"
  );

  if (!confirmed) return;

  try {
    const { error } =
      await zuneSupabase.auth.signOut();

    if (error) throw error;

    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin();

    zuneToast(
      "Umetoka kwenye akaunti ya Admin.",
      "success"
    );
  } catch (error) {
    console.error("ZUNE logout error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  }
}
const ZUNE_ADMIN_SECTIONS = {
  overviewSection: {
    title: "Muhtasari",
    subtitle: "Muhtasari wa shughuli za ZUNE Marketplace."
  },

  analyticsSection: {
    title: "Takwimu na Ripoti",
    subtitle: "Takwimu za biashara na mwenendo wa mauzo."
  },

  applicationsSection: {
    title: "Maombi ya Wauzaji",
    subtitle: "Kagua na simamia maombi ya wauzaji."
  },

  productsSection: {
    title: "Bidhaa",
    subtitle: "Simamia bidhaa zilizowekwa kwenye ZUNE."
  },

  ordersSection: {
    title: "Oda na Malipo",
    subtitle: "Fuatilia oda na hali zake."
  },

  usersSection: {
    title: "Watumiaji",
    subtitle: "Simamia akaunti za wateja na wauzaji."
  },

  announcementsSection: {
    title: "Matangazo ya Admin",
    subtitle: "Andika na uchapishe matangazo ya ZUNE."
  },

  notificationsSection: {
    title: "Notifications",
    subtitle: "Simamia arifa za mfumo."
  },

  verificationSection: {
    title: "Uhakiki wa Akaunti",
    subtitle: "Kagua hali ya uhakiki wa akaunti."
  },

  settingsSection: {
    title: "Mipangilio",
    subtitle: "Mipangilio ya akaunti ya Admin."
  }
};


function zuneOpenSection(sectionId) {
  if (!zuneAdminSession || !zuneAdminProfile) {
    zuneShowLogin(
      "Ingia kwa akaunti ya Admin ili kuendelea."
    );
    return;
  }

  const section = ZUNE_ADMIN_SECTIONS[sectionId];

  if (!section) {
    console.warn(
      "ZUNE: Sehemu haijatambuliwa:",
      sectionId
    );
    return;
  }

  zuneCurrentSection = sectionId;

  ZUNE.all(
    ".page-section, .admin-section, [data-page-section]"
  ).forEach(element => {
    const active = element.id === sectionId;

    element.hidden = !active;
    element.classList.toggle("active", active);
    element.setAttribute(
      "aria-hidden",
      active ? "false" : "true"
    );
  });

  ZUNE.all("[data-section]").forEach(button => {
    const active =
      button.dataset.section === sectionId;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  ZUNE.setText("#pageTitle", section.title);
  ZUNE.setText("#adminPageTitle", section.title);
  ZUNE.setText("#pageSubtitle", section.subtitle);
  ZUNE.setText("#adminPageSubtitle", section.subtitle);

  const sidebar = ZUNE.element("#adminSidebar");
  const backdrop = ZUNE.element("#sidebarBackdrop");

  sidebar?.classList.remove("open", "active");
  backdrop?.classList.remove("show", "active");

  if (backdrop) {
    backdrop.hidden = true;
  }

  zuneLoadCurrentSection().catch(error => {
    console.error(
      "ZUNE section loading error:",
      error
    );

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  });
}
function zuneBindAdminNavigation() {
  ZUNE.all("[data-section]").forEach(button => {
    if (button.dataset.zuneNavigationBound) return;

    button.dataset.zuneNavigationBound = "true";

    button.addEventListener("click", event => {
      event.preventDefault();

      zuneOpenSection(button.dataset.section);
    });
  });

  const menuButton = ZUNE.element("#adminMenuToggle");
  const sidebar = ZUNE.element("#adminSidebar");
  const backdrop = ZUNE.element("#sidebarBackdrop");

  menuButton?.addEventListener("click", () => {
    const isOpen =
      sidebar?.classList.contains("open");

    sidebar?.classList.toggle("open", !isOpen);
    sidebar?.classList.toggle("active", !isOpen);

    if (backdrop) {
      backdrop.hidden = Boolean(isOpen);
      backdrop.classList.toggle("show", !isOpen);
      backdrop.classList.toggle("active", !isOpen);
    }
  });

  backdrop?.addEventListener("click", () => {
    sidebar?.classList.remove("open", "active");
    backdrop.classList.remove("show", "active");
    backdrop.hidden = true;
  });

  [
    "#adminLogoutButton",
    "#settingsLogoutButton",
    "#logoutButton"
  ].forEach(selector => {
    const button = ZUNE.element(selector);

    if (!button || button.dataset.zuneLogoutBound) {
      return;
    }

    button.dataset.zuneLogoutBound = "true";

    button.addEventListener("click", event => {
      event.preventDefault();
      zuneAdminLogout();
    });
  });
}
async function zuneRestoreAdminSession() {
  try {
    const { data, error } =
      await zuneSupabase.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      zuneShowLogin();
      return;
    }

    await zuneVerifyAdmin(data.session);

    zuneShowDashboard();
    zuneUpdateAdminIdentity();

    zuneOpenSection("overviewSection");
  } catch (error) {
    console.error(
      "ZUNE session restore error:",
      error
    );

    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin(
      "Session haijathibitishwa. Tafadhali ingia tena."
    );
  }
}
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
  configure = null,
  limit = 100
) {
  let query = zuneSupabase
    .from(table)
    .select(columns)
    .limit(limit);

  if (typeof configure === "function") {
    query = configure(query);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}


function zuneSetStat(selector, value) {
  ZUNE.setText(selector, ZUNE.number(value));
}


function zuneSetMoneyStat(selector, value) {
  ZUNE.setText(selector, ZUNE.money(value));
}


function zuneSetLoading(selector, loading) {
  const element = ZUNE.element(selector);

  if (!element) return;

  element.classList.toggle("is-loading", loading);

  if (loading) {
    element.setAttribute("aria-busy", "true");
  } else {
    element.removeAttribute("aria-busy");
  }
}


function zuneRequireAdmin() {
  if (!zuneAdminSession || !zuneAdminProfile) {
    throw new Error(
      "Lazima uingie kwa akaunti ya Admin kwanza."
    );
  }
}
async function zuneLoadOverview() {
  zuneRequireAdmin();

  const selectors = [
    "#statTotalOrders",
    "#statTotalProducts",
    "#statTotalSellers",
    "#statTotalCustomers",
    "#pendingAppsCount",
    "#statPendingApplications",
    "#statTotalSales"
  ];

  selectors.forEach(selector => {
    zuneSetLoading(selector, true);
  });

  try {
    const [
      totalOrders,
      totalProducts,
      totalSellers,
      totalCustomers,
      pendingApplications,
      completedOrders
    ] = await Promise.all([
      zuneCountRows("orders"),

      zuneCountRows("products"),

      zuneCountRows("profiles", query =>
        query.eq("role", "vendor")
      ),

      zuneCountRows("profiles", query =>
        query.eq("role", "buyer")
      ),

      zuneCountRows("seller_applications", query =>
        query.eq("status", "pending")
      ),

      zuneFetchRows(
        "orders",
        "total_price,status",
        query => query.eq("status", "completed"),
        1000
      )
    ]);

    const totalSales = completedOrders.reduce(
      (sum, order) =>
        sum + (Number(order.total_price) || 0),
      0
    );

    zuneSetStat("#statTotalOrders", totalOrders);
    zuneSetStat("#statTotalProducts", totalProducts);
    zuneSetStat("#statTotalSellers", totalSellers);
    zuneSetStat("#statTotalCustomers", totalCustomers);

    zuneSetStat(
      "#pendingAppsCount",
      pendingApplications
    );

    zuneSetStat(
      "#statPendingApplications",
      pendingApplications
    );

    zuneSetMoneyStat(
      "#statTotalSales",
      totalSales
    );

    await Promise.allSettled([
      zuneLoadRecentOrders(),
      zuneLoadRecentApplications()
    ]);
  } catch (error) {
    console.error("Overview loading error:", error);

    zuneToast(
      "Imeshindwa kupakia baadhi ya takwimu: " +
        ZUNE.escape(error.message),
      "error"
    );
  } finally {
    selectors.forEach(selector => {
      zuneSetLoading(selector, false);
    });
  }
}
async function zuneLoadRecentOrders() {
  const body =
    ZUNE.element("#recentOrdersTable tbody") ||
    ZUNE.element("#recentOrdersBody");

  if (!body) return;

  const orders = await zuneFetchRows(
    "orders",
    "id,buyer_id,product_id,quantity,total_price,status,created_at",
    query => query.order("created_at", {
      ascending: false
    }),
    5
  );

  body.replaceChildren();

  if (!orders.length) {
    zuneRenderEmptyRow(
      body,
      6,
      "Hakuna oda zilizopatikana."
    );
    return;
  }

  orders.forEach(order => {
    const row = document.createElement("tr");

    [
      String(order.id).slice(0, 8),
      String(order.buyer_id || "—").slice(0, 8),
      String(order.product_id || "—").slice(0, 8),
      order.quantity ?? 0,
      ZUNE.money(order.total_price),
      zuneFormatStatus(order.status)
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
}
async function zuneLoadRecentApplications() {
  const body =
    ZUNE.element("#recentApplicationsTable tbody") ||
    ZUNE.element("#recentApplicationsBody");

  if (!body) return;

  const applications = await zuneFetchRows(
    "seller_applications",
    "id,store_name,owner_name,phone,status,created_at",
    query => query.order("created_at", {
      ascending: false
    }),
    5
  );

  body.replaceChildren();

  if (!applications.length) {
    zuneRenderEmptyRow(
      body,
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
      application.phone || "—",
      zuneFormatStatus(application.status),
      ZUNE.date(application.created_at)
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
}
 zuneLoadAnalytics() {
  zuneRequireAdmin();

  const orders = await zuneFetchRows(
    "orders",
    "id,total_price,status,created_at",
    query => query.order("created_at", {
      ascending: false
    }),
    1000
  );

  const completed = orders.filter(
    order => order.status === "completed"
  );

  const pending = orders.filter(
    order => order.status === "pending"
  );

  const cancelled = orders.filter(
    order => order.status === "cancelled"
  );

  const revenue = completed.reduce(
    (sum, order) =>
      sum + (Number(order.total_price) || 0),
    0
  );

  zuneSetStat("#analyticsTotalOrders", orders.length);

  zuneSetStat(
    "#analyticsCompletedOrders",
    completed.length
  );

  zuneSetStat(
    "#analyticsPendingOrders",
    pending.length
  );

  zuneSetStat(
    "#analyticsCancelledOrders",
    cancelled.length
  );

  zuneSetMoneyStat(
    "#analyticsTotalRevenue",
    revenue
  );

  zuneRenderSalesByMonth(completed);
}


function zuneRenderSalesByMonth(orders) {
  const container = ZUNE.element("#salesByMonth");

  if (!container) return;

  const totals = {};

  orders.forEach(order => {
    if (!order.created_at) return;

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) return;

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0")
    ].join("-");

    totals[key] =
      (totals[key] || 0) +
      (Number(order.total_price) || 0);
  });

  const months = Object.keys(totals).sort().slice(-12);

  container.replaceChildren();

  if (!months.length) {
    container.textContent = "Hakuna data ya mauzo bado.";
    return;
  }

  const maximum = Math.max(
    ...months.map(month => totals[month]),
    1
  );

  months.forEach(month => {
    const item = document.createElement("div");
    item.className = "sales-month-row";

    const label = document.createElement("span");
    label.textContent = month;

    const track = document.createElement("div");
    track.className = "sales-month-track";

    const bar = document.createElement("div");
    bar.className = "sales-month-bar";
    bar.style.width =
      `${(totals[month] / maximum) * 100}%`;

    track.appendChild(bar);

    const amount = document.createElement("span");
    amount.textContent = ZUNE.money(totals[month]);

    item.append(label, track, amount);
    container.appendChild(item);
  });
}
async function zuneLoadCurrentSection() {
  zuneRequireAdmin();

  switch (zuneCurrentSection) {
    case "overviewSection":
      return zuneLoadOverview();

    case "analyticsSection":
      return zuneLoadAnalytics();

    case "applicationsSection":
      return zuneLoadApplications();

    case "productsSection":
      return zuneLoadProducts();

    case "ordersSection":
      return zuneLoadOrders();

    case "usersSection":
      return zuneLoadUsers();

    case "announcementsSection":
      return zuneLoadAnnouncements();

    case "notificationsSection":
      return zuneLoadNotifications();

    case "verificationSection":
      return zuneLoadVerification();

    case "settingsSection":
      return zuneLoadSettings();

    default:
      console.warn(
        "ZUNE: Hakuna loader ya sehemu hii:",
        zuneCurrentSection
      );
  }
}
function zuneRenderEmptyRow(
  tbody,
  columnCount,
  message
) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = columnCount;
  cell.textContent = message;
  cell.className = "empty-table-message";

  row.appendChild(cell);
  tbody.appendChild(row);
}
function zuneFormatStatus(status) {
  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    published: "Imechapishwa",
    draft: "Rasimu",
    archived: "Imehifadhiwa"
  };

  return labels[String(status || "").toLowerCase()] ||
    status ||
    "Haijulikani";
}


function zuneBuildCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  return cell;
}


function zuneGetTableBody(selectors) {
  for (const selector of selectors) {
    const element = ZUNE.element(selector);
    if (element) return element;
  }

  return null;
}


function zuneBuildActionButton(label, action, id) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  button.className = "admin-action-button";

  return button;
}
async function zuneLoadApplications() {
  zuneRequireAdmin();

  const tbody = zuneGetTableBody([
    "#applicationsTable tbody",
    "#sellerApplicationsTable tbody",
    "#applicationsTableBody",
    "#sellerApplicationsBody"
  ]);

  if (!tbody) return;

  tbody.replaceChildren();

  try {
    const applications = await zuneFetchRows(
      "seller_applications",
      "*",
      query => query.order("created_at", {
        ascending: false
      }),
      500
    );

    if (!applications.length) {
      zuneRenderEmptyRow(
        tbody,
        6,
        "Hakuna maombi ya wauzaji."
      );
      return;
    }

    applications.forEach(application => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(application.store_name),
        zuneBuildCell(application.owner_name),
        zuneBuildCell(application.phone),
        zuneBuildCell(application.country),
        zuneBuildCell(
          zuneFormatStatus(application.status)
        ),
        zuneBuildCell(ZUNE.date(application.created_at))
      );

      const actions = document.createElement("td");

      if (application.status === "pending") {
        actions.append(
          zuneBuildActionButton(
            "Idhinisha",
            "approve-application",
            application.id
          ),
          zuneBuildActionButton(
            "Kataa",
            "reject-application",
            application.id
          )
        );
      } else {
        actions.textContent = "Hakuna hatua";
      }

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);

    zuneRenderEmptyRow(
      tbody,
      7,
      "Imeshindwa kupakia maombi."
    );
  }
}


async function zuneUpdateApplicationStatus(id, status) {
  zuneRequireAdmin();

  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Hali ya ombi si sahihi.");
  }

  const confirmed = window.confirm(
    status === "approved"
      ? "Unataka kuidhinisha ombi hili?"
      : "Unataka kukataa ombi hili?"
  );

  if (!confirmed) return;

  const { data, error } = await zuneSupabase
    .from("seller_applications")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error(
      "Ombi halijabadilishwa. Kagua ruhusa za Supabase na hali ya ombi."
    );
  }

  zuneToast("Hali ya ombi imebadilishwa.", "success");

  await Promise.allSettled([
    zuneLoadApplications(),
    zuneLoadOverview()
  ]);
}
async function zuneLoadProducts() {
  zuneRequireAdmin();

  const tbody = zuneGetTableBody([
    "#productsTable tbody",
    "#adminProductsTable tbody",
    "#productsTableBody"
  ]);

  if (!tbody) return;

  tbody.replaceChildren();

  try {
    const products = await zuneFetchRows(
      "products",
      "id,vendor_id,title,description,price,stock_quantity,created_at",
      query => query.order("created_at", {
        ascending: false
      }),
      500
    );

    if (!products.length) {
      zuneRenderEmptyRow(
        tbody,
        6,
        "Hakuna bidhaa zilizopatikana."
      );
      return;
    }

    products.forEach(product => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(product.title),
        zuneBuildCell(
          String(product.vendor_id || "—").slice(0, 8)
        ),
        zuneBuildCell(ZUNE.money(product.price)),
        zuneBuildCell(product.stock_quantity ?? 0),
        zuneBuildCell(ZUNE.date(product.created_at))
      );

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Angalia",
          "view-product",
          product.id
        )
      );

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);

    zuneRenderEmptyRow(
      tbody,
      6,
      "Imeshindwa kupakia bidhaa."
    );
  }
}


async function zuneViewProduct(id) {
  const { data, error } = await zuneSupabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    zuneToast("Bidhaa haijapatikana.", "error");
    return;
  }

  const details = [
    `Bidhaa: ${data.title || "—"}`,
    `Bei: ${ZUNE.money(data.price)}`,
    `Stock: ${data.stock_quantity ?? 0}`,
    `Maelezo: ${data.description || "Hakuna maelezo"}`
  ].join("\n");

  window.alert(details);
}

async function zuneLoadOrders() {
  zuneRequireAdmin();

  const tbody = zuneGetTableBody([
    "#ordersTable tbody",
    "#adminOrdersTable tbody",
    "#ordersTableBody"
  ]);

  if (!tbody) return;

  tbody.replaceChildren();

  try {
    const orders = await zuneFetchRows(
      "orders",
      "id,buyer_id,product_id,quantity,total_price,commission_fee,status,created_at",
      query => query.order("created_at", {
        ascending: false
      }),
      500
    );

    if (!orders.length) {
      zuneRenderEmptyRow(
        tbody,
        7,
        "Hakuna oda zilizopatikana."
      );
      return;
    }

    orders.forEach(order => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(String(order.id).slice(0, 8)),
        zuneBuildCell(String(order.buyer_id || "—").slice(0, 8)),
        zuneBuildCell(String(order.product_id || "—").slice(0, 8)),
        zuneBuildCell(order.quantity ?? 0),
        zuneBuildCell(ZUNE.money(order.total_price)),
        zuneBuildCell(zuneFormatStatus(order.status))
      );

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Angalia",
          "view-order",
          order.id
        )
      );

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);

    zuneRenderEmptyRow(
      tbody,
      7,
      "Imeshindwa kupakia oda."
    );
  }
}


async function zuneViewOrder(id) {
  const { data, error } = await zuneSupabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    zuneToast("Oda haijapatikana.", "error");
    return;
  }

  window.alert([
    `Oda: ${data.id}`,
    `Mteja: ${data.buyer_id || "—"}`,
    `Bidhaa ID: ${data.product_id || "—"}`,
    `Idadi: ${data.quantity ?? 0}`,
    `Jumla: ${ZUNE.money(data.total_price)}`,
    `Kamisheni: ${ZUNE.money(data.commission_fee)}`,
    `Hali: ${zuneFormatStatus(data.status)}`
  ].join("\n"));
}
async function zuneLoadUsers() {
  zuneRequireAdmin();

  const tbody = zuneGetTableBody([
    "#usersTable tbody",
    "#adminUsersTable tbody",
    "#usersTableBody"
  ]);

  if (!tbody) return;

  tbody.replaceChildren();

  try {
    const users = await zuneFetchRows(
      "profiles",
      "id,full_name,phone_number,role,is_verified,created_at",
      query => query.order("created_at", {
        ascending: false
      }),
      500
    );

    if (!users.length) {
      zuneRenderEmptyRow(
        tbody,
        6,
        "Hakuna watumiaji waliopatikana."
      );
      return;
    }

    users.forEach(user => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(user.full_name || "—"),
        zuneBuildCell(user.phone_number || "—"),
        zuneBuildCell(user.role || "—"),
        zuneBuildCell(
          user.is_verified ? "Imethibitishwa" : "Haijathibitishwa"
        ),
        zuneBuildCell(ZUNE.date(user.created_at)),
        zuneBuildCell(String(user.id).slice(0, 8))
      );

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);

    zuneRenderEmptyRow(
      tbody,
      6,
      "Imeshindwa kupakia watumiaji."
    );
  }
}
document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

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
        break;
    }
  } catch (error) {
    console.error("ZUNE action error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  } finally {
    button.disabled = false;
  }
});
const ZUNE_ANNOUNCEMENTS_TABLE = "admin_announcements";
function zuneAnnouncementForm() {
  return (
    ZUNE.element("#announcementForm") ||
    ZUNE.element("#adminAnnouncementForm") ||
    ZUNE.element("#createAnnouncementForm")
  );
}


function zuneAnnouncementField(form, names) {
  for (const name of names) {
    const field =
      form.querySelector(`[name="${name}"]`) ||
      form.querySelector(`#${name}`);

    if (field) return field;
  }

  return null;
}


function zuneAnnouncementValue(form, names) {
  const field = zuneAnnouncementField(form, names);

  return field?.value?.trim() || "";
}


function zuneAnnouncementStatusLabel(status) {
  const labels = {
    draft: "Rasimu",
    published: "Imechapishwa",
    archived: "Imehifadhiwa"
  };

  return labels[status] || status || "—";
}
async function zuneLoadAnnouncements() {
  zuneRequireAdmin();

  const container =
    ZUNE.element("#announcementHistory") ||
    ZUNE.element("#announcementsList") ||
    ZUNE.element("#adminAnnouncementsList");

  if (!container) {
    console.warn(
      "ZUNE: Announcement history container haipo kwenye admin.html."
    );
    return;
  }

  container.replaceChildren();

  try {
    const announcements = await zuneFetchRows(
      ZUNE_ANNOUNCEMENTS_TABLE,
      "id,title,message,audience,display_type,priority,status,created_at,expires_at",
      query => query.order("created_at", {
        ascending: false
      }),
      200
    );

    if (!announcements.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Bado hakuna matangazo.";
      container.appendChild(empty);
      return;
    }

    announcements.forEach(announcement => {
      const card = document.createElement("article");
      card.className = "announcement-card";

      const heading = document.createElement("h3");
      heading.textContent = announcement.title;

      const message = document.createElement("p");
      message.textContent = announcement.message;

      const metadata = document.createElement("p");
      metadata.className = "announcement-metadata";
      metadata.textContent = [
        `Walengwa: ${announcement.audience}`,
        `Aina: ${announcement.display_type}`,
        `Kipaumbele: ${announcement.priority}`,
        `Hali: ${zuneAnnouncementStatusLabel(announcement.status)}`,
        `Tarehe: ${ZUNE.date(announcement.created_at)}`,
        announcement.expires_at
          ? `Mwisho: ${ZUNE.date(announcement.expires_at)}`
          : "Hakuna tarehe ya mwisho"
      ].join(" • ");

      card.append(heading, message, metadata);

      const actions = document.createElement("div");
      actions.className = "announcement-actions";

      if (announcement.status !== "archived") {
        const archiveButton = document.createElement("button");
        archiveButton.type = "button";
        archiveButton.textContent = "Hifadhi";
        archiveButton.dataset.announcementAction = "archive";
        archiveButton.dataset.id = announcement.id;

        actions.appendChild(archiveButton);
      }

      card.appendChild(actions);
      container.appendChild(card);
    });
  } catch (error) {
    console.error("ZUNE load announcements error:", error);

    const notice = document.createElement("p");
    notice.className = "error-message";
    notice.textContent =
      "Imeshindwa kupakia matangazo. Kagua ruhusa za Supabase.";

    container.appendChild(notice);
  }
}
async function zuneCreateAnnouncement(event) {
  event.preventDefault();

  zuneRequireAdmin();

  const form = event.currentTarget;

  const title = zuneAnnouncementValue(form, [
    "title",
    "announcementTitle"
  ]);

  const message = zuneAnnouncementValue(form, [
    "message",
    "announcementMessage"
  ]);

  const audience = zuneAnnouncementValue(form, [
    "audience",
    "announcementAudience"
  ]) || "all";

  const displayType = zuneAnnouncementValue(form, [
    "display_type",
    "displayType",
    "announcementType"
  ]) || "both";

  const priority = zuneAnnouncementValue(form, [
    "priority",
    "announcementPriority"
  ]) || "normal";

  const expiresAt = zuneAnnouncementValue(form, [
    "expires_at",
    "expiresAt"
  ]);

  const status = zuneAnnouncementValue(form, [
    "status",
    "announcementStatus"
  ]) || "published";

  if (!title || !message) {
    zuneToast(
      "Jaza kichwa na ujumbe wa tangazo.",
      "error"
    );
    return;
  }

  const allowedAudiences = [
    "all",
    "buyers",
    "vendors"
  ];

  const allowedDisplayTypes = [
    "notification",
    "slide",
    "both"
  ];

  const allowedPriorities = [
    "low",
    "normal",
    "high",
    "urgent"
  ];

  const allowedStatuses = [
    "draft",
    "published",
    "archived"
  ];

  if (!allowedAudiences.includes(audience)) {
    zuneToast("Chaguo la walengwa si sahihi.", "error");
    return;
  }

  if (!allowedDisplayTypes.includes(displayType)) {
    zuneToast("Aina ya tangazo si sahihi.", "error");
    return;
  }

  if (!allowedPriorities.includes(priority)) {
    zuneToast("Kipaumbele si sahihi.", "error");
    return;
  }

  if (!allowedStatuses.includes(status)) {
    zuneToast("Hali ya tangazo si sahihi.", "error");
    return;
  }

  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    zuneToast("Tarehe ya mwisho si sahihi.", "error");
    return;
  }

  const submitButton = form.querySelector(
    'button[type="submit"], input[type="submit"]'
  );

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const announcement = {
      title,
      message,
      audience,
      display_type: displayType,
      priority,
      status,
      created_by: zuneAdminSession.user.id,
      expires_at: expiresAt
        ? new Date(expiresAt).toISOString()
        : null
    };

    const { error } = await zuneSupabase
      .from(ZUNE_ANNOUNCEMENTS_TABLE)
      .insert(announcement);

    if (error) throw error;

    form.reset();

    zuneToast(
      status === "published"
        ? "Tangazo limehifadhiwa na kuchapishwa."
        : "Tangazo limehifadhiwa.",
      "success"
    );

    zuneUpdateAnnouncementPreview();
    await zuneLoadAnnouncements();
  } catch (error) {
    console.error("ZUNE create announcement error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}
async function zuneArchiveAnnouncement(id) {
  zuneRequireAdmin();

  const confirmed = window.confirm(
    "Unataka kuhifadhi tangazo hili na kuliondoa kwenye matangazo yanayoonekana?"
  );

  if (!confirmed) return;

  const { data, error } = await zuneSupabase
    .from(ZUNE_ANNOUNCEMENTS_TABLE)
    .update({
      status: "archived",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error(
      "Tangazo halikubadilishwa. Kagua ruhusa za Admin."
    );
  }

  zuneToast("Tangazo limehifadhiwa.", "success");
  await zuneLoadAnnouncements();
}
function zuneUpdateAnnouncementPreview() {
  const form = zuneAnnouncementForm();

  if (!form) return;

  const title = zuneAnnouncementValue(form, [
    "title",
    "announcementTitle"
  ]);

  const message = zuneAnnouncementValue(form, [
    "message",
    "announcementMessage"
  ]);

  const preview =
    ZUNE.element("#announcementPreview") ||
    ZUNE.element("#adminAnnouncementPreview");

  if (!preview) return;

  preview.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = title || "Kichwa cha tangazo";

  const body = document.createElement("p");
  body.textContent = message || "Ujumbe wa tangazo utaonekana hapa.";

  preview.append(heading, body);
}
function zuneBindAnnouncementForm() {
  const form = zuneAnnouncementForm();

  if (!form || form.dataset.zuneAnnouncementBound) {
    return;
  }

  form.dataset.zuneAnnouncementBound = "true";

  form.addEventListener(
    "submit",
    zuneCreateAnnouncement
  );

  form.addEventListener(
    "input",
    zuneUpdateAnnouncementPreview
  );

  form.addEventListener(
    "change",
    zuneUpdateAnnouncementPreview
  );
}
document.addEventListener("click", async event => {
  const button = event.target.closest(
    "[data-announcement-action]"
  );

  if (!button) return;

  const action = button.dataset.announcementAction;
  const id = button.dataset.id;

  if (!action || !id) return;

  try {
    button.disabled = true;

    if (action === "archive") {
      await zuneArchiveAnnouncement(id);
    }
  } catch (error) {
    console.error("Announcement action error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  } finally {
    button.disabled = false;
  }
});
async function zuneLoadNotifications() {
  zuneRequireAdmin();

  const container =
    ZUNE.element("#notificationsList") ||
    ZUNE.element("#adminNotificationsList") ||
    ZUNE.element("#notificationsTable tbody");

  if (!container) return;

  container.replaceChildren();
  try {
    const announcements = await zuneFetchRows(
      "admin_announcements",
      "id,title,message,audience,display_type,priority,status,created_at,expires_at",
      query => query
        .eq("status", "published")
        .order("created_at", {
          ascending: false
        }),
      200
    );

    if (!announcements.length) {
      const empty = document.createElement("p");
      empty.textContent = "Hakuna arifa zilizochapishwa.";
      empty.className = "empty-state";
      container.appendChild(empty);
      return;
    }

    announcements.forEach(item => {
      const card = document.createElement("article");
      card.className = "notification-admin-card";

      const title = document.createElement("h3");
      title.textContent = item.title;

      const message = document.createElement("p");
      message.textContent = item.message;

      const details = document.createElement("p");
      details.textContent =
        `Walengwa: ${item.audience} • ` +
        `Aina: ${item.display_type} • ` +
        `Kipaumbele: ${item.priority}`;

      const date = document.createElement("small");
      date.textContent = ZUNE.date(item.created_at);

      card.append(title, message, details, date);
      container.appendChild(card);
    });
  } catch (error) {
    console.error("ZUNE notifications error:", error);

    const notice = document.createElement("p");
    notice.className = "error-message";
    notice.textContent =
      "Imeshindwa kusoma arifa kutoka Supabase.";

    container.appendChild(notice);
  }
}
async function zuneLoadVerification() {
  zuneRequireAdmin();

  const tbody =
    ZUNE.element("#verificationTable tbody") ||
    ZUNE.element("#verificationRequestsTable tbody") ||
    ZUNE.element("#verificationTableBody");

  if (!tbody) return;

  tbody.replaceChildren();

  try {
    const profiles = await zuneFetchRows(
      "profiles",
      "id,full_name,phone_number,role,is_verified,created_at",
      query => query.order("created_at", {
        ascending: false
      }),
      500
    );

    if (!profiles.length) {
      zuneRenderEmptyRow(
        tbody,
        5,
        "Hakuna akaunti zilizopatikana."
      );
      return;
    }

    profiles.forEach(profile => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(profile.full_name || "—"),
        zuneBuildCell(profile.phone_number || "—"),
        zuneBuildCell(profile.role || "—"),
        zuneBuildCell(
          profile.is_verified
            ? "Imethibitishwa"
            : "Haijathibitishwa"
        ),
        zuneBuildCell(ZUNE.date(profile.created_at))
      );

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE verification error:", error);

    zuneRenderEmptyRow(
      tbody,
      5,
      "Imeshindwa kupakia akaunti."
    );
  }
}
async function zuneLoadSettings() {
  zuneRequireAdmin();

  zuneUpdateAdminIdentity();

  ZUNE.setText(
    "#settingsAdminName",
    zuneAdminProfile?.full_name || "ZUNE Admin"
  );

  ZUNE.setText(
    "#settingsAdminEmail",
    zuneAdminSession?.user?.email || "—"
  );

  ZUNE.setText(
    "#settingsAdminRole",
    zuneAdminProfile?.role || "admin"
  );

  ZUNE.setText(
    "#settingsSessionStatus",
    "Imeunganishwa"
  );

  const avatar =
    ZUNE.element("#sidebarAdminAvatar") ||
    ZUNE.element("#settingsAdminAvatar");

  if (avatar) {
    const name =
      zuneAdminProfile?.full_name ||
      zuneAdminSession?.user?.email ||
      "A";

    avatar.textContent = name
      .trim()
      .charAt(0)
      .toUpperCase();
  }
}

async function zuneUpdateAdminName(event) {
  event.preventDefault();

  zuneRequireAdmin();

  const form = event.currentTarget;

  const nameField =
    form.querySelector('[name="full_name"]') ||
    form.querySelector('[name="fullName"]') ||
    form.querySelector("#settingsFullName");

  const fullName = nameField?.value?.trim();

  if (!fullName) {
    zuneToast("Weka jina lako.", "error");
    return;
  }

  try {
    const { data, error } = await zuneSupabase
      .from("profiles")
      .update({
        full_name: fullName
      })
      .eq("id", zuneAdminSession.user.id)
      .select(
        "id,full_name,phone_number,role,is_verified,created_at"
      )
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "Jina halikubadilishwa. Kagua ruhusa za Supabase."
      );
    }

    zuneAdminProfile = data;
    zuneUpdateAdminIdentity();

    zuneToast("Jina limebadilishwa.", "success");
  } catch (error) {
    console.error("ZUNE profile update error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  }
}
async function zuneSendPasswordReset(event) {
  event.preventDefault();

  zuneRequireAdmin();

  const email = zuneAdminSession?.user?.email;

  if (!email) {
    zuneToast(
      "Email ya akaunti haijapatikana.",
      "error"
    );
    return;
  }

  try {
    const { error } =
      await zuneSupabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: window.location.origin +
            window.location.pathname
        }
      );

    if (error) throw error;

    zuneToast(
      "Maelekezo ya kubadilisha password yametumwa kwenye email yako.",
      "success"
    );
  } catch (error) {
    console.error("ZUNE password reset error:", error);

    zuneToast(
      zuneFriendlyError(error),
      "error"
    );
  }
}


function zuneBindSettingsForms() {
  const profileForm =
    ZUNE.element("#adminProfileForm") ||
    ZUNE.element("#settingsProfileForm");

  if (
    profileForm &&
    !profileForm.dataset.zuneProfileBound
  ) {
    profileForm.dataset.zuneProfileBound = "true";

    profileForm.addEventListener(
      "submit",
      zuneUpdateAdminName
    );
  }

  const passwordForm =
    ZUNE.element("#adminPasswordResetForm") ||
    ZUNE.element("#settingsPasswordForm");

  if (
    passwordForm &&
    !passwordForm.dataset.zunePasswordBound
  ) {
    passwordForm.dataset.zunePasswordBound = "true";

    passwordForm.addEventListener(
      "submit",
      zuneSendPasswordReset
    );
  }
}
function zuneBindAdminForms() {
  zuneBindAnnouncementForm();
  zuneBindSettingsForms();
}


function zuneBindLoginForm() {
  const loginForm =
    ZUNE.element("#adminLoginForm") ||
    ZUNE.element("#loginForm");

  if (
    !loginForm ||
    loginForm.dataset.zuneLoginBound
  ) {
    return;
  }

  loginForm.dataset.zuneLoginBound = "true";

  loginForm.addEventListener(
    "submit",
    zuneAdminLogin
  );
}

function zuneBindLogoutButtons() {
  const logoutButtons = ZUNE.all(
    "#adminLogoutBtn, #logoutBtn, [data-admin-logout]"
  );

  logoutButtons.forEach(button => {
    if (button.dataset.zuneLogoutBound) return;

    button.dataset.zuneLogoutBound = "true";

    button.addEventListener("click", async event => {
      event.preventDefault();
      await zuneAdminLogout();
    });
  });
}
function zuneBindRefreshButtons() {
  const refreshButtons = ZUNE.all(
    "#adminRefreshBtn, #refreshDashboardBtn, [data-admin-refresh]"
  );

  refreshButtons.forEach(button => {
    if (button.dataset.zuneRefreshBound) return;

    button.dataset.zuneRefreshBound = "true";

    button.addEventListener("click", async event => {
      event.preventDefault();

      if (!zuneAdminSession || !zuneAdminProfile) {
        zuneToast(
          "Ingia kama Admin kwanza.",
          "error"
        );
        return;
      }

      try {
        button.disabled = true;
        await zuneLoadCurrentSection();

        zuneToast(
          "Taarifa zimefanyiwa refresh.",
          "success"
        );
      } catch (error) {
        console.error("ZUNE refresh error:", error);

        zuneToast(
          zuneFriendlyError(error),
          "error"
        );
      } finally {
        button.disabled = false;
      }
    });
  });
}
function zuneBindAuthState() {
  if (
    !zuneSupabase ||
    zuneSupabase.__zuneAuthListenerBound
  ) {
    return;
  }

  zuneSupabase.__zuneAuthListenerBound = true;

  zuneSupabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        zuneAdminSession = null;
        zuneAdminProfile = null;

        zuneShowLogin();
        return;
      }

   
    }
  );
}
async function zuneInitializeAdmin() {
  if (zuneAdminInitialized) return;

  zuneAdminInitialized = true;

  try {
    zuneConnectSupabase();

    if (!zuneSupabase) {
      throw new Error(
        "Supabase haijaunganishwa. Hakikisha Supabase JS CDN imewekwa kwenye admin.html."
      );
    }

    zuneBindAdminNavigation();
    zuneBindAdminForms();
    zuneBindLoginForm();
    zuneBindLogoutButtons();
    zuneBindRefreshButtons();
    zuneBindAuthState();

    await zuneRestoreAdminSession();

  } catch (error) {
    console.error("ZUNE initialization error:", error);

    zuneAdminInitialized = false;

    zuneShowLogin(
      zuneFriendlyError(error)
    );
  }
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    zuneInitializeAdmin,
    { once: true }
  );
} else {
  zuneInitializeAdmin();
}
