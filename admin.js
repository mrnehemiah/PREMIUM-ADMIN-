"use strict";

const ZUNE_SUPABASE_URL = "https://rpkogiieegqgxqbzwxwo.supabase.co";
const ZUNE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

let zuneSupabase = null;
let zuneAdminSession = null;
let zuneAdminProfile = null;
let zuneCurrentSection = "overview";
let zuneAdminBusy = false;

const ZUNE = {
  money: new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }),

  number: new Intl.NumberFormat("en-TZ"),

  date(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  money(value) {
    return ZUNE.money.format(Number(value) || 0);
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

  element(selector) {
    return document.querySelector(selector);
  },

  all(selector) {
    return [...document.querySelectorAll(selector)];
  },

  message(target, text, type = "info") {
    const element = typeof target === "string"
      ? document.querySelector(target)
      : target;

    if (!element) return;

    element.textContent = text;
    element.dataset.type = type;
    element.hidden = false;
  },

  clearMessage(target) {
    const element = typeof target === "string"
      ? document.querySelector(target)
      : target;

    if (!element) return;

    element.textContent = "";
    element.hidden = true;
  },

  toast(message, type = "info") {
    let toast = document.querySelector("#adminToast");

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

    window.clearTimeout(toast._hideTimer);
    toast._hideTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  },

  async query(table, operation) {
    if (!zuneSupabase) {
      throw new Error("Supabase haijaunganishwa.");
    }

    const result = await operation(zuneSupabase.from(table));

    if (result.error) {
      console.error(`ZUNE Admin / ${table}:`, result.error);
      throw result.error;
    }

    return result.data;
  }
};

function zuneSetBusy(isBusy) {
  zuneAdminBusy = isBusy;

  ZUNE.all(
    "#adminLoginForm button[type='submit'], #adminLogout, #adminReloadPage"
  ).forEach(button => {
    button.disabled = isBusy;
  });
}

function zuneShowLogin() {
  const loginPanel = ZUNE.element("#adminLoginPanel");
  const dashboard = ZUNE.element("#adminDashboard");

  if (loginPanel) loginPanel.hidden = false;
  if (dashboard) dashboard.hidden = true;
}

function zuneShowDashboard() {
  const loginPanel = ZUNE.element("#adminLoginPanel");
  const dashboard = ZUNE.element("#adminDashboard");

  if (loginPanel) loginPanel.hidden = true;
  if (dashboard) dashboard.hidden = false;
}

async function zuneVerifyAdmin(session) {
  if (!session?.user?.id) {
    throw new Error("Tafadhali ingia kwa akaunti ya admin.");
  }

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, phone_number, role, is_verified, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data || data.role !== "admin") {
    await zuneSupabase.auth.signOut();
    throw new Error("Akaunti hii haina ruhusa ya kutumia Admin Dashboard.");
  }

  zuneAdminSession = session;
  zuneAdminProfile = data;

  return data;
}

function zuneUpdateAdminIdentity() {
  const profile = zuneAdminProfile;
  const email = zuneAdminSession?.user?.email || "";
  const displayName =
    profile?.full_name ||
    email ||
    "ZUNE Admin";

  const nameTargets = [
    "#adminName",
    "#adminUserName",
    "#sidebarAdminName",
    "[data-admin-name]"
  ];

  const emailTargets = [
    "#adminEmail",
    "#adminUserEmail",
    "[data-admin-email]"
  ];

  nameTargets.forEach(selector => {
    ZUNE.all(selector).forEach(element => {
      element.textContent = displayName;
    });
  });

  emailTargets.forEach(selector => {
    ZUNE.all(selector).forEach(element => {
      element.textContent = email;
    });
  });
}

function zuneOpenSection(sectionName) {
  const requested = String(sectionName || "overview");
  const section = document.getElementById(requested);

  if (!section) {
    ZUNE.toast("Sehemu uliyochagua haijapatikana.", "error");
    return;
  }

  zuneCurrentSection = requested;

  ZUNE.all("[data-section]").forEach(element => {
    const active = element.dataset.section === requested;
    element.classList.toggle("active", active);

    if (element.matches("button, a")) {
      element.setAttribute("aria-current", active ? "page" : "false");
    }
  });

  ZUNE.all("[data-admin-view], .admin-section, .dashboard-section")
    .forEach(element => {
      const matches =
        element.id === requested ||
        element.dataset.adminView === requested;

      if (element.id || element.dataset.adminView) {
        element.hidden = !matches;
        element.classList.toggle("active", matches);
      }
    });

  const title = ZUNE.element("#adminPageTitle");
  if (title) {
    const activeLink = ZUNE.element(
      `[data-section="${CSS.escape(requested)}"]`
    );

    title.textContent =
      activeLink?.dataset.title ||
      activeLink?.textContent?.trim() ||
      "ZUNE Admin";
  }

  ZUNE.element("#adminSidebar")?.classList.remove("open");
  ZUNE.element("#sidebarBackdrop")?.classList.remove("show");

  if (requested === "overview") zuneLoadOverview();
  if (requested === "analytics") zuneLoadAnalytics();
  if (requested === "applications") zuneLoadApplications();
  if (requested === "products") zuneLoadProducts();
  if (requested === "orders") zuneLoadOrders();
  if (requested === "users") zuneLoadUsers();
  if (requested === "announcements") zuneLoadAnnouncements();
  if (requested === "notifications") zuneLoadNotifications();
  if (requested === "verification") zuneLoadVerification();
}

