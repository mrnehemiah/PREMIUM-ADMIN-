
"use strict";

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

const ZUNE_SECTIONS = {
  overviewSection: {
    title: "Muhtasari",
    subtitle: "Muhtasari wa shughuli za ZUNE Marketplace."
  },
  analyticsSection: {
    title: "Takwimu",
    subtitle: "Takwimu za mauzo na shughuli za marketplace."
  },
  applicationsSection: {
    title: "Maombi ya Wauzaji",
    subtitle: "Simamia maombi ya kujiunga kama muuzaji."
  },
  productsSection: {
    title: "Bidhaa",
    subtitle: "Kagua bidhaa zilizowekwa kwenye ZUNE."
  },
  ordersSection: {
    title: "Oda na Malipo",
    subtitle: "Kagua oda na taarifa zake."
  },
  usersSection: {
    title: "Watumiaji",
    subtitle: "Simamia taarifa za akaunti za ZUNE."
  },
  announcementsSection: {
    title: "Matangazo",
    subtitle: "Tengeneza na simamia matangazo ya admin."
  },
  notificationsSection: {
    title: "Notifications",
    subtitle: "Kagua arifa za mfumo."
  },
  verificationSection: {
    title: "Uhakiki",
    subtitle: "Kagua hali ya verification ya watumiaji."
  },
  settingsSection: {
    title: "Mipangilio",
    subtitle: "Mipangilio ya akaunti ya admin."
  }
};

const zuneMoneyFormatter = new Intl.NumberFormat("sw-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0
});

const zuneNumberFormatter = new Intl.NumberFormat("sw-TZ");

function zuneEl(selector, parent = document) {
  return parent.querySelector(selector);
}