function zuneBindNavigation() {
  ZUNE.all("[data-section]").forEach(element => {
    element.addEventListener("click", event => {
      event.preventDefault();
      zuneOpenSection(element.dataset.section);
    });
  });

  ZUNE.element("#adminReloadPage")?.addEventListener("click", async () => {
    await zuneRefreshCurrentSection();
  });

  ZUNE.element("#adminLogout")?.addEventListener("click", async () => {
    if (zuneAdminBusy) return;

    const { error } = await zuneSupabase.auth.signOut();

    if (error) {
      console.error(error);
      ZUNE.toast("Imeshindikana kutoka. Jaribu tena.", "error");
      return;
    }

    zuneAdminSession = null;
    zuneAdminProfile = null;
    zuneShowLogin();
  });

  ZUNE.element("#adminMenuToggle")?.addEventListener("click", () => {
    ZUNE.element("#adminSidebar")?.classList.toggle("open");
    ZUNE.element("#sidebarBackdrop")?.classList.toggle("show");
  });

  ZUNE.element("#sidebarBackdrop")?.addEventListener("click", () => {
    ZUNE.element("#adminSidebar")?.classList.remove("open");
    ZUNE.element("#sidebarBackdrop")?.classList.remove("show");
  });
}

async function zuneRefreshCurrentSection() {
  if (!zuneAdminSession) return;

  try {
    await zuneVerifyAdmin(zuneAdminSession);

    switch (zuneCurrentSection) {
      case "analytics":
        await zuneLoadAnalytics();
        break;
      case "applications":
        await zuneLoadApplications();
        break;
      case "products":
        await zuneLoadProducts();
        break;
      case "orders":
        await zuneLoadOrders();
        break;
      case "users":
        await zuneLoadUsers();
        break;
      case "announcements":
        await zuneLoadAnnouncements();
        break;
      case "notifications":
        await zuneLoadNotifications();
        break;
      case "verification":
        await zuneLoadVerification();
        break;
      default:
        await zuneLoadOverview();
    }

    ZUNE.toast("Taarifa zimekaguliwa upya.", "success");
  } catch (error) {
    console.error(error);
    ZUNE.toast("Imeshindikana kusasisha taarifa.", "error");
  }
}

async function zuneAdminLogin(event) {
  event.preventDefault();

  if (zuneAdminBusy) return;

  const form = event.currentTarget;
  const email = form.querySelector(
    "[name='email'], #adminEmailInput, #loginEmail"
  )?.value?.trim();

  const password = form.querySelector(
    "[name='password'], #adminPasswordInput, #loginPassword"
  )?.value;

  const messageTarget =
    ZUNE.element("#loginMessage") ||
    ZUNE.element("#adminLoginMessage");

  ZUNE.clearMessage(messageTarget);

  if (!email || !password) {
    ZUNE.message(
      messageTarget,
      "Weka email na password yako.",
      "error"
    );
    return;
  }

  zuneSetBusy(true);

  try {
    const { data, error } = await zuneSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await zuneVerifyAdmin(data.session);
    zuneShowDashboard();
    zuneUpdateAdminIdentity();
    zuneOpenSection("overview");

    ZUNE.toast("Karibu kwenye ZUNE Admin Dashboard.", "success");
  } catch (error) {
    console.error("ZUNE admin login:", error);

    ZUNE.message(
      messageTarget,
      error.message ||
        "Imeshindikana kuingia. Hakikisha taarifa zako ni sahihi.",
      "error"
    );

    zuneShowLogin();
  } finally {
    zuneSetBusy(false);
  }
}

async function zuneLoadOverview() {
  const messageTarget = ZUNE.element("#adminGlobalMessage");
  ZUNE.clearMessage(messageTarget);

  try {
    const [products, orders, profiles, applications] = await Promise.all([
      ZUNE.query("products", query =>
        query.select("id, price, stock_quantity, created_at")
      ),
      ZUNE.query("orders", query =>
        query.select("id, total_price, commission_fee, status, created_at")
      ),
      ZUNE.query("profiles", query =>
        query.select("id, role, created_at")
      ),
      ZUNE.query("seller_applications", query =>
        query.select("id, status, created_at")
      )
    ]);

    const completedOrders = orders.filter(
      order => order.status === "completed"
    );

    const totalSales = completedOrders.reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    const pendingApplications = applications.filter(
      application => application.status === "pending"
    ).length;

    zuneSetText("#statTotalSales", ZUNE.money(totalSales));
    zuneSetText("#statTotalOrders", ZUNE.number.format(orders.length));
    zuneSetText(
      "#statTotalSellers",
      ZUNE.number.format(profiles.filter(profile => profile.role === "vendor").length)
    );
    zuneSetText(
      "#statTotalCustomers",
      ZUNE.number.format(profiles.filter(profile => profile.role === "buyer").length)
    );
    zuneSetText("#pendingAppsCount", ZUNE.number.format(pendingApplications));

    zuneSetText(
      "#statTotalProducts",
      ZUNE.number.format(products.length)
    );

    zuneSetText(
      "#statPendingOrders",
      ZUNE.number.format(
        orders.filter(order => order.status === "pending").length
      )
    );

    zuneSetText(
      "#statCompletedOrders",
      ZUNE.number.format(completedOrders.length)
    );

    zuneRenderRecentOrders(orders);
    zuneRenderOverviewProducts(products);

    const lastUpdated = ZUNE.element("#adminLastUpdated");
    if (lastUpdated) {
      lastUpdated.textContent = `Imesasishwa: ${ZUNE.date(new Date())}`;
    }
  } catch (error) {
    console.error("ZUNE overview:", error);

    ZUNE.message(
      messageTarget,
      "Baadhi ya takwimu hazijapatikana. Kagua ruhusa za Supabase na majina ya columns.",
      "error"
    );
  }
}

function zuneSetText(selector, value) {
  const element = ZUNE.element(selector);
  if (element) element.textContent = value ?? "—";
}

function zuneStatusLabel(status) {
  const labels = {
    pending: "Inasubiri",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    active: "Hai",
    inactive: "Haipo hewani"
  };

  return labels[status] || status || "—";
}

function zuneRenderRecentOrders(orders) {
  const container =
    ZUNE.element("#recentOrdersTableBody") ||
    ZUNE.element("#recentOrdersBody");

  if (!container) return;

  const recentOrders = [...orders]
    .sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )
    .slice(0, 8);

  if (!recentOrders.length) {
    container.innerHTML =
      '<tr><td colspan="6">Hakuna oda zilizopatikana.</td></tr>';
    return;
  }

  container.innerHTML = recentOrders.map(order => `
    <tr>
      <td>${ZUNE.escape(String(order.id).slice(0, 8))}</td>
      <td>${ZUNE.escape(ZUNE.money(order.total_price))}</td>
      <td>${ZUNE.escape(ZUNE.statusLabel
        ? ZUNE.statusLabel(order.status)
        : zuneStatusLabel(order.status))}</td>
      <td>${ZUNE.escape(ZUNE.date(order.created_at))}</td>
    </tr>
  `).join("");
}

function zuneRenderOverviewProducts(products) {
  const container =
    ZUNE.element("#overviewProductsBody") ||
    ZUNE.element("#recentProductsBody");

  if (!container) return;

  const latest = [...products]
    .sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )
    .slice(0, 6);

  if (!latest.length) {
    container.innerHTML =
      '<tr><td colspan="5">Hakuna bidhaa zilizopatikana.</td></tr>';
    return;
  }

  container.innerHTML = latest.map(product => `
    <tr>
      <td>${ZUNE.escape(String(product.id).slice(0, 8))}</td>
      <td>${ZUNE.escape(ZUNE.money(product.price))}</td>
      <td>${ZUNE.escape(product.stock_quantity ?? 0)}</td>
      <td>${ZUNE.escape(ZUNE.date(product.created_at))}</td>
    </tr>
  `).join("");
}
ZUNE.money.format = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0
}).format.bind(new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0
}));

ZUNE.statusLabel = zuneStatusLabel;

async function zuneLoadAnalytics() {
  try {
    const [orders, products, profiles] = await Promise.all([
      ZUNE.query("orders", query =>
        query.select("id, total_price, commission_fee, status, created_at")
      ),
      ZUNE.query("products", query =>
        query.select("id, price, created_at")
      ),
      ZUNE.query("profiles", query =>
        query.select("id, role, created_at")
      )
    ]);

    const completed = orders.filter(order => order.status === "completed");
    const revenue = completed.reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    zuneSetText("#analyticsTotalSales", ZUNE.money(revenue));
    zuneSetText("#analyticsTotalOrders", ZUNE.number.format(orders.length));
    zuneSetText("#analyticsTotalProducts", ZUNE.number.format(products.length));
    zuneSetText("#analyticsTotalUsers", ZUNE.number.format(profiles.length));

    zuneRenderMonthlySales(orders);
    zuneRenderRoleStats(profiles);
  } catch (error) {
    console.error("Analytics:", error);
    ZUNE.toast(
      "Takwimu hazijapatikana. Hakikisha ruhusa za kusoma data zipo.",
      "error"
    );
  }
}