function zuneAll(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

function zuneMoney(value) {
  return zuneMoneyFormatter.format(Number(value) || 0);
}

function zuneNumber(value) {
  return zuneNumberFormatter.format(Number(value) || 0);
}

function zuneDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("sw-TZ", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function zuneEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function zuneSetText(selector, value) {
  const element = zuneEl(selector);

  if (element) {
    element.textContent = value ?? "";
  }
}

function zuneMessage(selector, message, type = "info") {
  const element = zuneEl(selector);

  if (!element) return;

  element.textContent = message;
  element.hidden = false;
  element.classList.remove(
    "success",
    "error",
    "warning",
    "info"
  );
  element.classList.add(type);
}

function zuneClearMessage(...selectors) {
  selectors.forEach(selector => {
    const element = zuneEl(selector);

    if (element) {
      element.textContent = "";
      element.hidden = true;
      element.classList.remove(
        "success",
        "error",
        "warning",
        "info"
      );
    }
  });
}

function zuneToast(message, type = "info") {
  let toast = zuneEl("#adminToast");

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

  window.clearTimeout(toast._zuneTimeout);

  toast._zuneTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function zuneErrorMessage(error) {
  const message = String(
    error?.message || error || "Hitilafu isiyojulikana."
  );

  if (/invalid login credentials/i.test(message)) {
    return "Email au password si sahihi.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Thibitisha email yako kabla ya kuingia.";
  }

  if (/failed to fetch|network/i.test(message)) {
    return "Imeshindikana kuwasiliana na Supabase. Kagua internet.";
  }

  if (/row-level security|permission denied/i.test(message)) {
    return "Huna ruhusa ya kufanya kitendo hiki. Kagua RLS policies.";
  }

  return message;
}

function zuneShowElement(element, visible) {
  if (!element) return;

  element.hidden = !visible;
  element.classList.toggle("hidden", !visible);
  element.style.display = visible ? "" : "none";
}

function zuneShowLogin() {
  zuneShowElement(zuneEl("#adminLoginScreen"), true);
  zuneShowElement(zuneEl("#adminDashboard"), false);
}

function zuneShowDashboard() {
  zuneShowElement(zuneEl("#adminLoginScreen"), false);
  zuneShowElement(zuneEl("#adminDashboard"), true);
}

function zuneSetBusy(busy) {
  zuneAdminBusy = Boolean(busy);

  zuneAll(
    "#adminLoginForm button, #adminLoginForm input"
  ).forEach(element => {
    element.disabled = zuneAdminBusy;
  });

  const loginButton = zuneEl(
    "#adminLoginForm button[type='submit']"
  );

  if (loginButton) {
    if (!loginButton.dataset.originalText) {
      loginButton.dataset.originalText =
        loginButton.textContent.trim();
    }

    loginButton.textContent = zuneAdminBusy
      ? "Inakagua..."
      : loginButton.dataset.originalText;
  }
}

function zuneConnectSupabase() {
  if (zuneSupabase) return zuneSupabase;

  if (!window.supabase?.createClient) {
    throw new Error(
      "Maktaba ya Supabase haijapakiwa. Kagua script ya Supabase kwenye admin.html."
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

async function zuneVerifyAdmin(session) {
  if (!session?.user?.id) {
    throw new Error("Session ya mtumiaji haipo.");
  }

  const { data: profile, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, phone_number, role, is_verified, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!profile) {
    throw new Error(
      "Profile haijapatikana kwenye jedwali la profiles."
    );
  }

  if (profile.role !== "admin") {
    throw new Error(
      "Akaunti hii haina ruhusa ya admin."
    );
  }

  zuneAdminSession = session;
  zuneAdminProfile = profile;

  return profile;
}

function zuneUpdateAdminIdentity() {
  const profile = zuneAdminProfile;
  const session = zuneAdminSession;

  if (!profile || !session) return;

  const name =
    profile.full_name ||
    session.user.email ||
    "ZUNE Admin";

  const email = session.user.email || "—";
  const initial = String(name).trim().charAt(0).toUpperCase() || "A";

  zuneSetText("#sidebarAdminName", name);
  zuneSetText("#settingsAdminName", name);
  zuneSetText("#settingsAdminEmail", email);
  zuneSetText("#settingsAdminRole", "Administrator");
  zuneSetText("#settingsSessionStatus", "Imeunganishwa");

  zuneSetText("#sidebarAdminAvatar", initial);
  zuneSetText("#settingsAdminAvatar", initial);
}

async function zuneAdminLogin(event) {
  event.preventDefault();

  if (zuneAdminBusy) return;

  const form = event.currentTarget;

  const emailInput = zuneEl(
    "[name='email'], #adminEmail",
    form
  );

  const passwordInput = zuneEl(
    "[name='password'], #adminPassword",
    form
  );

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  zuneClearMessage("#loginMessage", "#adminGlobalMessage");

  if (!email || !password) {
    zuneMessage(
      "#loginMessage",
      "Ingiza email na password.",
      "error"
    );
    return;
  }

  zuneSetBusy(true);

  try {
    zuneConnectSupabase();

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

    zuneToast("Umeingia kwenye ZUNE Admin.", "success");
  } catch (error) {
    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin();

    zuneMessage(
      "#loginMessage",
      zuneErrorMessage(error),
      "error"
    );
  } finally {
    zuneSetBusy(false);
  }
}

async function zuneAdminLogout() {
  if (!zuneSupabase) {
    zuneShowLogin();
    return;
  }

  const confirmed = window.confirm(
    "Unataka kutoka kwenye ZUNE Admin?"
  );

  if (!confirmed) return;

  try {
    const { error } = await zuneSupabase.auth.signOut();

    if (error) throw error;

    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin();

    zuneToast("Umetoka kwenye akaunti.", "success");
  } catch (error) {
    zuneToast(zuneErrorMessage(error), "error");
  }
}

async function zuneCountRows(table, configure) {
  let request = zuneSupabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (typeof configure === "function") {
    request = configure(request);
  }

  const { count, error } = await request;

  if (error) throw error;

  return count || 0;
}

async function zuneFetchRows(
  table,
  columns = "*",
  configure,
  limit = 100
) {
  let request = zuneSupabase
    .from(table)
    .select(columns);

  if (typeof configure === "function") {
    request = configure(request);
  }

  if (limit) {
    request = request.limit(limit);
  }

  const { data, error } = await request;

  if (error) throw error;

  return data || [];
}

async function zuneSafeCount(table, configure) {
  try {
    return await zuneCountRows(table, configure);
  } catch (error) {
    console.error(`ZUNE count error (${table}):`, error);
    return null;
  }
}

function zuneSetStat(selector, value) {
  const element = zuneEl(selector);

  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? "—"
      : zuneNumber(value);
}

function zuneSetMoneyStat(selector, value) {
  const element = zuneEl(selector);

  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? "—"
      : zuneMoney(value);
}

function zuneSetLoading(selector, loading, message = "Inapakia...") {
  const element = zuneEl(selector);

  if (!element) return;

  if (loading) {
    element.dataset.previousText = element.textContent;
    element.textContent = message;
    element.setAttribute("aria-busy", "true");
  } else {
    if (element.dataset.previousText !== undefined) {
      element.textContent = element.dataset.previousText;
      delete element.dataset.previousText;
    }

    element.removeAttribute("aria-busy");
  }
}

function zuneRequireAdmin() {
  if (!zuneSupabase || !zuneAdminSession || !zuneAdminProfile) {
    throw new Error(
      "Ingia kwa akaunti ya admin kabla ya kuendelea."
    );
  }

  if (zuneAdminProfile.role !== "admin") {
    throw new Error("Ruhusa ya admin inahitajika.");
  }

  return true;
}

function zuneRenderEmptyRow(tbody, colspan, message) {
  if (!tbody) return;

  tbody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = colspan;
  cell.textContent = message;
  cell.className = "empty-state";

  row.appendChild(cell);
  tbody.appendChild(row);
}

async function zuneLoadOverview() {
  try {
    zuneRequireAdmin();

    const [
      ordersCount,
      productsCount,
      sellersCount,
      customersCount,
      pendingApplications
    ] = await Promise.all([
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

    zuneSetStat("#statTotalOrders", ordersCount);
    zuneSetStat("#statTotalProducts", productsCount);
    zuneSetStat("#statTotalSellers", sellersCount);
    zuneSetStat("#statTotalCustomers", customersCount);
    zuneSetStat("#pendingAppsCount", pendingApplications);
    zuneSetStat("#statPendingApplications", pendingApplications);

    let totalSales = null;

    try {
      const completedOrders = await zuneFetchRows(
        "orders",
        "total_price",
        query => query.eq("status", "completed"),
        10000
      );

      totalSales = completedOrders.reduce(
        (sum, order) => sum + (Number(order.total_price) || 0),
        0
      );
    } catch (error) {
      console.error("ZUNE sales query error:", error);
    }

    zuneSetMoneyStat("#statTotalSales", totalSales);

    await Promise.allSettled([
      zuneLoadRecentOrders(),
      zuneLoadRecentApplications()
    ]);
  } catch (error) {
    console.error("ZUNE overview error:", error);

    zuneMessage(
      "#adminGlobalMessage",
      zuneErrorMessage(error),
      "error"
    );
  }
}

async function zuneLoadRecentOrders() {
  const tbody =
    zuneEl("#recentOrdersTableBody") ||
    zuneEl("#recentOrdersBody");

  if (!tbody) return;

  try {
    const orders = await zuneFetchRows(
      "orders",
      "id, buyer_id, product_id, quantity, total_price, status, created_at",
      query => query.order("created_at", { ascending: false }),
      5
    );

    if (!orders.length) {
      zuneRenderEmptyRow(tbody, 6, "Hakuna oda zilizopatikana.");
      return;
    }

    tbody.replaceChildren();

    orders.forEach(order => {
      const row = document.createElement("tr");

      [
        String(order.id).slice(0, 8),
        String(order.product_id || "—").slice(0, 8),
        zuneNumber(order.quantity),
        zuneMoney(order.total_price),
        zuneFormatStatus(order.status),
        zuneDate(order.created_at)
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE recent orders error:", error);
    zuneRenderEmptyRow(tbody, 6, zuneErrorMessage(error));
  }
}

async function zuneLoadRecentApplications() {
  const tbody =
    zuneEl("#recentApplicationsTableBody") ||
    zuneEl("#recentApplicationsBody");

  if (!tbody) return;

  try {
    const applications = await zuneFetchRows(
      "seller_applications",
      "id, store_name, owner_name, phone, country, status, created_at",
      query => query.order("created_at", { ascending: false }),
      5
    );

    if (!applications.length) {
      zuneRenderEmptyRow(
        tbody,
        5,
        "Hakuna maombi ya wauzaji yaliyopatikana."
      );
      return;
    }

    tbody.replaceChildren();

    applications.forEach(application => {
      const row = document.createElement("tr");

      [
        application.store_name || "—",
        application.owner_name || "—",
        application.phone || "—",
        zuneFormatStatus(application.status),
        zuneDate(application.created_at)
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE recent applications error:", error);
    zuneRenderEmptyRow(tbody, 5, zuneErrorMessage(error));
  }
}

async function zuneLoadAnalytics() {
  try {
    zuneRequireAdmin();

    const orders = await zuneFetchRows(
      "orders",
      "id, total_price, status, created_at",
      query => query.order("created_at", { ascending: true }),
      10000
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
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    zuneSetStat("#analyticsTotalOrders", orders.length);
    zuneSetStat("#analyticsCompletedOrders", completed.length);
    zuneSetStat("#analyticsPendingOrders", pending.length);
    zuneSetStat("#analyticsCancelledOrders", cancelled.length);
    zuneSetMoneyStat("#analyticsTotalRevenue", revenue);

    zuneRenderSalesByMonth(orders);
  } catch (error) {
    console.error("ZUNE analytics error:", error);

    zuneMessage(
      "#adminGlobalMessage",
      zuneErrorMessage(error),
      "error"
    );
  }
}

function zuneRenderSalesByMonth(orders) {
  const container = zuneEl("#salesByMonth");

  if (!container) return;

  const monthlySales = new Map();

  orders
    .filter(order => order.status === "completed")
    .forEach(order => {
      const date = new Date(order.created_at);

      if (Number.isNaN(date.getTime())) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0")
      ].join("-");

      monthlySales.set(
        key,
        (monthlySales.get(key) || 0) +
          (Number(order.total_price) || 0)
      );
    });

  const entries = Array.from(monthlySales.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12);

  container.replaceChildren();

  if (!entries.length) {
    container.textContent = "Bado hakuna takwimu za mauzo.";
    return;
  }

  const maxValue = Math.max(
    ...entries.map(entry => entry[1]),
    1
  );

  entries.forEach(([month, value]) => {
    const item = document.createElement("div");
    item.className = "sales-month-item";

    const label = document.createElement("span");
    label.textContent = month;

    const track = document.createElement("div");
    track.className = "sales-month-track";

    const bar = document.createElement("div");
    bar.className = "sales-month-bar";
    bar.style.width = `${Math.max(2, value / maxValue * 100)}%`;
    bar.title = zuneMoney(value);

    track.appendChild(bar);

    const amount = document.createElement("span");
    amount.textContent = zuneMoney(value);

    item.append(label, track, amount);
    container.appendChild(item);
  });
}

async function zuneRefreshCurrentSection() {
  const refreshers = {
    overviewSection: zuneLoadOverview,
    analyticsSection: zuneLoadAnalytics,
    applicationsSection: zuneLoadApplications,
    productsSection: zuneLoadProducts,
    ordersSection: zuneLoadOrders,
    usersSection: zuneLoadUsers,
    announcementsSection: zuneLoadAnnouncements,
    notificationsSection: zuneLoadNotifications,
    verificationSection: zuneLoadVerification,
    settingsSection: zuneLoadSettings
  };

  const refresh = refreshers[zuneCurrentSection];

  if (typeof refresh === "function") {
    await refresh();
    zuneToast("Taarifa zimekaguliwa.", "success");
  }
}

function zuneBuildCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";

  if (className) {
    cell.className = className;
  }

  return cell;
}

function zuneBuildActionButton(label, action, id, className = "") {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = String(id);

  if (className) {
    button.className = className;
  }

  return button;
}

function zuneGetTableBody(...selectors) {
  for (const selector of selectors) {
    const element = zuneEl(selector);

    if (element) return element;
  }

  return null;
}

function zuneRenderTableMessage(tbody, colspan, message) {
  zuneRenderEmptyRow(tbody, colspan, message);
}

function zuneFormatStatus(status) {
  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    published: "Limechapishwa",
    draft: "Rasimu",
    active: "Hai",
    inactive: "Haifanyi kazi",
    true: "Imethibitishwa",
    false: "Haijathibitishwa"
  };

  const key = String(status ?? "").toLowerCase();

  return labels[key] || status || "—";
}

function zuneEnsureAdminActionAllowed() {
  zuneRequireAdmin();
  return true;
}

async function zuneLoadApplications() {
  const tbody = zuneGetTableBody(
    "#applicationsTableBody",
    "#sellerApplicationsTableBody",
    "#applicationsBody"
  );

  if (!tbody) return;

  try {
    zuneEnsureAdminActionAllowed();

    const applications = await zuneFetchRows(
      "seller_applications",
      "*",
      query => query.order("created_at", { ascending: false }),
      500
    );

    if (!applications.length) {
      zuneRenderTableMessage(
        tbody,
        7,
        "Hakuna maombi ya wauzaji kwa sasa."
      );
      return;
    }

    tbody.replaceChildren();

    applications.forEach(application => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(application.store_name),
        zuneBuildCell(application.owner_name),
        zuneBuildCell(application.phone),
        zuneBuildCell(application.country),
        zuneBuildCell(zuneFormatStatus(application.status)),
        zuneBuildCell(zuneDate(application.created_at))
      );

      const actions = document.createElement("td");

      if (application.status === "pending") {
        actions.append(
          zuneBuildActionButton(
            "Idhinisha",
            "approve-application",
            application.id,
            "btn btn-success"
          ),
          zuneBuildActionButton(
            "Kataa",
            "reject-application",
            application.id,
            "btn btn-danger"
          )
        );
      } else {
        actions.textContent = "Hakuna hatua";
      }

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE applications error:", error);

    zuneRenderTableMessage(
      tbody,
      7,
      zuneErrorMessage(error)
    );
  }
}

async function zuneUpdateApplicationStatus(id, status) {
  try {
    zuneEnsureAdminActionAllowed();

    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Hali ya ombi si sahihi.");
    }

    const actionLabel =
      status === "approved" ? "kuidhinisha" : "kukataa";

    if (
      !window.confirm(
        `Una uhakika unataka ${actionLabel} ombi hili?`
      )
    ) {
      return;
    }

    const { data, error } = await zuneSupabase
      .from("seller_applications")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "Ombi halikubadilishwa. Huenda limebadilishwa tayari au huna ruhusa."
      );
    }

    zuneToast(
      status === "approved"
        ? "Ombi limeidhinishwa."
        : "Ombi limekataliwa.",
      "success"
    );

    await Promise.allSettled([
      zuneLoadApplications(),
      zuneLoadOverview()
    ]);
  } catch (error) {
    console.error("ZUNE application update error:", error);
    zuneToast(zuneErrorMessage(error), "error");
  }
}

async function zuneLoadProducts() {
  const tbody = zuneGetTableBody(
    "#productsTableBody",
    "#adminProductsTableBody",
    "#productsBody"
  );

  if (!tbody) return;

  try {
    zuneEnsureAdminActionAllowed();

    const products = await zuneFetchRows(
      "products",
      "id, vendor_id, title, description, price, stock_quantity, created_at",
      query => query.order("created_at", { ascending: false }),
      500
    );

    if (!products.length) {
      zuneRenderTableMessage(
        tbody,
        6,
        "Hakuna bidhaa zilizopatikana."
      );
      return;
    }

    tbody.replaceChildren();

    products.forEach(product => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(product.title),
        zuneBuildCell(zuneMoney(product.price)),
        zuneBuildCell(zuneNumber(product.stock_quantity)),
        zuneBuildCell(String(product.vendor_id || "—").slice(0, 8)),
        zuneBuildCell(zuneDate(product.created_at))
      );

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Tazama",
          "view-product",
          product.id,
          "btn btn-secondary"
        )
      );

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE products error:", error);

    zuneRenderTableMessage(
      tbody,
      6,
      zuneErrorMessage(error)
    );
  }
}

async function zuneViewProduct(id) {
  try {
    zuneEnsureAdminActionAllowed();

    const { data: product, error } = await zuneSupabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!product) {
      throw new Error("Bidhaa haijapatikana.");
    }

    window.alert(
      [
        `Jina: ${product.title || "—"}`,
        `Bei: ${zuneMoney(product.price)}`,
        `Stock: ${zuneNumber(product.stock_quantity)}`,
        `Vendor ID: ${product.vendor_id || "—"}`,
        `Maelezo: ${product.description || "Hakuna"}`,
        `Tarehe: ${zuneDate(product.created_at)}`
      ].join("\n")
    );
  } catch (error) {
    console.error("ZUNE view product error:", error);
    zuneToast(zuneErrorMessage(error), "error");
  }
}

async function zuneLoadOrders() {
  const tbody = zuneGetTableBody(
    "#ordersTableBody",
    "#adminOrdersTableBody",
    "#ordersBody"
  );

  if (!tbody) return;

  try {
    zuneEnsureAdminActionAllowed();

    const orders = await zuneFetchRows(
      "orders",
      "id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at",
      query => query.order("created_at", { ascending: false }),
      500
    );

    if (!orders.length) {
      zuneRenderTableMessage(
        tbody,
        7,
        "Hakuna oda zilizopatikana."
      );
      return;
    }

    tbody.replaceChildren();

    orders.forEach(order => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(String(order.id).slice(0, 8)),
        zuneBuildCell(String(order.buyer_id || "—").slice(0, 8)),
        zuneBuildCell(String(order.product_id || "—").slice(0, 8)),
        zuneBuildCell(zuneNumber(order.quantity)),
        zuneBuildCell(zuneMoney(order.total_price)),
        zuneBuildCell(zuneFormatStatus(order.status)),
        zuneBuildCell(zuneDate(order.created_at))
      );

      const actions = document.createElement("td");

      actions.appendChild(
        zuneBuildActionButton(
          "Tazama",
          "view-order",
          order.id,
          "btn btn-secondary"
        )
      );

      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE orders error:", error);

    zuneRenderTableMessage(
      tbody,
      8,
      zuneErrorMessage(error)
    );
  }
}

async function zuneViewOrder(id) {
  try {
    zuneEnsureAdminActionAllowed();

    const { data: order, error } = await zuneSupabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      throw new Error("Oda haijapatikana.");
    }

    window.alert(
      [
        `Order ID: ${order.id}`,
        `Buyer ID: ${order.buyer_id || "—"}`,
        `Product ID: ${order.product_id || "—"}`,
        `Quantity: ${zuneNumber(order.quantity)}`,
        `Total: ${zuneMoney(order.total_price)}`,
        `Commission: ${zuneMoney(order.commission_fee)}`,
        `Status: ${zuneFormatStatus(order.status)}`,
        `Tarehe: ${zuneDate(order.created_at)}`
      ].join("\n")
    );
  } catch (error) {
    console.error("ZUNE view order error:", error);
    zuneToast(zuneErrorMessage(error), "error");
  }
}

async function zuneLoadUsers() {
  const tbody = zuneGetTableBody(
    "#usersTableBody",
    "#adminUsersTableBody",
    "#usersBody"
  );

  if (!tbody) return;

  try {
    zuneEnsureAdminActionAllowed();

    const users = await zuneFetchRows(
      "profiles",
      "id, full_name, phone_number, role, is_verified, created_at",
      query => query.order("created_at", { ascending: false }),
      1000
    );

    if (!users.length) {
      zuneRenderTableMessage(
        tbody,
        6,
        "Hakuna watumiaji waliopatikana."
      );
      return;
    }

    tbody.replaceChildren();

    users.forEach(user => {
      const row = document.createElement("tr");

      row.append(
        zuneBuildCell(user.full_name),
        zuneBuildCell(user.phone_number || "—"),
        zuneBuildCell(user.role),
        zuneBuildCell(
          user.is_verified ? "Imethibitishwa" : "Haijathibitishwa"
        ),
        zuneBuildCell(String(user.id).slice(0, 8)),
        zuneBuildCell(zuneDate(user.created_at))
      );

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE users error:", error);

    zuneRenderTableMessage(
      tbody,
      6,
      zuneErrorMessage(error)
    );
  }
}

document.addEventListener("click", async function (event) {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (!action || !id) return;

  if (button.disabled) return;

  button.disabled = true;

  try {
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
  } finally {
    button.disabled = false;
  }
});

function zuneFormValue(form, name) {
  const field = form?.elements?.namedItem(name);
  return field ? String(field.value || "").trim() : "";
}

function zuneBindOnce(element, eventName, callback, key) {
  if (!element) return;

  const marker = `zuneBound${key}`;

  if (element.dataset[marker] === "true") return;

  element.addEventListener(eventName, callback);
  element.dataset[marker] = "true";
}

async function zuneLoadAnnouncements() {
  const tbody =
    zuneEl("#announcementHistory") ||
    zuneEl("#announcementsTableBody");

  if (!tbody) return;

  try {
    zuneRequireAdmin();

    const announcements = await zuneFetchRows(
      "admin_announcements",
      "*",
      query => query.order("created_at", { ascending: false }),
      200
    );

    tbody.replaceChildren();

    if (!announcements.length) {
      if (tbody.tagName === "TBODY") {
        zuneRenderEmptyRow(
          tbody,
          6,
          "Hakuna matangazo yaliyopatikana."
        );
      } else {
        tbody.textContent = "Hakuna matangazo yaliyopatikana.";
      }

      return;
    }

    announcements.forEach(item => {
      const row = document.createElement(
        tbody.tagName === "TBODY" ? "tr" : "div"
      );

      row.className = "announcement-history-item";

      const details = document.createElement(
        tbody.tagName === "TBODY" ? "td" : "div"
      );

      details.textContent =
        `${item.title || "Bila kichwa"} — ` +
        `${zuneFormatStatus(item.status)} — ` +
        `${item.audience || "Wote"} — ` +
        `${zuneDate(item.created_at)}`;

      if (tbody.tagName === "TBODY") {
        details.colSpan = 6;
      }

      row.appendChild(details);
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE announcements error:", error);

    if (tbody.tagName === "TBODY") {
      zuneRenderEmptyRow(tbody, 6, zuneErrorMessage(error));
    } else {
      tbody.textContent = zuneErrorMessage(error);
    }
  }
}

function zuneBindAnnouncementForm() {
  const form = zuneEl("#announcementForm");

  if (!form) return;

  zuneBindOnce(
    form,
    "submit",
    async function (event) {
      event.preventDefault();

      if (zuneAdminBusy) return;

      try {
        zuneRequireAdmin();

        const title = zuneFormValue(form, "title");
        const message = zuneFormValue(form, "message");
        const audience =
          zuneFormValue(form, "audience") || "all";
        const displayType =
          zuneFormValue(form, "display_type") || "notification";
        const priority =
          zuneFormValue(form, "priority") || "normal";
        const expiresAt = zuneFormValue(form, "expires_at");

        if (!title || !message) {
          zuneToast(
            "Jaza kichwa na ujumbe wa tangazo.",
            "error"
          );
          return;
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

        const submitButton = form.querySelector(
          "button[type='submit']"
        );

        if (submitButton) submitButton.disabled = true;

        const { error } = await zuneSupabase
          .from("admin_announcements")
          .insert(payload);

        if (error) throw error;

        form.reset();

        zuneToast("Tangazo limechapishwa.", "success");

        await zuneLoadAnnouncements();
      } catch (error) {
        console.error("ZUNE announcement submit error:", error);
        zuneToast(zuneErrorMessage(error), "error");
      } finally {
        const submitButton = form.querySelector(
          "button[type='submit']"
        );

        if (submitButton) submitButton.disabled = false;
      }
    },
    "AnnouncementForm"
  );
}

async function zuneLoadNotifications() {
  const tbody =
    zuneEl("#notificationsTableBody") ||
    zuneEl("#notificationsBody");

  if (!tbody) return;

  try {
    zuneRequireAdmin();

    const notifications = await zuneFetchRows(
      "notifications",
      "*",
      query => query.order("created_at", { ascending: false }),
      200
    );

    tbody.replaceChildren();

    if (!notifications.length) {
      zuneRenderEmptyRow(
        tbody,
        5,
        "Hakuna notifications zilizopatikana."
      );
      return;
    }

    notifications.forEach(notification => {
      const row = document.createElement("tr");

      [
        notification.title || "—",
        notification.message || "—",
        notification.user_id ||
          notification.recipient_id ||
          "—",
        zuneDate(notification.created_at)
      ].forEach(value => {
        row.appendChild(zuneBuildCell(value));
      });

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE notifications error:", error);

    zuneRenderEmptyRow(
      tbody,
      5,
      zuneErrorMessage(error)
    );
  }
}

async function zuneLoadVerification() {
  const tbody =
    zuneEl("#verificationTableBody") ||
    zuneEl("#verificationBody");

  if (!tbody) return;

  try {
    zuneRequireAdmin();

    const profiles = await zuneFetchRows(
      "profiles",
      "id, full_name, phone_number, role, is_verified, created_at",
      query => query.order("created_at", { ascending: false }),
      500
    );

    tbody.replaceChildren();

    if (!profiles.length) {
      zuneRenderEmptyRow(
        tbody,
        5,
        "Hakuna profiles zilizopatikana."
      );
      return;
    }

    profiles.forEach(profile => {
      const row = document.createElement("tr");

      [
        profile.full_name || "—",
        profile.phone_number || "—",
        profile.role || "—",
        profile.is_verified
          ? "Imethibitishwa"
          : "Haijathibitishwa",
        zuneDate(profile.created_at)
      ].forEach(value => {
        row.appendChild(zuneBuildCell(value));
      });

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("ZUNE verification error:", error);

    zuneRenderEmptyRow(
      tbody,
      5,
      zuneErrorMessage(error)
    );
  }
}

async function zuneLoadSettings() {
  try {
    zuneRequireAdmin();
    zuneUpdateAdminIdentity();

    zuneSetText(
      "#settingsProjectName",
      "ZUNE Premium Admin"
    );

    zuneSetText(
      "#settingsProjectUrl",
      ZUNE_SUPABASE_URL
    );

    zuneSetText(
      "#settingsAdminCreatedAt",
      zuneDate(zuneAdminProfile?.created_at)
    );

    zuneSetText(
      "#settingsAdminId",
      zuneAdminSession?.user?.id || "—"
    );
  } catch (error) {
    console.error("ZUNE settings error:", error);
  }
}

function zuneBindAnnouncementPreview() {
  const form = zuneEl("#announcementForm");
  const preview = zuneEl("#announcementPreview");

  if (!form || !preview) return;

  const updatePreview = () => {
    const title =
      zuneFormValue(form, "title") || "Kichwa cha tangazo";

    const message =
      zuneFormValue(form, "message") ||
      "Ujumbe wako utaonekana hapa.";

    const titleElement =
      zuneEl("[data-preview-title]", preview);

    const messageElement =
      zuneEl("[data-preview-message]", preview);

    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
  };

  zuneBindOnce(
    form,
    "input",
    updatePreview,
    "AnnouncementPreviewInput"
  );

  zuneBindOnce(
    form,
    "change",
    updatePreview,
    "AnnouncementPreviewChange"
  );

  updatePreview();
}

function zuneBindAdminForms() {
  zuneBindAnnouncementForm();
  zuneBindAnnouncementPreview();
}

function zuneOnAdminSettingsOpen() {
  zuneLoadSettings();
}

function zuneBindLoginForm() {
  const form =
    zuneEl("#adminLoginForm") ||
    zuneEl("#adminLoginScreen form");

  if (!form) {
    console.warn("ZUNE: Admin login form haijapatikana.");
    return;
  }

  zuneBindOnce(
    form,
    "submit",
    zuneAdminLogin,
    "AdminLoginSubmit"
  );
}

function zuneOpenSection(sectionId) {
  zuneRequireAdmin();

  const requestedSection = ZUNE_SECTIONS[sectionId]
    ? sectionId
    : "overviewSection";

  zuneCurrentSection = requestedSection;

  zuneAll(
    ".page-section, .admin-section, [data-page-section]"
  ).forEach(section => {
    const isActive = section.id === requestedSection;

    zuneShowElement(section, isActive);

    section.classList.toggle("active", isActive);
    section.setAttribute(
      "aria-hidden",
      isActive ? "false" : "true"
    );
  });

  zuneAll("[data-section]").forEach(button => {
    const active =
      button.dataset.section === requestedSection;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const sectionInfo = ZUNE_SECTIONS[requestedSection];

  zuneSetText(
    "#pageTitle",
    sectionInfo.title
  );

  zuneSetText(
    "#adminPageTitle",
    sectionInfo.title
  );

  zuneSetText(
    "#pageSubtitle",
    sectionInfo.subtitle
  );

  zuneSetText(
    "#adminPageSubtitle",
    sectionInfo.subtitle
  );

  const sidebar = zuneEl("#adminSidebar");
  const backdrop = zuneEl("#sidebarBackdrop");

  if (sidebar) {
    sidebar.classList.remove("open");
    sidebar.classList.remove("active");
    sidebar.setAttribute("aria-hidden", "true");
  }

  if (backdrop) {
    backdrop.classList.remove("show");
    backdrop.classList.remove("active");
    zuneShowElement(backdrop, false);
  }

  if (requestedSection === "settingsSection") {
    zuneOnAdminSettingsOpen();
  }

  zuneRefreshCurrentSection().catch(error => {
    console.error("ZUNE section loading error:", error);
  });
}

function zuneBindNavigation() {
  zuneAll("[data-section]").forEach(button => {
    zuneBindOnce(
      button,
      "click",
      function (event) {
        event.preventDefault();

        const sectionId = button.dataset.section;

        if (!sectionId) return;

        try {
          zuneOpenSection(sectionId);
        } catch (error) {
          console.error("ZUNE navigation error:", error);
          zuneToast(zuneErrorMessage(error), "error");
        }
      },
      "SectionNavigation"
    );
  });

  const menuToggle = zuneEl("#adminMenuToggle");
  const sidebar = zuneEl("#adminSidebar");
  const backdrop = zuneEl("#sidebarBackdrop");

  if (menuToggle) {
    zuneBindOnce(
      menuToggle,
      "click",
      function () {
        const isOpen =
          sidebar?.classList.contains("open") ||
          sidebar?.classList.contains("active");

        if (sidebar) {
          sidebar.classList.toggle("open", !isOpen);
          sidebar.classList.toggle("active", !isOpen);
          sidebar.setAttribute(
            "aria-hidden",
            isOpen ? "true" : "false"
          );
        }

        if (backdrop) {
          zuneShowElement(backdrop, !isOpen);
          backdrop.classList.toggle("show", !isOpen);
          backdrop.classList.toggle("active", !isOpen);
        }
      },
      "MenuToggle"
    );
  }

  if (backdrop) {
    zuneBindOnce(
      backdrop,
      "click",
      function () {
        sidebar?.classList.remove("open");
        sidebar?.classList.remove("active");

        if (sidebar) {
          sidebar.setAttribute("aria-hidden", "true");
        }

        backdrop.classList.remove("show");
        backdrop.classList.remove("active");
        zuneShowElement(backdrop, false);
      },
      "SidebarBackdrop"
    );
  }

  const refreshButton = zuneEl("#adminRefreshButton");

  if (refreshButton) {
    zuneBindOnce(
      refreshButton,
      "click",
      async function () {
        try {
          await zuneRefreshCurrentSection();
          zuneToast("Taarifa zimehuishwa.", "success");
        } catch (error) {
          zuneToast(zuneErrorMessage(error), "error");
        }
      },
      "RefreshButton"
    );
  }

  const logoutButtons = [
    zuneEl("#adminLogoutButton"),
    zuneEl("#settingsLogoutButton")
  ].filter(Boolean);

  logoutButtons.forEach((button, index) => {
    zuneBindOnce(
      button,
      "click",
      async function (event) {
        event.preventDefault();
        await zuneAdminLogout();
      },
      `LogoutButton${index}`
    );
  });
}

async function zuneRestoreAdminSession() {
  try {
    const { data, error } =
      await zuneSupabase.auth.getSession();

    if (error) throw error;

    const session = data?.session;

    if (!session) {
      zuneShowLogin();
      return false;
    }

    const profile = await zuneVerifyAdmin(session);

    if (!profile) {
      await zuneSupabase.auth.signOut();
      zuneShowLogin(
        "Akaunti hii haina ruhusa ya kuingia Admin Dashboard."
      );
      return false;
    }

    zuneAdminSession = session;
    zuneAdminProfile = profile;

    zuneShowDashboard();
    zuneUpdateAdminIdentity();
    zuneOpenSection("overviewSection");

    return true;
  } catch (error) {
    console.error("ZUNE restore session error:", error);

    zuneAdminSession = null;
    zuneAdminProfile = null;

    zuneShowLogin(
      "Imeshindikana kuthibitisha session. Ingia tena."
    );

    return false;
  }
}

function zuneListenForAuthChanges() {
  if (!zuneSupabase) return;

  zuneSupabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "SIGNED_OUT") {
        zuneAdminSession = null;
        zuneAdminProfile = null;
        zuneShowLogin();
        return;
      }

      if (event === "SIGNED_IN" && session) {
        zuneAdminSession = session;
      }
    }
  );
}

async function zuneInitializeAdmin() {
  if (zuneInitialized) return;

  zuneInitialized = true;

  try {
    zuneConnectSupabase();

    zuneBindLoginForm();
    zuneBindNavigation();
    zuneBindAdminForms();
    zuneListenForAuthChanges();

    zuneShowLogin();

    await zuneRestoreAdminSession();
  } catch (error) {
    console.error("ZUNE admin initialization error:", error);

    zuneShowLogin(
      "Admin Dashboard haikuweza kuanzishwa. Hakikisha muunganisho wa Supabase upo."
    );

    zuneToast(zuneErrorMessage(error), "error");
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