function zuneRenderMonthlySales(orders) {
  const container =
    ZUNE.element("#monthlySalesChart") ||
    ZUNE.element("#adminSalesChart");

  if (!container) return;

  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("sw-TZ", { month: "short" }),
      total: 0
    });
  }

  orders
    .filter(order => order.status === "completed")
    .forEach(order => {
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime())) return;

      const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const month = months.find(item => item.key === key);
      if (month) month.total += Number(order.total_price) || 0;
    });

  const max = Math.max(...months.map(month => month.total), 1);

  container.innerHTML = `
    <div class="zune-chart-bars">
      ${months.map(month => `
        <div class="zune-chart-column">
          <span class="zune-chart-value">${ZUNE.escape(
            ZUNE.money(month.total)
          )}</span>
          <div class="zune-chart-track">
            <div class="zune-chart-bar"
                 style="height:${Math.max(4, month.total / max * 100)}%"
                 title="${ZUNE.escape(ZUNE.money(month.total))}"></div>
          </div>
          <span class="zune-chart-label">${ZUNE.escape(month.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function zuneRenderRoleStats(profiles) {
  const container = ZUNE.element("#userRoleStats");
  if (!container) return;

  const roles = [
    { role: "buyer", label: "Wateja" },
    { role: "vendor", label: "Wauzaji" },
    { role: "admin", label: "Admins" }
  ];

  container.innerHTML = roles.map(item => {
    const count = profiles.filter(profile => profile.role === item.role).length;

    return `
      <div class="zune-role-stat">
        <span>${ZUNE.escape(item.label)}</span>
        <strong>${ZUNE.number.format(count)}</strong>
      </div>
    `;
  }).join("");
}

async function zuneLoadApplications() {
  const body =
    ZUNE.element("#applicationsTableBody") ||
    ZUNE.element("#sellerApplicationsBody");

  if (!body) return;

  body.innerHTML = '<tr><td colspan="7">Inapakia maombi...</td></tr>';

  try {
    const applications = await ZUNE.query("seller_applications", query =>
      query.select(
        "id, store_name, business_name, owner_name, phone, email, country, category, region, district, address, status, created_at"
      ).order("created_at", { ascending: false })
    );

    zuneSetText(
      "#pendingAppsCount",
      ZUNE.number.format(
        applications.filter(application => application.status === "pending").length
      )
    );

    zuneRenderApplications(applications);
    zuneBindApplicationFilters(applications);
  } catch (error) {
    console.error("Seller applications:", error);
    body.innerHTML =
      '<tr><td colspan="7">Imeshindikana kupakia maombi. Kagua columns na RLS policies.</td></tr>';
  }
}

function zuneRenderApplications(applications) {
  const body =
    ZUNE.element("#applicationsTableBody") ||
    ZUNE.element("#sellerApplicationsBody");

  if (!body) return;

  if (!applications.length) {
    body.innerHTML =
      '<tr><td colspan="7">Hakuna maombi ya wauzaji kwa sasa.</td></tr>';
    return;
  }

  body.innerHTML = applications.map(application => {
    const storeName = application.store_name || application.business_name || "—";
    const status = String(application.status || "pending").toLowerCase();

    return `
      <tr data-application-id="${ZUNE.escape(application.id)}"
          data-application-status="${ZUNE.escape(status)}">
        <td>${ZUNE.escape(String(application.id).slice(0, 8))}</td>
        <td>
          <strong>${ZUNE.escape(storeName)}</strong>
          <small>${ZUNE.escape(application.category || "")}</small>
        </td>
        <td>${ZUNE.escape(application.owner_name || "—")}</td>
        <td>${ZUNE.escape(application.phone || "—")}</td>
        <td>${ZUNE.escape(
          [application.region, application.district, application.country]
            .filter(Boolean).join(", ") || "—"
        )}</td>
        <td><span class="status-badge status-${ZUNE.escape(status)}">${
          ZUNE.escape(zuneStatusLabel(status))
        }</span></td>
        <td>
          <button type="button" data-app-action="view"
                  data-id="${ZUNE.escape(application.id)}">Angalia</button>
          ${status === "pending" ? `
            <button type="button" data-app-action="approve"
                    data-id="${ZUNE.escape(application.id)}">Idhinisha</button>
            <button type="button" data-app-action="reject"
                    data-id="${ZUNE.escape(application.id)}">Kataa</button>
          ` : ""}
        </td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-app-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.appAction;
      const application = applications.find(item => String(item.id) === String(id));

      if (action === "view") {
        zuneShowApplicationDetails(application);
      } else if (action === "approve") {
        await zuneSetApplicationStatus(id, "approved");
      } else if (action === "reject") {
        await zuneSetApplicationStatus(id, "rejected");
      }
    });
  });
}

function zuneBindApplicationFilters(applications) {
  const filter =
    ZUNE.element("#applicationStatusFilter") ||
    ZUNE.element("#sellerApplicationFilter");

  if (!filter || filter.dataset.bound === "true") return;

  filter.dataset.bound = "true";
  filter.addEventListener("change", () => {
    const value = filter.value;
    const filtered = value === "all"
      ? applications
      : applications.filter(item => item.status === value);

    zuneRenderApplications(filtered);
  });
}

async function zuneSetApplicationStatus(id, status) {
  if (!["approved", "rejected"].includes(status)) return;

  const actionLabel = status === "approved" ? "kuidhinisha" : "kukataa";

  if (!window.confirm(`Una uhakika unataka ${actionLabel} ombi hili?`)) {
    return;
  }

  try {
    const { error } = await zuneSupabase
      .from("seller_applications")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;

    ZUNE.toast(
      status === "approved"
        ? "Ombi limeidhinishwa."
        : "Ombi limekataliwa.",
      "success"
    );

    await zuneLoadApplications();
  } catch (error) {
    console.error("Application status update:", error);
    ZUNE.toast(
      "Imeshindikana kubadilisha hali. Kagua RLS policy ya admin.",
      "error"
    );
  }
}

function zuneShowApplicationDetails(application) {
  if (!application) return;

  const details = [
    `Duka: ${application.store_name || application.business_name || "—"}`,
    `Mmiliki: ${application.owner_name || "—"}`,
    `Simu: ${application.phone || "—"}`,
    `Email: ${application.email || "—"}`,
    `Nchi: ${application.country || "—"}`,
    `Aina ya biashara: ${application.category || "—"}`,
    `Mkoa: ${application.region || "—"}`,
    `Wilaya: ${application.district || "—"}`,
    `Anwani: ${application.address || "—"}`,
    `Hali: ${zuneStatusLabel(application.status)}`,
    `Tarehe: ${ZUNE.date(application.created_at)}`
  ].join("\n");

  const modal = ZUNE.element("#adminModal");
  const content = ZUNE.element("#adminModalContent");
  const title = ZUNE.element("#adminModalTitle");

  if (!modal || !content) {
    window.alert(details);
    return;
  }

  if (title) title.textContent = "Maelezo ya Ombi la Muuzaji";

  content.innerHTML = `
    <pre class="admin-detail-text">${ZUNE.escape(details)}</pre>
  `;

  modal.hidden = false;
  modal.classList.add("open");
}

async function zuneLoadProducts() {
  const body =
    ZUNE.element("#productsTableBody") ||
    ZUNE.element("#adminProductsBody");

  if (!body) return;

  body.innerHTML = '<tr><td colspan="6">Inapakia bidhaa...</td></tr>';

  try {
    const products = await ZUNE.query("products", query =>
      query.select(
        "id, vendor_id, title, description, price, stock_quantity, image_url, created_at"
      ).order("created_at", { ascending: false })
    );

    zuneSetText("#productsCount", ZUNE.number.format(products.length));
    zuneRenderProducts(products);
  } catch (error) {
    console.error("Products:", error);
    body.innerHTML =
      '<tr><td colspan="6">Imeshindikana kupakia bidhaa. Kagua columns na RLS policies.</td></tr>';
  }
}

function zuneRenderProducts(products) {
  const body =
    ZUNE.element("#productsTableBody") ||
    ZUNE.element("#adminProductsBody");

  if (!body) return;

  if (!products.length) {
    body.innerHTML =
      '<tr><td colspan="6">Hakuna bidhaa zilizowekwa.</td></tr>';
    return;
  }

  body.innerHTML = products.map(product => `
    <tr data-product-id="${ZUNE.escape(product.id)}">
      <td>${ZUNE.escape(String(product.id).slice(0, 8))}</td>
      <td>
        <strong>${ZUNE.escape(product.title || "Bidhaa bila jina")}</strong>
        <small>${ZUNE.escape(product.description || "")}</small>
      </td>
      <td>${ZUNE.escape(ZUNE.money(product.price))}</td>
      <td>${ZUNE.escape(product.stock_quantity ?? 0)}</td>
      <td>${ZUNE.escape(ZUNE.date(product.created_at))}</td>
      <td>
        <button type="button" data-product-action="view"
                data-id="${ZUNE.escape(product.id)}">Angalia</button>
        <button type="button" data-product-action="delete"
                data-id="${ZUNE.escape(product.id)}">Futa</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-product-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const product = products.find(
        item => String(item.id) === String(button.dataset.id)
      );

      if (button.dataset.productAction === "view") {
        zuneShowProductDetails(product);
      }

      if (button.dataset.productAction === "delete") {
        await zuneDeleteProduct(button.dataset.id);
      }
    });
  });
}

function zuneShowProductDetails(product) {
  if (!product) return;

  const details = [
    `Jina: ${product.title || "—"}`,
    `Bei: ${ZUNE.money(product.price)}`,
    `Stock: ${product.stock_quantity ?? 0}`,
    `Vendor ID: ${product.vendor_id || "—"}`,
    `Maelezo: ${product.description || "—"}`,
    `Tarehe: ${ZUNE.date(product.created_at)}`
  ].join("\n");

  window.alert(details);
}

async function zuneDeleteProduct(id) {
  if (!window.confirm(
    "Una uhakika unataka kufuta bidhaa hii? Kitendo hiki hakiwezi kurejeshwa kwa urahisi."
  )) return;

  try {
    const { error } = await zuneSupabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;

    ZUNE.toast("Ombi la kufuta bidhaa limekamilika.", "success");
    await zuneLoadProducts();
  } catch (error) {
    console.error("Delete product:", error);
    ZUNE.toast(
      "Imeshindikana kufuta bidhaa. Hakikisha admin ana ruhusa kwenye RLS.",
      "error"
    );
  }
}

async function zuneLoadOrders() {
  const body =
    ZUNE.element("#ordersTableBody") ||
    ZUNE.element("#adminOrdersBody");

  if (!body) return;

  body.innerHTML = '<tr><td colspan="7">Inapakia oda...</td></tr>';

  try {
    const orders = await ZUNE.query("orders", query =>
      query.select(
        "id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at"
      ).order("created_at", { ascending: false })
    );

    zuneSetText("#ordersCount", ZUNE.number.format(orders.length));
    zuneRenderOrders(orders);
  } catch (error) {
    console.error("Orders:", error);
    body.innerHTML =
      '<tr><td colspan="7">Imeshindikana kupakia oda. Kagua columns na RLS policies.</td></tr>';
  }
}

function zuneRenderOrders(orders) {
  const body =
    ZUNE.element("#ordersTableBody") ||
    ZUNE.element("#adminOrdersBody");

  if (!body) return;

  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="7">Hakuna oda zilizopatikana.</td></tr>';
    return;
  }

  body.innerHTML = orders.map(order => `
    <tr data-order-id="${ZUNE.escape(order.id)}">
      <td>${ZUNE.escape(String(order.id).slice(0, 8))}</td>
      <td>${ZUNE.escape(String(order.buyer_id || "—").slice(0, 8))}</td>
      <td>${ZUNE.escape(String(order.product_id || "—").slice(0, 8))}</td>
      <td>${ZUNE.escape(order.quantity ?? 0)}</td>
      <td>${ZUNE.escape(ZUNE.money(order.total_price))}</td>
      <td><span class="status-badge status-${ZUNE.escape(order.status)}">${
        ZUNE.escape(zuneStatusLabel(order.status))
      }</span></td>
      <td>
        <select data-order-status="${ZUNE.escape(order.id)}"
                aria-label="Badili hali ya oda">
          ${["pending", "confirmed", "completed", "cancelled"].map(status => `
            <option value="${status}" ${order.status === status ? "selected" : ""}>
              ${ZUNE.escape(zuneStatusLabel(status))}
            </option>
          `).join("")}
        </select>
        <button type="button" data-order-save="${ZUNE.escape(order.id)}">
          Hifadhi
        </button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-order-save]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.orderSave;
      const select = body.querySelector(`[data-order-status="${CSS.escape(id)}"]`);

      if (select) await zuneUpdateOrderStatus(id, select.value);
    });
  });
}

async function zuneUpdateOrderStatus(id, status) {
  if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
    ZUNE.toast("Hali ya oda haikubaliki.", "error");
    return;
  }

  if (!window.confirm(`Unataka kuweka oda hii kuwa "${zuneStatusLabel(status)}"?`)) {
    return;
  }

  try {
    const { error } = await zuneSupabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("id");

    if (error) throw error;

    ZUNE.toast("Hali ya oda imesasishwa.", "success");
    await zuneLoadOrders();
  } catch (error) {
    console.error("Order status:", error);
    ZUNE.toast(
      "Imeshindikana kubadili hali ya oda. Kagua RLS policy.",
      "error"
    );
  }
}
async function zuneLoadUsers() {
  const body =
    ZUNE.element("#usersTableBody") ||
    ZUNE.element("#adminUsersBody");

  if (!body) return;

  body.innerHTML = '<tr><td colspan="6">Inapakia watumiaji...</td></tr>';

  try {
    const users = await ZUNE.query("profiles", query =>
      query.select("id, full_name, phone_number, role, is_verified, created_at")
        .order("created_at", { ascending: false })
    );

    zuneSetText("#usersCount", ZUNE.number.format(users.length));
    zuneRenderUsers(users);
  } catch (error) {
    console.error("Users:", error);
    body.innerHTML =
      '<tr><td colspan="6">Imeshindikana kupakia watumiaji. Kagua RLS policies.</td></tr>';
  }
}

function zuneRenderUsers(users) {
  const body =
    ZUNE.element("#usersTableBody") ||
    ZUNE.element("#adminUsersBody");

  if (!body) return;

  if (!users.length) {
    body.innerHTML =
      '<tr><td colspan="6">Hakuna watumiaji waliopatikana.</td></tr>';
    return;
  }

  body.innerHTML = users.map(user => `
    <tr data-user-id="${ZUNE.escape(user.id)}">
      <td>${ZUNE.escape(String(user.id).slice(0, 8))}</td>
      <td>${ZUNE.escape(user.full_name || "Bila jina")}</td>
      <td>${ZUNE.escape(user.phone_number || "—")}</td>
      <td>
        <span class="status-badge">${ZUNE.escape(user.role || "buyer")}</span>
      </td>
      <td>${user.is_verified ? "Imethibitishwa" : "Haijathibitishwa"}</td>
      <td>
        <button type="button" data-user-action="verify"
                data-id="${ZUNE.escape(user.id)}"
                data-verified="${String(Boolean(user.is_verified))}">
          ${user.is_verified ? "Ondoa Verified" : "Thibitisha"}
        </button>
        <button type="button" data-user-action="role"
                data-id="${ZUNE.escape(user.id)}"
                data-role="${ZUNE.escape(user.role || "buyer")}">
          Badili Role
        </button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-user-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      if (button.dataset.userAction === "verify") {
        await zuneToggleUserVerification(
          id,
          button.dataset.verified !== "true"
        );
      }

      if (button.dataset.userAction === "role") {
        await zuneChangeUserRole(id, button.dataset.role);
      }
    });
  });
}

async function zuneToggleUserVerification(userId, isVerified) {
  if (userId === zuneAdminSession?.user?.id && !isVerified) {
    ZUNE.toast("Huwezi kuondoa uthibitisho wa akaunti yako hapa.", "error");
    return;
  }

  if (!window.confirm(
    isVerified
      ? "Unataka kuthibitisha akaunti hii?"
      : "Unataka kuondoa uthibitisho wa akaunti hii?"
  )) return;

  try {
    const { error } = await zuneSupabase
      .from("profiles")
      .update({ is_verified: isVerified })
      .eq("id", userId)
      .select("id");

    if (error) throw error;

    ZUNE.toast("Hali ya uthibitisho imesasishwa.", "success");
    await zuneLoadUsers();
    await zuneLoadVerification();
  } catch (error) {
    console.error("Profile verification:", error);
    ZUNE.toast(
      "Imeshindikana kubadili verification. Hakikisha trigger na RLS zinamruhusu admin.",
      "error"
    );
  }
}

async function zuneChangeUserRole(userId, currentRole) {
  if (userId === zuneAdminSession?.user?.id) {
    ZUNE.toast("Usibadili role ya akaunti yako mwenyewe kupitia sehemu hii.", "error");
    return;
  }

  const roles = ["buyer", "vendor", "admin"];
  const promptText =
    `Ingiza role mpya: buyer, vendor, au admin.\nRole ya sasa: ${currentRole}`;

  const newRole = window.prompt(promptText, currentRole);

  if (newRole === null) return;

  const role = newRole.trim().toLowerCase();

  if (!roles.includes(role)) {
    ZUNE.toast("Role si sahihi.", "error");
    return;
  }

  if (role === "admin" &&
      !window.confirm("Una uhakika? Unampa mtumiaji ruhusa za admin.")) {
    return;
  }

  try {
    const { error } = await zuneSupabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select("id");

    if (error) throw error;

    ZUNE.toast("Role ya mtumiaji imesasishwa.", "success");
    await zuneLoadUsers();
  } catch (error) {
    console.error("Change user role:", error);
    ZUNE.toast(
      "Imeshindikana kubadili role. Kagua enum na RLS policies.",
      "error"
    );
  }
}

async function zuneLoadVerification() {
  const body =
    ZUNE.element("#verificationTableBody") ||
    ZUNE.element("#adminVerificationBody");

  if (!body) return;

  body.innerHTML = '<tr><td colspan="5">Inapakia taarifa...</td></tr>';

  try {
    const profiles = await ZUNE.query("profiles", query =>
      query.select("id, full_name, phone_number, role, is_verified, created_at")
        .order("created_at", { ascending: false })
    );

    zuneSetText(
      "#verifiedUsersCount",
      ZUNE.number.format(profiles.filter(profile => profile.is_verified).length)
    );

    zuneSetText(
      "#unverifiedUsersCount",
      ZUNE.number.format(profiles.filter(profile => !profile.is_verified).length)
    );

    const searchInput = ZUNE.element("#verificationSearch");
    const search = searchInput?.value?.trim().toLowerCase() || "";

    const filtered = profiles.filter(profile => {
      const text = [
        profile.full_name,
        profile.phone_number,
        profile.id,
        profile.role
      ].join(" ").toLowerCase();

      return text.includes(search);
    });

    if (!filtered.length) {
      body.innerHTML =
        '<tr><td colspan="5">Hakuna akaunti zinazolingana na utafutaji.</td></tr>';
      return;
    }

    body.innerHTML = filtered.map(profile => `
      <tr>
        <td>${ZUNE.escape(String(profile.id).slice(0, 8))}</td>
        <td>${ZUNE.escape(profile.full_name || "Bila jina")}</td>
        <td>${ZUNE.escape(profile.phone_number || "—")}</td>
        <td>${profile.is_verified ? "Verified" : "Not verified"}</td>
        <td>
          <button type="button" data-verification-toggle="${ZUNE.escape(profile.id)}"
                  data-verified="${String(Boolean(profile.is_verified))}">
            ${profile.is_verified ? "Ondoa" : "Thibitisha"}
          </button>
        </td>
      </tr>
    `).join("");

    body.querySelectorAll("[data-verification-toggle]").forEach(button => {
      button.addEventListener("click", async () => {
        await zuneToggleUserVerification(
          button.dataset.verificationToggle,
          button.dataset.verified !== "true"
        );
      });
    });
  } catch (error) {
    console.error("Verification:", error);
    body.innerHTML =
      '<tr><td colspan="5">Imeshindikana kupakia verification.</td></tr>';
  }
}

function zuneBindVerificationSearch() {
  const search = ZUNE.element("#verificationSearch");

  if (!search || search.dataset.bound === "true") return;

  search.dataset.bound = "true";
  search.addEventListener("input", () => {
    if (zuneCurrentSection === "verification") {
      zuneLoadVerification();
    }
  });
}

/*
  Matangazo na notifications:
  Msimbo huu hukagua kama tables zipo. Hauundi tables, hauhitaji
  kubuni schema, na hauhifadhi matangazo ya kudumu kwenye localStorage.
*/

const ZUNE_ANNOUNCEMENT_TABLE = "admin_announcements";
const ZUNE_NOTIFICATION_TABLE = "notifications";

async function zuneLoadAnnouncements() {
  const container =
    ZUNE.element("#announcementsList") ||
    ZUNE.element("#adminAnnouncementsBody");

  if (!container) return;

  container.innerHTML = '<p>Inapakia matangazo...</p>';

  try {
    const announcements = await ZUNE.query(
      ZUNE_ANNOUNCEMENT_TABLE,
      query => query.select("*").order("created_at", { ascending: false })
    );

    zuneRenderAnnouncements(announcements);
  } catch (error) {
    console.warn("Announcements table may not exist:", error);

    container.innerHTML = `
      <p class="admin-empty-state">
        Jedwali la matangazo halijapatikana au halina ruhusa ya kusomwa.
        Unganisha sehemu hii na schema halisi ya Supabase kabla ya kutuma matangazo.
      </p>
    `;
  }
}

function zuneRenderAnnouncements(announcements) {
  const container =
    ZUNE.element("#announcementsList") ||
    ZUNE.element("#adminAnnouncementsBody");

  if (!container) return;

  if (!announcements.length) {
    container.innerHTML = '<p class="admin-empty-state">Hakuna matangazo bado.</p>';
    return;
  }

  container.innerHTML = announcements.map(item => `
    <article class="admin-announcement-item">
      <div>
        <h3>${ZUNE.escape(item.title || "Tangazo")}</h3>
        <p>${ZUNE.escape(item.message || item.body || "")}</p>
        <small>
          ${ZUNE.escape(item.audience || "—")} ·
          ${ZUNE.escape(item.priority || "normal")} ·
          ${ZUNE.escape(ZUNE.date(item.created_at))}
        </small>
      </div>
      <span class="status-badge">${ZUNE.escape(item.status || "—")}</span>
    </article>
  `).join("");
}

async function zuneLoadNotifications() {
  const container =
    ZUNE.element("#notificationsList") ||
    ZUNE.element("#adminNotificationsBody");

  if (!container) return;

  container.innerHTML = '<p>Inapakia notifications...</p>';

  try {
    const notifications = await ZUNE.query(
      ZUNE_NOTIFICATION_TABLE,
      query => query.select("*").order("created_at", { ascending: false }).limit(100)
    );

    zuneRenderNotifications(notifications);
  } catch (error) {
    console.warn("Notifications table may not exist:", error);

    container.innerHTML = `
      <p class="admin-empty-state">
        Notifications hazijaunganishwa na jedwali linalopatikana kwenye Supabase.
      </p>
    `;
  }
}

function zuneRenderNotifications(notifications) {
  const container =
    ZUNE.element("#notificationsList") ||
    ZUNE.element("#adminNotificationsBody");

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML =
      '<p class="admin-empty-state">Hakuna notifications zilizopatikana.</p>';
    return;
  }

  container.innerHTML = notifications.map(item => `
    <article class="admin-notification-item">
      <div>
        <strong>${ZUNE.escape(item.title || "Notification")}</strong>
        <p>${ZUNE.escape(item.message || item.body || "")}</p>
        <small>${ZUNE.escape(ZUNE.date(item.created_at))}</small>
      </div>
    </article>
  `).join("");
}

function zuneBindAnnouncementForm() {
  const form =
    ZUNE.element("#announcementForm") ||
    ZUNE.element("#adminAnnouncementForm");

  if (!form || form.dataset.bound === "true") return;

  form.dataset.bound = "true";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = String(
      formData.get("title") || formData.get("announcementTitle") || ""
    ).trim();

    const message = String(
      formData.get("message") || formData.get("announcementMessage") || ""
    ).trim();

    if (!title || !message) {
      ZUNE.toast("Weka kichwa na ujumbe wa tangazo.", "error");
      return;
    }

    ZUNE.toast(
      "Fomu imekaguliwa, lakini schema ya matangazo lazima ithibitishwe kabla ya kuhifadhi.",
      "info"
    );
  });
}

function zuneBindModal() {
  const modal = ZUNE.element("#adminModal");
  if (!modal) return;

  ZUNE.all("[data-modal-close], #adminModalClose, #adminModalCancel")
    .forEach(button => {
      button.addEventListener("click", () => {
        modal.classList.remove("open");
        modal.hidden = true;
      });
    });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("open");
      modal.hidden = true;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      modal.classList.remove("open");
      modal.hidden = true;
    }
  });
}

function zuneBindAnnouncementPreview() {
  const titleInput =
    ZUNE.element("#announcementTitle") ||
    ZUNE.element("[name='title']");

  const messageInput =
    ZUNE.element("#announcementMessage") ||
    ZUNE.element("[name='message']");

  const titlePreview = ZUNE.element("#announcementPreviewTitle");
  const messagePreview = ZUNE.element("#announcementPreviewMessage");

  if (titleInput && titlePreview) {
    titleInput.addEventListener("input", () => {
      titlePreview.textContent = titleInput.value.trim() || "Kichwa cha tangazo";
    });
  }

  if (messageInput && messagePreview) {
    messageInput.addEventListener("input", () => {
      messagePreview.textContent =
        messageInput.value.trim() || "Ujumbe wa tangazo utaonekana hapa.";
    });
  }
}

function zuneBindSearchInputs() {
  const productSearch = ZUNE.element("#productSearch");
  const userSearch = ZUNE.element("#userSearch");
  const orderSearch = ZUNE.element("#orderSearch");

  const bindFilter = (input, tableBody) => {
    if (!input || !tableBody || input.dataset.bound === "true") return;

    input.dataset.bound = "true";

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();

      tableBody.querySelectorAll("tr").forEach(row => {
        row.hidden = !row.textContent.toLowerCase().includes(query);
      });
    });
  };

  bindFilter(
    productSearch,
    ZUNE.element("#productsTableBody") || ZUNE.element("#adminProductsBody")
  );

  bindFilter(
    userSearch,
    ZUNE.element("#usersTableBody") || ZUNE.element("#adminUsersBody")
  );

  bindFilter(
    orderSearch,
    ZUNE.element("#ordersTableBody") || ZUNE.element("#adminOrdersBody")
  );
}

function zuneBindSettings() {
  const passwordForm =
    ZUNE.element("#adminPasswordForm") ||
    ZUNE.element("#changePasswordForm");

  if (passwordForm && passwordForm.dataset.bound !== "true") {
    passwordForm.dataset.bound = "true";

    passwordForm.addEventListener("submit", async event => {
      event.preventDefault();

      const formData = new FormData(passwordForm);
      const password = String(
        formData.get("password") ||
        formData.get("newPassword") ||
        ""
      );

      const confirmPassword = String(
        formData.get("confirmPassword") ||
        formData.get("passwordConfirmation") ||
        ""
      );

      if (password.length < 8) {
        ZUNE.toast("Password mpya iwe na angalau herufi 8.", "error");
        return;
      }

      if (password !== confirmPassword) {
        ZUNE.toast("Password ulizoweka hazifanani.", "error");
        return;
      }

      try {
        const { error } = await zuneSupabase.auth.updateUser({
          password
        });

        if (error) throw error;

        passwordForm.reset();
        ZUNE.toast("Password imesasishwa.", "success");
      } catch (error) {
        console.error("Password update:", error);
        ZUNE.toast(
          "Imeshindikana kusasisha password. Ingia tena ikiwa session imeisha.",
          "error"
        );
      }
    });
  }

  const reloadButtons = ZUNE.all(
    "[data-admin-refresh], #refreshDashboard, #reloadDashboard"
  );

  reloadButtons.forEach(button => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      zuneRefreshCurrentSection();
    });
  });
}

function zuneBindForms() {
  const loginForm =
    ZUNE.element("#adminLoginForm") ||
    ZUNE.element("#adminLogin");

  if (loginForm && loginForm.dataset.bound !== "true") {
    loginForm.dataset.bound = "true";
    loginForm.addEventListener("submit", zuneAdminLogin);
  }

  zuneBindAnnouncementForm();
  zuneBindAnnouncementPreview();
  zuneBindVerificationSearch();
  zuneBindSettings();
  zuneBindSearchInputs();
}

async function zuneInitializeAdmin() {
  const loginPanel = ZUNE.element("#adminLoginPanel");
  const dashboard = ZUNE.element("#adminDashboard");

  if (loginPanel) loginPanel.hidden = false;
  if (dashboard) dashboard.hidden = true;

  if (!window.supabase?.createClient) {
    ZUNE.message(
      "#loginMessage",
      "Supabase SDK haijapakiwa. Hakikisha script ya Supabase ipo kwenye admin.html.",
      "error"
    );
    return;
  }

  try {
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

    zuneBindNavigation();
    zuneBindForms();
    zuneBindModal();

    const { data, error } = await zuneSupabase.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      zuneShowLogin();
      return;
    }

    try {
      await zuneVerifyAdmin(data.session);
      zuneShowDashboard();
      zuneUpdateAdminIdentity();
      zuneOpenSection("overview");
    } catch (error) {
      console.warn("Current session is not an admin:", error);
      zuneShowLogin();

      ZUNE.message(
        "#loginMessage",
        error.message || "Tafadhali ingia kwa akaunti ya admin.",
        "error"
      );
    }

    zuneSupabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        zuneAdminSession = null;
        zuneAdminProfile = null;
        zuneShowLogin();
      }
    });
  } catch (error) {
    console.error("ZUNE Admin initialization:", error);

    ZUNE.message(
      "#loginMessage",
      "Imeshindikana kuanzisha Admin Dashboard. Kagua Supabase URL, publishable key na mtandao.",
      "error"
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", zuneInitializeAdmin);
} else {
  zuneInitializeAdmin();
}
