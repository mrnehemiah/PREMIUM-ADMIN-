
/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 1/7
   Supabase + Authentication + Core Helpers
========================================================= */

"use strict";

/* ===============================
   1. SUPABASE CONFIGURATION
================================ */

const ZUNE_ADMIN_CONFIG = {
  url: window.SUPABASE_URL,
  anonKey: window.SUPABASE_ANON_KEY
};

if (!window.supabase || !window.supabase.createClient) {
  throw new Error("Supabase library haijapakiwa.");
}

if (!ZUNE_ADMIN_CONFIG.url || !ZUNE_ADMIN_CONFIG.anonKey) {
  throw new Error(
    "SUPABASE_URL au SUPABASE_ANON_KEY haijawekwa."
  );
}

/* ===============================
   2. CREATE SUPABASE CLIENT
================================ */

const adminDB = window.supabase.createClient(
  ZUNE_ADMIN_CONFIG.url,
  ZUNE_ADMIN_CONFIG.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.zuneAdminDB = adminDB;

/* ===============================
   3. GLOBAL ADMIN STATE
================================ */

const ZUNE_ADMIN = {
  user: null,
  profile: null,
  session: null,

  currentPage: "overview",
  currentSeller: null,

  isAuthenticated: false,
  isLoading: false,

  cache: {
    users: [],
    sellers: [],
    applications: [],
    products: [],
    orders: [],
    transactions: [],
    disputes: [],
    auditLogs: []
  }
};

window.ZUNE_ADMIN = ZUNE_ADMIN;

/* ===============================
   4. DOM HELPERS
================================ */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  document.querySelectorAll(selector);

const adminElement = (id) =>
  document.getElementById(id);

function adminText(id, value) {
  const element = adminElement(id);

  if (element) {
    element.textContent =
      value === null || value === undefined
        ? "—"
        : String(value);
  }
}

function adminHTML(id, html) {
  const element = adminElement(id);

  if (element) {
    element.innerHTML = html;
  }
}

/* ===============================
   5. GLOBAL MESSAGE SYSTEM
================================ */

function showAdminMessage(message, type = "info") {
  const element = adminElement("globalMessage");

  if (!element) {
    console.log("[ZUNE ADMIN]", message);
    return;
  }

  element.textContent = message;
  element.className = `global-message ${type}`;
  element.style.display = "block";

  clearTimeout(window.zuneAdminMessageTimer);

  window.zuneAdminMessageTimer = setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

window.showAdminMessage = showAdminMessage;

/* ===============================
   6. FORMAT HELPERS
================================ */

function formatTZS(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatAdminDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("sw-TZ", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeAdminHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}

function adminInitials(value) {
  return String(value || "Admin")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}

/* ===============================
   7. AUTHENTICATION CHECK
================================ */

async function verifyZuneAdmin() {
  try {
    const {
      data: { session },
      error: sessionError
    } = await adminDB.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session || !session.user) {
      throw new Error("Hujaingia kwenye akaunti.");
    }

    const user = session.user;

    const {
      data: profile,
      error: profileError
    } = await adminDB
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      await adminDB.auth.signOut();

      throw new Error(
        "Huna ruhusa ya kuingia ZUNE ADMIN."
      );
    }

    ZUNE_ADMIN.user = user;
    ZUNE_ADMIN.profile = profile;
    ZUNE_ADMIN.session = session;
    ZUNE_ADMIN.isAuthenticated = true;

    adminText(
      "adminName",
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Admin Mkuu"
    );

    const avatar = adminElement("adminAvatar");

    if (avatar) {
      avatar.textContent = adminInitials(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email
      );
    }

    return true;

  } catch (error) {
    console.error("ZUNE ADMIN AUTH:", error);

    ZUNE_ADMIN.isAuthenticated = false;

    showAdminMessage(
      error.message || "Imeshindikana kuthibitisha Admin.",
      "error"
    );

    return false;
  }
}

/* ===============================
   8. AUTH STATE LISTENER
================================ */

adminDB.auth.onAuthStateChange(
  async (event, session) => {
    if (event === "SIGNED_OUT") {
      ZUNE_ADMIN.isAuthenticated = false;
      ZUNE_ADMIN.user = null;
      ZUNE_ADMIN.profile = null;

      window.location.href = "login.html";
    }

    if (event === "TOKEN_REFRESHED") {
      ZUNE_ADMIN.session = session;
    }
  }
);

/* ===============================
   9. ADMIN AUTH GUARD
================================ */

function requireZuneAdmin() {
  if (!ZUNE_ADMIN.isAuthenticated) {
    showAdminMessage(
      "Ruhusa ya Admin haijathibitishwa.",
      "error"
    );

    return false;
  }

  return true;
}

/* ===============================
   10. INITIALIZE ADMIN
================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const authenticated = await verifyZuneAdmin();

  if (!authenticated) {
    return;
  }

  console.log("ZUNE PREMIUM ADMIN READY");

  document.dispatchEvent(
    new CustomEvent("zune:admin-authenticated", {
      detail: {
        userId: ZUNE_ADMIN.user.id,
        role: ZUNE_ADMIN.profile.role
      }
    })
  );

  document.dispatchEvent(
    new Event("zune:admin-refresh")
  );
});

/* =========================================================
   MWISHO WA SEHEMU YA 1/7
========================================================= */

/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 2/7
   Dashboard + Users + Sellers
========================================================= */

/* ===============================
   1. DASHBOARD STATISTICS
================================ */

async function loadAdminDashboard() {
  if (!requireZuneAdmin()) return;

  try {
    const [
      usersResult,
      sellersResult,
      productsResult,
      ordersResult
    ] = await Promise.all([

      adminDB
        .from("profiles")
        .select("id", { count: "exact", head: true }),

      adminDB
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "vendor"),

      adminDB
        .from("products")
        .select("id", { count: "exact", head: true }),

      adminDB
        .from("orders")
        .select("id", { count: "exact", head: true })
    ]);

    const results = [
      usersResult,
      sellersResult,
      productsResult,
      ordersResult
    ];

    const failed = results.find(result => result.error);

    if (failed) throw failed.error;

    adminText("totalUsers", usersResult.count ?? 0);
    adminText("totalSellers", sellersResult.count ?? 0);
    adminText("totalProducts", productsResult.count ?? 0);
    adminText("totalOrders", ordersResult.count ?? 0);

    return {
      users: usersResult.count ?? 0,
      sellers: sellersResult.count ?? 0,
      products: productsResult.count ?? 0,
      orders: ordersResult.count ?? 0
    };

  } catch (error) {
    console.error("Dashboard error:", error);

    showAdminMessage(
      "Imeshindwa kupakia takwimu za dashboard: " +
      error.message,
      "error"
    );
  }
}

/* ===============================
   2. LOAD ALL USERS
================================ */

async function loadAdminUsers() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("usersTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia watumiaji...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.users = data || [];

    renderAdminUsers(ZUNE_ADMIN.cache.users);

    adminText("usersCount", data.length);

  } catch (error) {
    console.error("Users error:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia watumiaji.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la kupakia watumiaji: " + error.message,
      "error"
    );
  }
}

/* ===============================
   3. RENDER USERS TABLE
================================ */

function renderAdminUsers(users) {
  const tbody = adminElement("usersTableBody");

  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna watumiaji waliopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(user => {

    const name =
      user.full_name ||
      user.name ||
      user.username ||
      "Haijawekwa";

    const email = user.email || "—";
    const role = user.role || "buyer";

    const verified = user.is_verified === true;

    return `
      <tr>
        <td>${escapeAdminHTML(user.id)}</td>

        <td>${escapeAdminHTML(name)}</td>

        <td>${escapeAdminHTML(email)}</td>

        <td>
          <span class="status-badge">
            ${escapeAdminHTML(role)}
          </span>
        </td>

        <td>
          ${verified ? "Imethibitishwa" : "Haijathibitishwa"}
        </td>

        <td>
          ${formatAdminDate(user.created_at)}
        </td>

        <td>
          <button
            type="button"
            onclick="viewAdminUser('${escapeAdminHTML(user.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;

  }).join("");
}

/* ===============================
   4. SEARCH USERS
================================ */

function searchAdminUsers(keyword) {
  const search = String(keyword || "")
    .trim()
    .toLowerCase();

  const filtered = ZUNE_ADMIN.cache.users.filter(user => {

    const values = [
      user.id,
      user.full_name,
      user.name,
      user.username,
      user.email,
      user.role
    ];

    return values.some(value =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });

  renderAdminUsers(filtered);
}

/* ===============================
   5. FILTER USERS BY ROLE
================================ */

function filterAdminUsers(role) {
  if (!role || role === "all") {
    renderAdminUsers(ZUNE_ADMIN.cache.users);
    return;
  }

  const filtered = ZUNE_ADMIN.cache.users.filter(
    user => user.role === role
  );

  renderAdminUsers(filtered);
}

/* ===============================
   6. VIEW USER DETAILS
================================ */

async function viewAdminUser(userId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Mtumiaji hakupatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentUser = data;

    const modal = adminElement("userDetailsModal");

    if (modal) {
      modal.style.display = "flex";

      adminText("userDetailName",
        data.full_name || data.name || data.username || "—");

      adminText("userDetailEmail", data.email || "—");
      adminText("userDetailRole", data.role || "—");
      adminText("userDetailPhone", data.phone || "—");
      adminText("userDetailId", data.id || "—");
      adminText("userDetailCreated", formatAdminDate(data.created_at));
      adminText(
        "userDetailVerification",
        data.is_verified ? "Verified" : "Not verified"
      );
    }

    document.dispatchEvent(
      new CustomEvent("zune:user-viewed", {
        detail: { userId }
      })
    );

  } catch (error) {
    console.error("User details error:", error);

    showAdminMessage(
      "Imeshindwa kupata taarifa za mtumiaji.",
      "error"
    );
  }
}

/* ===============================
   7. CLOSE USER MODAL
================================ */

function closeAdminUserModal() {
  const modal = adminElement("userDetailsModal");

  if (modal) {
    modal.style.display = "none";
  }
}

/* ===============================
   8. LOAD SELLERS
================================ */

async function loadAdminSellers() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("sellersTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia sellers...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("profiles")
      .select("*")
      .eq("role", "vendor")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.sellers = data || [];

    renderAdminSellers(ZUNE_ADMIN.cache.sellers);

    adminText("sellersCount", data.length);

  } catch (error) {
    console.error("Sellers error:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia sellers.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la kupakia sellers: " + error.message,
      "error"
    );
  }
}

/* ===============================
   9. RENDER SELLERS TABLE
================================ */

function renderAdminSellers(sellers) {
  const tbody = adminElement("sellersTableBody");

  if (!tbody) return;

  if (!sellers || sellers.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna seller aliyepatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = sellers.map(seller => {

    const name =
      seller.store_name ||
      seller.full_name ||
      seller.name ||
      seller.username ||
      "Seller";

    const verified = seller.is_verified === true;

    return `
      <tr>
        <td>${escapeAdminHTML(seller.id)}</td>

        <td>
          ${escapeAdminHTML(name)}
          ${verified ? '<span class="verified-badge">✓ Verified</span>' : ""}
        </td>

        <td>${escapeAdminHTML(seller.email || "—")}</td>

        <td>
          ${verified ? "Verified" : "Pending"}
        </td>

        <td>${formatAdminDate(seller.created_at)}</td>

        <td>${escapeAdminHTML(seller.phone || "—")}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminSeller('${escapeAdminHTML(seller.id)}')">
            Angalia maelezo
          </button>
        </td>
      </tr>
    `;

  }).join("");
}

/* ===============================
   10. VIEW SELLER DETAILS
================================ */

async function viewAdminSeller(sellerId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .eq("role", "vendor")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Seller hakupatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentSeller = data;

    document.dispatchEvent(
      new CustomEvent("zune:seller-selected", {
        detail: { seller: data }
      })
    );

    adminText(
      "sellerDetailName",
      data.store_name || data.full_name || data.name || "Seller"
    );

    adminText("sellerDetailEmail", data.email || "—");
    adminText("sellerDetailPhone", data.phone || "—");
    adminText("sellerDetailId", data.id || "—");

    adminText(
      "sellerDetailVerification",
      data.is_verified ? "Verified" : "Not verified"
    );

    adminText(
      "sellerDetailCreated",
      formatAdminDate(data.created_at)
    );

    const detailPage = adminElement("sellerDetailsPage");

    if (detailPage) {
      detailPage.style.display = "block";
    }

  } catch (error) {
    console.error("Seller details error:", error);

    showAdminMessage(
      "Imeshindwa kufungua maelezo ya seller.",
      "error"
    );
  }
}

/* ===============================
   11. SEARCH SELLERS
================================ */

function searchAdminSellers(keyword) {
  const search = String(keyword || "")
    .trim()
    .toLowerCase();

  const filtered = ZUNE_ADMIN.cache.sellers.filter(seller => {

    const values = [
      seller.id,
      seller.store_name,
      seller.full_name,
      seller.name,
      seller.username,
      seller.email,
      seller.phone
    ];

    return values.some(value =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });

  renderAdminSellers(filtered);
}

/* ===============================
   12. FILTER SELLER VERIFICATION
================================ */

function filterAdminSellers(status) {
  let filtered = ZUNE_ADMIN.cache.sellers;

  if (status === "verified") {
    filtered = filtered.filter(
      seller => seller.is_verified === true
    );
  }

  if (status === "unverified") {
    filtered = filtered.filter(
      seller => seller.is_verified !== true
    );
  }

  renderAdminSellers(filtered);
}

/* ===============================
   13. REFRESH DASHBOARD
================================ */

async function refreshAdminDashboard() {
  if (!requireZuneAdmin()) return;

  await loadAdminDashboard();

  showAdminMessage(
    "Dashboard imesasishwa.",
    "success"
  );
}

/* ===============================
   14. GLOBAL EXPORTS
================================ */

window.loadAdminDashboard = loadAdminDashboard;
window.loadAdminUsers = loadAdminUsers;
window.renderAdminUsers = renderAdminUsers;
window.searchAdminUsers = searchAdminUsers;
window.filterAdminUsers = filterAdminUsers;
window.viewAdminUser = viewAdminUser;
window.closeAdminUserModal = closeAdminUserModal;

window.loadAdminSellers = loadAdminSellers;
window.renderAdminSellers = renderAdminSellers;
window.viewAdminSeller = viewAdminSeller;
window.searchAdminSellers = searchAdminSellers;
window.filterAdminSellers = filterAdminSellers;

window.refreshAdminDashboard = refreshAdminDashboard;

/* =========================================================
   MWISHO WA SEHEMU YA 2/7
========================================================= */

/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 3/7
   Seller Applications + Products + Categories
========================================================= */


/* =========================================================
   1. SELLER APPLICATIONS
========================================================= */

/*
  MUHIMU:
  Kabla ya kutumia sehemu hii, thibitisha majina halisi
  ya jedwali na columns za maombi ya seller kwenye Supabase.

  Jina la jedwali lililotumika kwa sasa:
  seller_applications

  Status zinazotarajiwa:
  pending, approved, rejected
*/


async function loadSellerApplications() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("sellerApplicationsBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="6">Inapakia maombi...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.applications = data || [];

    renderSellerApplications(data || []);

    adminText("sellerApplicationsCount", data.length);

  } catch (error) {
    console.error("Seller applications:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="6">Imeshindwa kupakia maombi. Hakiki jedwali la seller_applications.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la maombi ya seller: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   2. RENDER SELLER APPLICATIONS
========================================================= */

function renderSellerApplications(applications) {
  const tbody = adminElement("sellerApplicationsBody");

  if (!tbody) return;

  if (!applications.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">Hakuna maombi yaliyopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = applications.map(application => {

    const applicantId =
      application.user_id ||
      application.profile_id ||
      application.id;

    const name =
      application.store_name ||
      application.full_name ||
      application.business_name ||
      "Mwombaji";

    const status = application.status || "pending";

    return `
      <tr>
        <td>${escapeAdminHTML(applicantId)}</td>

        <td>${escapeAdminHTML(name)}</td>

        <td>${escapeAdminHTML(application.email || "—")}</td>

        <td>
          <span class="status-badge">
            ${escapeAdminHTML(status)}
          </span>
        </td>

        <td>${formatAdminDate(application.created_at)}</td>

        <td>
          <button
            type="button"
            onclick="viewSellerApplication('${escapeAdminHTML(application.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   3. VIEW APPLICATION DETAILS
========================================================= */

async function viewSellerApplication(applicationId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("seller_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Ombi halijapatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentApplication = data;

    adminText(
      "applicationStoreName",
      data.store_name || data.business_name || "—"
    );

    adminText(
      "applicationApplicantName",
      data.full_name || data.name || "—"
    );

    adminText("applicationEmail", data.email || "—");
    adminText("applicationPhone", data.phone || "—");
    adminText("applicationStatus", data.status || "pending");

    adminText(
      "applicationDate",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("sellerApplicationModal");

    if (modal) modal.style.display = "flex";

    document.dispatchEvent(
      new CustomEvent("zune:application-viewed", {
        detail: { applicationId }
      })
    );

  } catch (error) {
    console.error("Application details:", error);

    showAdminMessage(
      "Imeshindwa kufungua maelezo ya ombi.",
      "error"
    );
  }
}


/* =========================================================
   4. APPROVE SELLER APPLICATION
========================================================= */

/*
  Usibadilishe role au is_verified moja kwa moja kutoka
  browser bila server-side authorization.

  Tumia Supabase RPC inayothibitisha Admin Mkuu,
  kuhakiki ombi na kurekodi sababu pamoja na audit log.

  RPC inayotarajiwa:
  admin_review_seller_application

  Parameters:
  p_application_id
  p_decision
  p_reason
*/

async function reviewSellerApplication(
  applicationId,
  decision,
  reason
) {
  if (!requireZuneAdmin()) return;

  const allowedDecisions = ["approved", "rejected"];

  if (!allowedDecisions.includes(decision)) {
    showAdminMessage("Uamuzi si sahihi.", "error");
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika sababu ya uamuzi kwa maelezo ya kutosha.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `Unathibitisha ${decision} ombi hili?`
  );

  if (!confirmed) return;

  try {
    const { data, error } = await adminDB.rpc(
      "admin_review_seller_application",
      {
        p_application_id: applicationId,
        p_decision: decision,
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Uamuzi umetekelezwa.",
      "success"
    );

    await loadSellerApplications();
    await loadAdminSellers();

    document.dispatchEvent(
      new CustomEvent("zune:application-reviewed", {
        detail: {
          applicationId,
          decision
        }
      })
    );

    return data;

  } catch (error) {
    console.error("Application review:", error);

    showAdminMessage(
      "Imeshindwa kutekeleza uamuzi: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   5. CLOSE APPLICATION MODAL
========================================================= */

function closeSellerApplicationModal() {
  const modal = adminElement("sellerApplicationModal");

  if (modal) modal.style.display = "none";
}


/* =========================================================
   6. LOAD PRODUCTS
========================================================= */

async function loadAdminProducts() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("productsTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia bidhaa...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.products = data || [];

    renderAdminProducts(data || []);

    adminText("productsCount", data.length);

  } catch (error) {
    console.error("Products:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia bidhaa.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la kupakia bidhaa: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   7. RENDER PRODUCTS
========================================================= */

function renderAdminProducts(products) {
  const tbody = adminElement("productsTableBody");

  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna bidhaa zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(product => {

    const name =
      product.name ||
      product.title ||
      "Bidhaa";

    const price =
      product.price === undefined
        ? "—"
        : formatTZS(product.price);

    const status =
      product.status ||
      (product.is_active === false ? "inactive" : "active");

    return `
      <tr>
        <td>${escapeAdminHTML(product.id)}</td>

        <td>${escapeAdminHTML(name)}</td>

        <td>${escapeAdminHTML(product.seller_id || product.user_id || "—")}</td>

        <td>${escapeAdminHTML(price)}</td>

        <td>${escapeAdminHTML(status)}</td>

        <td>${formatAdminDate(product.created_at)}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminProduct('${escapeAdminHTML(product.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   8. VIEW PRODUCT DETAILS
========================================================= */

async function viewAdminProduct(productId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Bidhaa haijapatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentProduct = data;

    adminText(
      "productDetailName",
      data.name || data.title || "—"
    );

    adminText("productDetailId", data.id);
    adminText("productDetailPrice", formatTZS(data.price));
    adminText("productDetailSeller", data.seller_id || data.user_id || "—");
    adminText("productDetailStatus", data.status || "—");
    adminText(
      "productDetailCreated",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("productDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Product details:", error);

    showAdminMessage(
      "Imeshindwa kufungua bidhaa.",
      "error"
    );
  }
}


/* =========================================================
   9. PRODUCT SEARCH
========================================================= */

function searchAdminProducts(keyword) {
  const search = String(keyword || "").toLowerCase().trim();

  const filtered = ZUNE_ADMIN.cache.products.filter(product => {

    const values = [
      product.id,
      product.name,
      product.title,
      product.seller_id,
      product.user_id,
      product.status
    ];

    return values.some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminProducts(filtered);
}


/* =========================================================
   10. FILTER PRODUCTS
========================================================= */

function filterAdminProducts(status) {
  let filtered = ZUNE_ADMIN.cache.products;

  if (status && status !== "all") {
    filtered = filtered.filter(product => {
      const currentStatus =
        product.status ||
        (product.is_active === false ? "inactive" : "active");

      return currentStatus === status;
    });
  }

  renderAdminProducts(filtered);
}


/* =========================================================
   11. LOAD CATEGORIES
========================================================= */

/*
  Jedwali la categories lazima lithibitishwe kwenye
  Supabase kabla ya matumizi ya production.
*/

async function loadAdminCategories() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("categoriesTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="5">Inapakia categories...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.categories = data || [];

    renderAdminCategories(data || []);

    adminText("categoriesCount", data.length);

  } catch (error) {
    console.error("Categories:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="5">Imeshindwa kupakia categories. Hakiki jedwali la categories.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la categories: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   12. RENDER CATEGORIES
========================================================= */

function renderAdminCategories(categories) {
  const tbody = adminElement("categoriesTableBody");

  if (!tbody) return;

  if (!categories.length) {
    tbody.innerHTML =
      `<tr><td colspan="5">Hakuna categories.</td></tr>`;
    return;
  }

  tbody.innerHTML = categories.map(category => {

    return `
      <tr>
        <td>${escapeAdminHTML(category.id)}</td>

        <td>${escapeAdminHTML(category.name || category.title || "—")}</td>

        <td>${escapeAdminHTML(category.description || "—")}</td>

        <td>${formatAdminDate(category.created_at)}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminCategory('${escapeAdminHTML(category.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   13. VIEW CATEGORY
========================================================= */

async function viewAdminCategory(categoryId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Category haijapatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentCategory = data;

    adminText(
      "categoryDetailName",
      data.name || data.title || "—"
    );

    adminText("categoryDetailDescription", data.description || "—");
    adminText("categoryDetailId", data.id);

    const modal = adminElement("categoryDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Category details:", error);

    showAdminMessage(
      "Imeshindwa kufungua category.",
      "error"
    );
  }
}


/* =========================================================
   14. GLOBAL EXPORTS
========================================================= */

window.loadSellerApplications = loadSellerApplications;
window.renderSellerApplications = renderSellerApplications;
window.viewSellerApplication = viewSellerApplication;
window.reviewSellerApplication = reviewSellerApplication;
window.closeSellerApplicationModal = closeSellerApplicationModal;

window.loadAdminProducts = loadAdminProducts;
window.renderAdminProducts = renderAdminProducts;
window.viewAdminProduct = viewAdminProduct;
window.searchAdminProducts = searchAdminProducts;
window.filterAdminProducts = filterAdminProducts;

window.loadAdminCategories = loadAdminCategories;
window.renderAdminCategories = renderAdminCategories;
window.viewAdminCategory = viewAdminCategory;


/* =========================================================
   MWISHO WA SEHEMU YA 3/7
========================================================= */

/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 4/7
   Orders + Deliveries + Payments + Wallet
========================================================= */


/* =========================================================
   1. LOAD ORDERS
========================================================= */

async function loadAdminOrders() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("ordersTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia orders...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.orders = data || [];

    renderAdminOrders(data || []);

    adminText("ordersCount", data.length);

  } catch (error) {
    console.error("Orders:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia orders.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la orders: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   2. RENDER ORDERS
========================================================= */

function renderAdminOrders(orders) {
  const tbody = adminElement("ordersTableBody");

  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna orders zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {

    const orderNumber =
      order.order_number ||
      order.reference ||
      order.id;

    const amount =
      order.total_amount ??
      order.total ??
      order.amount ??
      0;

    return `
      <tr>
        <td>${escapeAdminHTML(orderNumber)}</td>

        <td>${escapeAdminHTML(order.user_id || order.buyer_id || "—")}</td>

        <td>${escapeAdminHTML(order.seller_id || "—")}</td>

        <td>${formatTZS(amount)}</td>

        <td>${escapeAdminHTML(order.status || "—")}</td>

        <td>${formatAdminDate(order.created_at)}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminOrder('${escapeAdminHTML(order.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   3. ORDER DETAILS
========================================================= */

async function viewAdminOrder(orderId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Order haijapatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentOrder = data;

    adminText("orderDetailId", data.id);

    adminText(
      "orderDetailNumber",
      data.order_number || data.reference || data.id
    );

    adminText(
      "orderDetailBuyer",
      data.user_id || data.buyer_id || "—"
    );

    adminText("orderDetailSeller", data.seller_id || "—");

    adminText(
      "orderDetailAmount",
      formatTZS(
        data.total_amount ??
        data.total ??
        data.amount ??
        0
      )
    );

    adminText("orderDetailStatus", data.status || "—");

    adminText(
      "orderDetailDate",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("orderDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Order details:", error);

    showAdminMessage(
      "Imeshindwa kufungua maelezo ya order.",
      "error"
    );
  }
}


/* =========================================================
   4. SEARCH AND FILTER ORDERS
========================================================= */

function searchAdminOrders(keyword) {
  const search = String(keyword || "").toLowerCase().trim();

  const filtered = ZUNE_ADMIN.cache.orders.filter(order => {

    const values = [
      order.id,
      order.order_number,
      order.reference,
      order.user_id,
      order.buyer_id,
      order.seller_id,
      order.status
    ];

    return values.some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminOrders(filtered);
}

function filterAdminOrders(status) {
  let filtered = ZUNE_ADMIN.cache.orders;

  if (status && status !== "all") {
    filtered = filtered.filter(
      order => order.status === status
    );
  }

  renderAdminOrders(filtered);
}


/* =========================================================
   5. LOAD DELIVERIES
========================================================= */

async function loadAdminDeliveries() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("deliveriesTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="6">Inapakia deliveries...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.deliveries = data || [];

    renderAdminDeliveries(data || []);

    adminText("deliveriesCount", data.length);

  } catch (error) {
    console.error("Deliveries:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="6">Imeshindwa kupakia deliveries. Hakiki jedwali la deliveries.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la deliveries: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   6. RENDER DELIVERIES
========================================================= */

function renderAdminDeliveries(deliveries) {
  const tbody = adminElement("deliveriesTableBody");

  if (!tbody) return;

  if (!deliveries.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">Hakuna deliveries zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = deliveries.map(delivery => {

    return `
      <tr>
        <td>${escapeAdminHTML(delivery.id)}</td>

        <td>${escapeAdminHTML(delivery.order_id || "—")}</td>

        <td>${escapeAdminHTML(delivery.courier_name || delivery.courier_id || "—")}</td>

        <td>${escapeAdminHTML(delivery.status || "—")}</td>

        <td>${formatAdminDate(delivery.created_at)}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminDelivery('${escapeAdminHTML(delivery.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   7. DELIVERY DETAILS
========================================================= */

async function viewAdminDelivery(deliveryId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage("Delivery haijapatikana.", "error");
      return;
    }

    ZUNE_ADMIN.currentDelivery = data;

    adminText("deliveryDetailId", data.id);
    adminText("deliveryOrderId", data.order_id || "—");
    adminText("deliveryStatus", data.status || "—");

    adminText(
      "deliveryCourier",
      data.courier_name || data.courier_id || "—"
    );

    adminText(
      "deliveryCreated",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("deliveryDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Delivery details:", error);

    showAdminMessage(
      "Imeshindwa kufungua delivery.",
      "error"
    );
  }
}


/* =========================================================
   8. LOAD PAYMENTS
========================================================= */

async function loadAdminPayments() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("paymentsTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia payments...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.payments = data || [];

    renderAdminPayments(data || []);

    adminText("paymentsCount", data.length);

  } catch (error) {
    console.error("Payments:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia payments. Hakiki jedwali la payments.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la payments: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   9. RENDER PAYMENTS
========================================================= */

function renderAdminPayments(payments) {
  const tbody = adminElement("paymentsTableBody");

  if (!tbody) return;

  if (!payments.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna payments zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = payments.map(payment => {

    const amount =
      payment.amount ??
      payment.total_amount ??
      0;

    return `
      <tr>
        <td>${escapeAdminHTML(payment.id)}</td>

        <td>${escapeAdminHTML(payment.order_id || "—")}</td>

        <td>${escapeAdminHTML(payment.user_id || payment.buyer_id || "—")}</td>

        <td>${formatTZS(amount)}</td>

        <td>${escapeAdminHTML(payment.payment_method || "—")}</td>

        <td>${escapeAdminHTML(payment.status || "—")}</td>

        <td>${formatAdminDate(payment.created_at)}</td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   10. LOAD WALLET ACCOUNTS
========================================================= */

/*
  Jedwali la wallet accounts linahitaji kuthibitishwa.
  Kwa sasa tunatumia admin_wallets kama jina la mfano.
*/

async function loadAdminWallets() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("walletAccountsBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="5">Inapakia wallet...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("admin_wallets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.wallets = data || [];

    renderAdminWallets(data || []);

  } catch (error) {
    console.error("Wallets:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="5">Imeshindwa kupakia wallet. Hakiki jina la jedwali.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la wallet: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   11. RENDER WALLET ACCOUNTS
========================================================= */

function renderAdminWallets(wallets) {
  const tbody = adminElement("walletAccountsBody");

  if (!tbody) return;

  if (!wallets.length) {
    tbody.innerHTML =
      `<tr><td colspan="5">Hakuna wallet zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = wallets.map(wallet => {

    const balance =
      wallet.balance ??
      wallet.available_balance ??
      0;

    return `
      <tr>
        <td>${escapeAdminHTML(wallet.id)}</td>

        <td>${escapeAdminHTML(wallet.user_id || "—")}</td>

        <td>${formatTZS(balance)}</td>

        <td>${escapeAdminHTML(wallet.status || "—")}</td>

        <td>${formatAdminDate(wallet.created_at)}</td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   12. LOAD WALLET TRANSACTIONS
========================================================= */

async function loadAdminWalletTransactions() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("walletTransactionsBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia transactions...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("admin_wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.transactions = data || [];

    renderAdminWalletTransactions(data || []);

  } catch (error) {
    console.error("Wallet transactions:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia transactions.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la wallet transactions: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   13. RENDER WALLET TRANSACTIONS
========================================================= */

function renderAdminWalletTransactions(transactions) {
  const tbody = adminElement("walletTransactionsBody");

  if (!tbody) return;

  if (!transactions.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna transactions.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(transaction => {

    const amount =
      transaction.amount ??
      transaction.total_amount ??
      0;

    return `
      <tr>
        <td>${escapeAdminHTML(transaction.id)}</td>

        <td>${escapeAdminHTML(transaction.reference || "—")}</td>

        <td>${escapeAdminHTML(transaction.user_id || "—")}</td>

        <td>${escapeAdminHTML(transaction.type || "—")}</td>

        <td>${formatTZS(amount)}</td>

        <td>${escapeAdminHTML(transaction.status || "—")}</td>

        <td>${formatAdminDate(transaction.created_at)}</td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   14. ZUNE COMMISSION CALCULATOR
========================================================= */

/*
  ZUNE commission = 3% ya mauzo.

  Huu ni ukokotoaji wa makadirio tu.
  Commission halisi lazima ihesabiwe server-side
  wakati transaction inathibitishwa.
*/

const ZUNE_COMMISSION_RATE = 0.03;

function calculateZuneCommission(salesAmount) {
  const amount = Number(salesAmount || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Kiasi cha mauzo si sahihi.");
  }

  const commission = Math.round(
    amount * ZUNE_COMMISSION_RATE
  );

  const sellerReceives = amount - commission;

  return {
    sales: amount,
    commissionRate: 3,
    zuneCommission: commission,
    sellerReceives
  };
}


/* =========================================================
   15. DISPLAY COMMISSION
========================================================= */

function displayZuneCommission(salesAmount) {
  const result = calculateZuneCommission(salesAmount);

  adminText(
    "commissionSales",
    formatTZS(result.sales)
  );

  adminText(
    "commissionRate",
    "3%"
  );

  adminText(
    "commissionAmount",
    formatTZS(result.zuneCommission)
  );

  adminText(
    "sellerReceives",
    formatTZS(result.sellerReceives)
  );

  return result;
}


/* =========================================================
   16. COMMISSION REPORT
========================================================= */

async function loadZuneCommissionReport() {
  if (!requireZuneAdmin()) return;

  /*
    Ripoti hii itatumia orders zilizorudishwa na
    database. Hakikisha total_amount ndiyo column
    halisi ya kiasi cha order kabla ya kuitumia.
  */

  try {
    const { data, error } = await adminDB
      .from("orders")
      .select("*")
      .limit(5000);

    if (error) throw error;

    const completedOrders = (data || []).filter(order => {
      return String(order.status || "").toLowerCase() === "completed";
    });

    const totalSales = completedOrders.reduce(
      (sum, order) => {
        const amount = Number(
          order.total_amount ??
          order.total ??
          order.amount ??
          0
        );

        return sum + (Number.isFinite(amount) ? amount : 0);
      },
      0
    );

    const commission = calculateZuneCommission(totalSales);

    adminText("totalCompletedSales", formatTZS(totalSales));

    adminText(
      "totalZuneCommission",
      formatTZS(commission.zuneCommission)
    );

    adminText(
      "totalSellerEarnings",
      formatTZS(commission.sellerReceives)
    );

    return commission;

  } catch (error) {
    console.error("Commission report:", error);

    showAdminMessage(
      "Imeshindwa kuandaa ripoti ya commission.",
      "error"
    );
  }
}


/* =========================================================
   17. SEARCH PAYMENTS
========================================================= */

function searchAdminPayments(keyword) {
  const search = String(keyword || "").toLowerCase().trim();

  const filtered = ZUNE_ADMIN.cache.payments.filter(payment => {

    return [
      payment.id,
      payment.order_id,
      payment.user_id,
      payment.buyer_id,
      payment.status,
      payment.payment_method
    ].some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminPayments(filtered);
}


/* =========================================================
   18. GLOBAL EXPORTS
========================================================= */

window.loadAdminOrders = loadAdminOrders;
window.renderAdminOrders = renderAdminOrders;
window.viewAdminOrder = viewAdminOrder;
window.searchAdminOrders = searchAdminOrders;
window.filterAdminOrders = filterAdminOrders;

window.loadAdminDeliveries = loadAdminDeliveries;
window.renderAdminDeliveries = renderAdminDeliveries;
window.viewAdminDelivery = viewAdminDelivery;

window.loadAdminPayments = loadAdminPayments;
window.renderAdminPayments = renderAdminPayments;
window.searchAdminPayments = searchAdminPayments;

window.loadAdminWallets = loadAdminWallets;
window.renderAdminWallets = renderAdminWallets;

window.loadAdminWalletTransactions = loadAdminWalletTransactions;
window.renderAdminWalletTransactions = renderAdminWalletTransactions;

window.calculateZuneCommission = calculateZuneCommission;
window.displayZuneCommission = displayZuneCommission;
window.loadZuneCommissionReport = loadZuneCommissionReport;


/* =========================================================
   MWISHO WA SEHEMU YA 4/7
========================================================= */

/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 5/7
   Disputes + Reviews + Refunds + Complaints
========================================================= */


/* =========================================================
   1. LOAD TRANSACTION DISPUTES
========================================================= */

async function loadAdminDisputes() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("disputesTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia disputes...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("transaction_disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.disputes = data || [];

    renderAdminDisputes(data || []);

    adminText("disputesCount", data.length);

  } catch (error) {
    console.error("Disputes:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia disputes. Hakiki columns za transaction_disputes.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la disputes: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   2. RENDER DISPUTES
========================================================= */

function renderAdminDisputes(disputes) {
  const tbody = adminElement("disputesTableBody");

  if (!tbody) return;

  if (!disputes.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna disputes zilizopatikana.</td></tr>`;
    return;
  }

  tbody.innerHTML = disputes.map(dispute => {

    const reference =
      dispute.reference ||
      dispute.transaction_id ||
      dispute.order_id ||
      dispute.id;

    const status =
      dispute.status ||
      "pending";

    return `
      <tr>
        <td>${escapeAdminHTML(dispute.id)}</td>

        <td>${escapeAdminHTML(reference)}</td>

        <td>${escapeAdminHTML(dispute.user_id || dispute.buyer_id || "—")}</td>

        <td>${escapeAdminHTML(dispute.seller_id || "—")}</td>

        <td>${escapeAdminHTML(dispute.reason || dispute.description || "—")}</td>

        <td>${escapeAdminHTML(status)}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminDispute('${escapeAdminHTML(dispute.id)}')">
            Chunguza
          </button>
        </td>
      </tr>
    `;

  }).join("");
}


/* =========================================================
   3. VIEW DISPUTE DETAILS
========================================================= */

async function viewAdminDispute(disputeId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("transaction_disputes")
      .select("*")
      .eq("id", disputeId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage(
        "Dispute haijapatikana.",
        "error"
      );
      return;
    }

    ZUNE_ADMIN.currentDispute = data;

    adminText("disputeDetailId", data.id);

    adminText(
      "disputeReference",
      data.reference || data.transaction_id || data.order_id || "—"
    );

    adminText(
      "disputeBuyer",
      data.user_id || data.buyer_id || "—"
    );

    adminText(
      "disputeSeller",
      data.seller_id || "—"
    );

    adminText(
      "disputeReason",
      data.reason || data.description || "—"
    );

    adminText(
      "disputeStatus",
      data.status || "pending"
    );

    adminText(
      "disputeCreated",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("disputeDetailsModal");

    if (modal) modal.style.display = "flex";

    document.dispatchEvent(
      new CustomEvent("zune:dispute-viewed", {
        detail: { disputeId }
      })
    );

  } catch (error) {
    console.error("Dispute details:", error);

    showAdminMessage(
      "Imeshindwa kufungua dispute.",
      "error"
    );
  }
}


/* =========================================================
   4. FILTER DISPUTES
========================================================= */

function filterAdminDisputes(status) {
  let filtered = ZUNE_ADMIN.cache.disputes;

  if (status && status !== "all") {
    filtered = filtered.filter(
      dispute => dispute.status === status
    );
  }

  renderAdminDisputes(filtered);
}


/* =========================================================
   5. SEARCH DISPUTES
========================================================= */

function searchAdminDisputes(keyword) {
  const search = String(keyword || "")
    .toLowerCase()
    .trim();

  const filtered = ZUNE_ADMIN.cache.disputes.filter(dispute => {

    const values = [
      dispute.id,
      dispute.reference,
      dispute.transaction_id,
      dispute.order_id,
      dispute.user_id,
      dispute.buyer_id,
      dispute.seller_id,
      dispute.reason,
      dispute.description,
      dispute.status
    ];

    return values.some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminDisputes(filtered);
}


/* =========================================================
   6. REVIEW DISPUTE
========================================================= */

/*
  Uamuzi wa dispute lazima utekelezwe server-side.

  RPC inayotarajiwa:
  admin_resolve_transaction_dispute

  Parameters:
  p_dispute_id
  p_decision
  p_reason

  Decisions zinazotarajiwa:
  buyer_wins
  seller_wins
  refund_approved
  rejected
*/

async function resolveAdminDispute(
  disputeId,
  decision,
  reason
) {
  if (!requireZuneAdmin()) return;

  const allowedDecisions = [
    "buyer_wins",
    "seller_wins",
    "refund_approved",
    "rejected"
  ];

  if (!allowedDecisions.includes(decision)) {
    showAdminMessage(
      "Uamuzi wa dispute si sahihi.",
      "error"
    );
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika sababu ya uamuzi.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    "Una uhakika unataka kutoa uamuzi huu?"
  );

  if (!confirmed) return;

  try {
    const { data, error } = await adminDB.rpc(
      "admin_resolve_transaction_dispute",
      {
        p_dispute_id: disputeId,
        p_decision: decision,
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Uamuzi wa dispute umetekelezwa.",
      "success"
    );

    await loadAdminDisputes();

    document.dispatchEvent(
      new CustomEvent("zune:dispute-resolved", {
        detail: {
          disputeId,
          decision
        }
      })
    );

    return data;

  } catch (error) {
    console.error("Resolve dispute:", error);

    showAdminMessage(
      "Imeshindwa kutatua dispute: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   7. LOAD CUSTOMER COMPLAINTS
========================================================= */

/*
  Jedwali linalotarajiwa:
  customer_complaints

  Thibitisha jina hili kwenye Supabase.
*/

async function loadAdminComplaints() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("complaintsTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="6">Inapakia complaints...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("customer_complaints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.complaints = data || [];

    renderAdminComplaints(data || []);

    adminText("complaintsCount", data.length);

  } catch (error) {
    console.error("Complaints:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="6">Imeshindwa kupakia complaints.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la complaints: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   8. RENDER COMPLAINTS
========================================================= */

function renderAdminComplaints(complaints) {
  const tbody = adminElement("complaintsTableBody");

  if (!tbody) return;

  if (!complaints.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">Hakuna complaints.</td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(complaint => {

    return `
      <tr>
        <td>${escapeAdminHTML(complaint.id)}</td>

        <td>${escapeAdminHTML(complaint.user_id || "—")}</td>

        <td>${escapeAdminHTML(complaint.subject || "—")}</td>

        <td>${escapeAdminHTML(complaint.category || "—")}</td>

        <td>${escapeAdminHTML(complaint.status || "pending")}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminComplaint('${escapeAdminHTML(complaint.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;

  }).join("");
}


/* =========================================================
   9. VIEW COMPLAINT
========================================================= */

async function viewAdminComplaint(complaintId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("customer_complaints")
      .select("*")
      .eq("id", complaintId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage(
        "Complaint haijapatikana.",
        "error"
      );
      return;
    }

    ZUNE_ADMIN.currentComplaint = data;

    adminText("complaintDetailId", data.id);
    adminText("complaintUser", data.user_id || "—");
    adminText("complaintSubject", data.subject || "—");
    adminText("complaintCategory", data.category || "—");
    adminText("complaintDescription", data.description || "—");
    adminText("complaintStatus", data.status || "pending");

    adminText(
      "complaintCreated",
      formatAdminDate(data.created_at)
    );

    const modal = adminElement("complaintDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Complaint details:", error);

    showAdminMessage(
      "Imeshindwa kufungua complaint.",
      "error"
    );
  }
}


/* =========================================================
   10. UPDATE COMPLAINT STATUS
========================================================= */

/*
  RPC inayotarajiwa:
  admin_update_complaint_status

  Parameters:
  p_complaint_id
  p_status
  p_reason
*/

async function updateAdminComplaint(
  complaintId,
  status,
  reason
) {
  if (!requireZuneAdmin()) return;

  const allowedStatuses = [
    "in_review",
    "resolved",
    "rejected"
  ];

  if (!allowedStatuses.includes(status)) {
    showAdminMessage(
      "Complaint status si sahihi.",
      "error"
    );
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika sababu ya kubadilisha status.",
      "error"
    );
    return;
  }

  try {
    const { data, error } = await adminDB.rpc(
      "admin_update_complaint_status",
      {
        p_complaint_id: complaintId,
        p_status: status,
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Complaint imesasishwa.",
      "success"
    );

    await loadAdminComplaints();

    return data;

  } catch (error) {
    console.error("Update complaint:", error);

    showAdminMessage(
      "Imeshindwa kusasisha complaint: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   11. LOAD REVIEWS AND RATINGS
========================================================= */

/*
  Jedwali linalotarajiwa:
  reviews

  Thibitisha jina hili na columns zake.
*/

async function loadAdminReviews() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("reviewsTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia reviews...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.reviews = data || [];

    renderAdminReviews(data || []);

    adminText("reviewsCount", data.length);

  } catch (error) {
    console.error("Reviews:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia reviews.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la reviews: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   12. RENDER REVIEWS
========================================================= */

function renderAdminReviews(reviews) {
  const tbody = adminElement("reviewsTableBody");

  if (!tbody) return;

  if (!reviews.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna reviews.</td></tr>`;
    return;
  }

  tbody.innerHTML = reviews.map(review => {

    const rating =
      Number(review.rating ?? review.stars ?? 0);

    return `
      <tr>
        <td>${escapeAdminHTML(review.id)}</td>

        <td>${escapeAdminHTML(review.user_id || "—")}</td>

        <td>${escapeAdminHTML(review.product_id || "—")}</td>

        <td>${rating}/5</td>

        <td>${escapeAdminHTML(review.comment || review.review || "—")}</td>

        <td>${escapeAdminHTML(review.status || "visible")}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminReview('${escapeAdminHTML(review.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   13. VIEW REVIEW
========================================================= */

async function viewAdminReview(reviewId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage(
        "Review haijapatikana.",
        "error"
      );
      return;
    }

    ZUNE_ADMIN.currentReview = data;

    adminText("reviewDetailId", data.id);
    adminText("reviewUser", data.user_id || "—");
    adminText("reviewProduct", data.product_id || "—");
    adminText("reviewRating", `${data.rating ?? data.stars ?? 0}/5`);
    adminText("reviewComment", data.comment || data.review || "—");
    adminText("reviewStatus", data.status || "visible");

    const modal = adminElement("reviewDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Review details:", error);

    showAdminMessage(
      "Imeshindwa kufungua review.",
      "error"
    );
  }
}


/* =========================================================
   14. MODERATE REVIEW
========================================================= */

/*
  RPC inayotarajiwa:
  admin_moderate_review

  Parameters:
  p_review_id
  p_action
  p_reason

  Actions:
  hide
  restore
*/

async function moderateAdminReview(
  reviewId,
  action,
  reason
) {
  if (!requireZuneAdmin()) return;

  const allowedActions = ["hide", "restore"];

  if (!allowedActions.includes(action)) {
    showAdminMessage(
      "Hatua ya review si sahihi.",
      "error"
    );
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika sababu ya moderation.",
      "error"
    );
    return;
  }

  try {
    const { data, error } = await adminDB.rpc(
      "admin_moderate_review",
      {
        p_review_id: reviewId,
        p_action: action,
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Review imesasishwa.",
      "success"
    );

    await loadAdminReviews();

    return data;

  } catch (error) {
    console.error("Review moderation:", error);

    showAdminMessage(
      "Imeshindwa kusasisha review: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   15. LOAD REFUND REQUESTS
========================================================= */

/*
  Jedwali linalotarajiwa:
  refund_requests

  Refund lazima ithibitishwe na payment provider/server.
  Admin browser haitakiwi kutoa fedha moja kwa moja.
*/

async function loadAdminRefunds() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("refundsTableBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia refunds...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.refunds = data || [];

    renderAdminRefunds(data || []);

    adminText("refundsCount", data.length);

  } catch (error) {
    console.error("Refunds:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia refunds.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la refunds: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   16. RENDER REFUNDS
========================================================= */

function renderAdminRefunds(refunds) {
  const tbody = adminElement("refundsTableBody");

  if (!tbody) return;

  if (!refunds.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna refund requests.</td></tr>`;
    return;
  }

  tbody.innerHTML = refunds.map(refund => {

    return `
      <tr>
        <td>${escapeAdminHTML(refund.id)}</td>

        <td>${escapeAdminHTML(refund.order_id || "—")}</td>

        <td>${escapeAdminHTML(refund.user_id || "—")}</td>

        <td>${formatTZS(refund.amount || 0)}</td>

        <td>${escapeAdminHTML(refund.reason || "—")}</td>

        <td>${escapeAdminHTML(refund.status || "pending")}</td>

        <td>
          <button
            type="button"
            onclick="viewAdminRefund('${escapeAdminHTML(refund.id)}')">
            Angalia
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   17. VIEW REFUND
========================================================= */

async function viewAdminRefund(refundId) {
  if (!requireZuneAdmin()) return;

  try {
    const { data, error } = await adminDB
      .from("refund_requests")
      .select("*")
      .eq("id", refundId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showAdminMessage(
        "Refund haijapatikana.",
        "error"
      );
      return;
    }

    ZUNE_ADMIN.currentRefund = data;

    adminText("refundDetailId", data.id);
    adminText("refundOrderId", data.order_id || "—");
    adminText("refundUser", data.user_id || "—");
    adminText("refundAmount", formatTZS(data.amount || 0));
    adminText("refundReason", data.reason || "—");
    adminText("refundStatus", data.status || "pending");

    const modal = adminElement("refundDetailsModal");

    if (modal) modal.style.display = "flex";

  } catch (error) {
    console.error("Refund details:", error);

    showAdminMessage(
      "Imeshindwa kufungua refund.",
      "error"
    );
  }
}


/* =========================================================
   18. REVIEW REFUND REQUEST
========================================================= */

/*
  RPC inayotarajiwa:
  admin_review_refund_request

  Parameters:
  p_refund_id
  p_decision
  p_reason

  Decisions:
  approved
  rejected

  Approval si uthibitisho wa fedha kutumwa.
  Payment provider lazima athibitishe refund.
*/

async function reviewAdminRefund(
  refundId,
  decision,
  reason
) {
  if (!requireZuneAdmin()) return;

  const allowed = ["approved", "rejected"];

  if (!allowed.includes(decision)) {
    showAdminMessage(
      "Uamuzi wa refund si sahihi.",
      "error"
    );
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika sababu ya uamuzi.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `Unathibitisha ${decision} refund request?`
  );

  if (!confirmed) return;

  try {
    const { data, error } = await adminDB.rpc(
      "admin_review_refund_request",
      {
        p_refund_id: refundId,
        p_decision: decision,
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Uamuzi wa refund umerekodiwa.",
      "success"
    );

    await loadAdminRefunds();

    return data;

  } catch (error) {
    console.error("Refund review:", error);

    showAdminMessage(
      "Imeshindwa kushughulikia refund: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   19. GLOBAL EXPORTS
========================================================= */
window.loadAdminDisputes = loadAdminDisputes;
window.renderAdminDisputes = renderAdminDisputes;
window.viewAdminDispute = viewAdminDispute;
window.filterAdminDisputes = filterAdminDisputes;
window.searchAdminDisputes = searchAdminDisputes;
window.resolveAdminDispute = resolveAdminDispute;

window.loadAdminComplaints = loadAdminComplaints;
window.renderAdminComplaints = renderAdminComplaints;
window.viewAdminComplaint = viewAdminComplaint;
window.updateAdminComplaint = updateAdminComplaint;

window.loadAdminReviews = loadAdminReviews;
window.renderAdminReviews = renderAdminReviews;
window.viewAdminReview = viewAdminReview;
window.moderateAdminReview = moderateAdminReview;

window.loadAdminRefunds = loadAdminRefunds;
window.renderAdminRefunds = renderAdminRefunds;
window.viewAdminRefund = viewAdminRefund;
window.reviewAdminRefund = reviewAdminRefund;



/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 6/7
   Audit Logs + Security Center + Monthly Audit
========================================================= */


/* =========================================================
   1. ADMIN AUDIT LOGS
========================================================= */

/*
  Jedwali linalotarajiwa:
  admin_audit_logs

  Columns zinazotarajiwa kwa UI:
  id, admin_id, action, target_type, target_id,
  reason, created_at

  Thibitisha schema kabla ya production.
*/

async function loadAdminAuditLogs() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("adminAuditLogsBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="7">Inapakia audit logs...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    ZUNE_ADMIN.cache.auditLogs = data || [];

    renderAdminAuditLogs(data || []);

    adminText("auditLogsCount", data.length);

  } catch (error) {
    console.error("Audit logs:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="7">Imeshindwa kupakia audit logs.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la audit logs: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   2. RENDER AUDIT LOGS
========================================================= */

function renderAdminAuditLogs(logs) {
  const tbody = adminElement("adminAuditLogsBody");

  if (!tbody) return;

  if (!logs.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">Hakuna audit logs.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {

    return `
      <tr>
        <td>${escapeAdminHTML(log.id)}</td>

        <td>${escapeAdminHTML(log.admin_id || "—")}</td>

        <td>${escapeAdminHTML(log.action || "—")}</td>

        <td>${escapeAdminHTML(log.target_type || "—")}</td>

        <td>${escapeAdminHTML(log.target_id || "—")}</td>

        <td>${escapeAdminHTML(log.reason || "—")}</td>

        <td>${formatAdminDate(log.created_at)}</td>
      </tr>
    `;

  }).join("");
}


/* =========================================================
   3. SEARCH AUDIT LOGS
========================================================= */

function searchAdminAuditLogs(keyword) {
  const search = String(keyword || "")
    .trim()
    .toLowerCase();

  const filtered = ZUNE_ADMIN.cache.auditLogs.filter(log => {

    const values = [
      log.id,
      log.admin_id,
      log.action,
      log.target_type,
      log.target_id,
      log.reason
    ];

    return values.some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminAuditLogs(filtered);
}


/* =========================================================
   4. FILTER AUDIT LOGS BY ACTION
========================================================= */

function filterAdminAuditLogs(action) {
  let filtered = ZUNE_ADMIN.cache.auditLogs;

  if (action && action !== "all") {
    filtered = filtered.filter(
      log => log.action === action
    );
  }

  renderAdminAuditLogs(filtered);
}


/* =========================================================
   5. EXPORT AUDIT LOGS CSV
========================================================= */

function exportAdminAuditLogs() {
  if (!requireZuneAdmin()) return;

  const logs = ZUNE_ADMIN.cache.auditLogs || [];

  if (!logs.length) {
    showAdminMessage(
      "Hakuna audit logs za ku-export.",
      "warning"
    );
    return;
  }

  const columns = [
    "id",
    "admin_id",
    "action",
    "target_type",
    "target_id",
    "reason",
    "created_at"
  ];

  const escapeCSV = value => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.join(","),
    ...logs.map(log =>
      columns.map(column => escapeCSV(log[column])).join(",")
    )
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `zune-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showAdminMessage(
    "Audit logs zimeandaliwa kwa CSV.",
    "success"
  );
}


/* =========================================================
   6. SECURITY EVENTS
========================================================= */

/*
  Jedwali linalotarajiwa:
  security_events

  Taarifa zinaweza kujumuisha:
  event_type, severity, description, created_at
*/

async function loadAdminSecurityEvents() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("securityEventsBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="6">Inapakia security events...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    ZUNE_ADMIN.cache.securityEvents = data || [];

    renderAdminSecurityEvents(data || []);

    adminText("securityEventsCount", data.length);

    const critical = data.filter(event =>
      String(event.severity || "").toLowerCase() === "critical"
    ).length;

    const high = data.filter(event =>
      String(event.severity || "").toLowerCase() === "high"
    ).length;

    adminText("criticalSecurityEvents", critical);
    adminText("highSecurityEvents", high);

  } catch (error) {
    console.error("Security events:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="6">Imeshindwa kupakia security events.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la security events: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   7. RENDER SECURITY EVENTS
========================================================= */

function renderAdminSecurityEvents(events) {
  const tbody = adminElement("securityEventsBody");

  if (!tbody) return;

  if (!events.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">Hakuna security events.</td></tr>`;
    return;
  }

  tbody.innerHTML = events.map(event => {

    return `
      <tr>
        <td>${escapeAdminHTML(event.id)}</td>

        <td>${escapeAdminHTML(event.event_type || "—")}</td>

        <td>${escapeAdminHTML(event.severity || "—")}</td>

        <td>${escapeAdminHTML(event.description || "—")}</td>

        <td>${escapeAdminHTML(event.status || "—")}</td>

        <td>${formatAdminDate(event.created_at)}</td>
      </tr>
    `;

  }).join("");
}


/* =========================================================
   8. FILTER SECURITY EVENTS
========================================================= */

function filterAdminSecurityEvents(severity) {
  let events = ZUNE_ADMIN.cache.securityEvents || [];

  if (severity && severity !== "all") {
    events = events.filter(event =>
      String(event.severity || "").toLowerCase() ===
      severity.toLowerCase()
    );
  }

  renderAdminSecurityEvents(events);
}


/* =========================================================
   9. SECURITY EVENT SEARCH
========================================================= */

function searchAdminSecurityEvents(keyword) {
  const search = String(keyword || "")
    .trim()
    .toLowerCase();

  const events = (
    ZUNE_ADMIN.cache.securityEvents || []
  ).filter(event => {

    return [
      event.id,
      event.event_type,
      event.severity,
      event.description,
      event.status
    ].some(value =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  renderAdminSecurityEvents(events);
}


/* =========================================================
   10. MONTHLY AUDIT CHECKLIST
========================================================= */

/*
  Checklist ya ukaguzi wa kila mwezi.
  Hii ni orodha ya ukaguzi wa UI.

  Ili kuhifadhi matokeo kwenye database, tumia RPC
  admin_save_monthly_audit iliyo chini.
*/

const ZUNE_MONTHLY_AUDIT_ITEMS = [
  {
    id: "users",
    title: "Kagua akaunti za watumiaji",
    description: "Chunguza akaunti zisizo za kawaida."
  },
  {
    id: "sellers",
    title: "Kagua sellers",
    description: "Hakiki taarifa na hali za sellers."
  },
  {
    id: "verification",
    title: "Kagua uthibitishaji",
    description: "Hakiki nyaraka na hali za verified sellers."
  },
  {
    id: "products",
    title: "Kagua bidhaa",
    description: "Tafuta bidhaa zilizoripotiwa au zisizoruhusiwa."
  },
  {
    id: "orders",
    title: "Kagua orders",
    description: "Linganisha orders na hali zake."
  },
  {
    id: "payments",
    title: "Kagua malipo",
    description: "Linganisha malipo yaliyothibitishwa."
  },
  {
    id: "wallet",
    title: "Kagua wallet",
    description: "Hakiki salio na miamala."
  },
  {
    id: "commission",
    title: "Kagua commission",
    description: "Thibitisha commission ya ZUNE ya 3%."
  },
  {
    id: "disputes",
    title: "Kagua disputes",
    description: "Fuatilia migogoro ambayo haijatatuliwa."
  },
  {
    id: "refunds",
    title: "Kagua refunds",
    description: "Linganisha maombi na marejesho halisi."
  },
  {
    id: "security",
    title: "Kagua usalama",
    description: "Chunguza matukio ya usalama."
  },
  {
    id: "audit",
    title: "Kagua audit logs",
    description: "Hakiki vitendo vyote vya kiutawala."
  }
];


/* =========================================================
   11. RENDER MONTHLY AUDIT CHECKLIST
========================================================= */

function renderMonthlyAuditChecklist() {
  const container = adminElement("monthlyAuditChecklist");

  if (!container) return;

  container.innerHTML = ZUNE_MONTHLY_AUDIT_ITEMS.map(item => {

    return `
      <label class="monthly-audit-item">
        <input
          type="checkbox"
          class="monthly-audit-checkbox"
          value="${escapeAdminHTML(item.id)}"
        >

        <span>
          <strong>${escapeAdminHTML(item.title)}</strong>
          <small>${escapeAdminHTML(item.description)}</small>
        </span>
      </label>
    `;

  }).join("");

  updateMonthlyAuditProgress();
}


/* =========================================================
   12. MONTHLY AUDIT PROGRESS
========================================================= */

function getMonthlyAuditResults() {
  const checkboxes = $$(
    ".monthly-audit-checkbox"
  );

  const completed = Array.from(checkboxes)
    .filter(input => input.checked)
    .map(input => input.value);

  return {
    total: ZUNE_MONTHLY_AUDIT_ITEMS.length,
    completed,
    remaining:
      ZUNE_MONTHLY_AUDIT_ITEMS.length - completed.length,
    percentage: Math.round(
      completed.length /
      ZUNE_MONTHLY_AUDIT_ITEMS.length * 100
    )
  };
}


function updateMonthlyAuditProgress() {
  const result = getMonthlyAuditResults();

  adminText(
    "monthlyAuditCompleted",
    result.completed.length
  );

  adminText(
    "monthlyAuditRemaining",
    result.remaining
  );

  adminText(
    "monthlyAuditPercentage",
    `${result.percentage}%`
  );

  const progress = adminElement("monthlyAuditProgress");

  if (progress) {
    progress.style.width = `${result.percentage}%`;
  }

  return result;
}


/* =========================================================
   13. SAVE MONTHLY AUDIT
========================================================= */

/*
  RPC inayotarajiwa:
  admin_save_monthly_audit

  Parameters:
  p_audit_month
  p_completed_items
  p_notes
  p_reason

  RPC lazima:
  - Ithibitishe Admin Mkuu upande wa server.
  - Ihifadhi admin_id kutoka auth.uid().
  - Ihifadhi muda wa server.
  - Ihifadhi checklist na notes.
  - Irekodi audit log.
*/

async function saveMonthlyAdminAudit(notes, reason) {
  if (!requireZuneAdmin()) return;

  const result = updateMonthlyAuditProgress();

  if (result.completed.length === 0) {
    showAdminMessage(
      "Chagua angalau kipengele kimoja kilichokaguliwa.",
      "warning"
    );
    return;
  }

  if (!reason || reason.trim().length < 5) {
    showAdminMessage(
      "Andika maelezo ya ukaguzi.",
      "error"
    );
    return;
  }

  const auditMonth = new Date()
    .toISOString()
    .slice(0, 7);

  try {
    const { data, error } = await adminDB.rpc(
      "admin_save_monthly_audit",
      {
        p_audit_month: auditMonth,
        p_completed_items: result.completed,
        p_notes: String(notes || "").trim(),
        p_reason: reason.trim()
      }
    );

    if (error) throw error;

    showAdminMessage(
      "Ukaguzi wa mwezi umehifadhiwa.",
      "success"
    );

    document.dispatchEvent(
      new CustomEvent("zune:monthly-audit-saved", {
        detail: {
          month: auditMonth,
          completed: result.completed.length
        }
      })
    );

    return data;

  } catch (error) {
    console.error("Monthly audit:", error);

    showAdminMessage(
      "Imeshindwa kuhifadhi ukaguzi: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   14. LOAD MONTHLY AUDIT HISTORY
========================================================= */

/*
  Jedwali linalotarajiwa:
  admin_monthly_audits

  Thibitisha jina na columns kwenye Supabase.
*/

async function loadMonthlyAuditHistory() {
  if (!requireZuneAdmin()) return;

  const tbody = adminElement("monthlyAuditHistoryBody");

  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="5">Inapakia historia ya ukaguzi...</td></tr>`;
  }

  try {
    const { data, error } = await adminDB
      .from("admin_monthly_audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) throw error;

    ZUNE_ADMIN.cache.monthlyAudits = data || [];

    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML =
        `<tr><td colspan="5">Hakuna historia ya ukaguzi.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(audit => {

      return `
        <tr>
          <td>${escapeAdminHTML(audit.audit_month || "—")}</td>

          <td>${escapeAdminHTML(audit.admin_id || "—")}</td>

          <td>${escapeAdminHTML(audit.status || "—")}</td>

          <td>${escapeAdminHTML(audit.reason || "—")}</td>

          <td>${formatAdminDate(audit.created_at)}</td>
        </tr>
      `;

    }).join("");

  } catch (error) {
    console.error("Monthly audit history:", error);

    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="5">Imeshindwa kupakia historia.</td></tr>`;
    }

    showAdminMessage(
      "Tatizo la historia ya ukaguzi: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   15. ADMIN AUTHORITY INFORMATION
========================================================= */

/*
  ZUNE ina mfumo wa Admin Mkuu mmoja.

  JavaScript inaonyesha utambulisho wa admin aliyeingia,
  lakini uamuzi wa nani ni Admin Mkuu lazima uthibitishwe
  na database/RPC. Role='admin' pekee haitoshi kutofautisha
  Admin Mkuu na akaunti nyingine za kiutawala.
*/

function getCurrentAdminIdentity() {
  if (!ZUNE_ADMIN.user || !ZUNE_ADMIN.profile) {
    return null;
  }

  return {
    userId: ZUNE_ADMIN.user.id,
    email: ZUNE_ADMIN.user.email || null,
    role: ZUNE_ADMIN.profile.role
  };
}


/* =========================================================
   16. SECURE ADMIN ACTION
========================================================= */

/*
  Huu ni wrapper wa kuita RPC salama.

  RPC yenyewe lazima ifanye authorization na audit logging.
  Usitumie wrapper hii kama mbadala wa RLS au server checks.
*/

async function executeSecureAdminAction(
  rpcName,
  parameters = {},
  confirmationMessage = "Una uhakika wa kuendelea?"
) {
  if (!requireZuneAdmin()) return;

  if (
    typeof rpcName !== "string" ||
    !/^admin_[a-z0-9_]+$/.test(rpcName)
  ) {
    showAdminMessage(
      "Jina la admin RPC si sahihi.",
      "error"
    );
    return;
  }

  if (!window.confirm(confirmationMessage)) {
    return;
  }

  try {
    const { data, error } = await adminDB.rpc(
      rpcName,
      parameters
    );

    if (error) throw error;

    showAdminMessage(
      "Kitendo kimewasilishwa kwa server.",
      "success"
    );

    await loadAdminAuditLogs();

    return data;

  } catch (error) {
    console.error("Secure admin action:", error);

    showAdminMessage(
      "Kitendo kimeshindwa: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   17. ADMIN SESSION INFORMATION
========================================================= */

async function loadAdminSessionInformation() {
  if (!requireZuneAdmin()) return;

  try {
    const {
      data: { session },
      error
    } = await adminDB.auth.getSession();

    if (error) throw error;

    if (!session) {
      throw new Error("Session haipo.");
    }

    ZUNE_ADMIN.session = session;

    adminText(
      "adminSessionStatus",
      "Active"
    );

    adminText(
      "adminSessionEmail",
      session.user.email || "—"
    );

    adminText(
      "adminSessionStarted",
      formatAdminDate(
        session.user.last_sign_in_at
      )
    );

  } catch (error) {
    console.error("Admin session:", error);

    showAdminMessage(
      "Imeshindwa kupata taarifa za session.",
      "error"
    );
  }
}


/* =========================================================
   18. ADMIN SIGN OUT
========================================================= */

async function logoutZuneAdmin() {
  const confirmed = window.confirm(
    "Unataka kutoka kwenye ZUNE PREMIUM ADMIN?"
  );

  if (!confirmed) return;

  try {
    const { error } = await adminDB.auth.signOut();

    if (error) throw error;

    ZUNE_ADMIN.isAuthenticated = false;

    window.location.href = "login.html";

  } catch (error) {
    console.error("Admin logout:", error);

    showAdminMessage(
      "Imeshindwa kutoka: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   19. INITIALIZE AUDIT AND SECURITY
========================================================= */

async function initializeAdminSecurityCenter() {
  if (!requireZuneAdmin()) return;

  renderMonthlyAuditChecklist();

  await Promise.allSettled([
    loadAdminAuditLogs(),
    loadAdminSecurityEvents(),
    loadMonthlyAuditHistory(),
    loadAdminSessionInformation()
  ]);
}


/* =========================================================
   20. GLOBAL EXPORTS
========================================================= */

window.loadAdminAuditLogs = loadAdminAuditLogs;
window.renderAdminAuditLogs = renderAdminAuditLogs;
window.searchAdminAuditLogs = searchAdminAuditLogs;
window.filterAdminAuditLogs = filterAdminAuditLogs;
window.exportAdminAuditLogs = exportAdminAuditLogs;

window.loadAdminSecurityEvents = loadAdminSecurityEvents;
window.renderAdminSecurityEvents = renderAdminSecurityEvents;
window.filterAdminSecurityEvents = filterAdminSecurityEvents;
window.searchAdminSecurityEvents = searchAdminSecurityEvents;

window.ZUNE_MONTHLY_AUDIT_ITEMS = ZUNE_MONTHLY_AUDIT_ITEMS;
window.renderMonthlyAuditChecklist = renderMonthlyAuditChecklist;
window.getMonthlyAuditResults = getMonthlyAuditResults;
window.updateMonthlyAuditProgress = updateMonthlyAuditProgress;
window.saveMonthlyAdminAudit = saveMonthlyAdminAudit;
window.loadMonthlyAuditHistory = loadMonthlyAuditHistory;

window.getCurrentAdminIdentity = getCurrentAdminIdentity;
window.executeSecureAdminAction = executeSecureAdminAction;
window.loadAdminSessionInformation = loadAdminSessionInformation;
window.initializeAdminSecurityCenter = initializeAdminSecurityCenter;
window.logoutZuneAdmin = logoutZuneAdmin;


/* =========================================================
   ZUNE PREMIUM ADMIN
   ADMIN.JS — SEHEMU YA 7/7
   FINAL INTEGRATION + EVENT HANDLERS
========================================================= */


/* =========================================================
   1. NAVIGATION CONFIGURATION
========================================================= */

const ZUNE_ADMIN_PAGE_LOADERS = {

  dashboard: async () => {
    if (typeof loadAdminDashboard === "function") {
      await loadAdminDashboard();
    }
  },

  users: async () => {
    if (typeof loadAdminUsers === "function") {
      await loadAdminUsers();
    }
  },

  sellers: async () => {
    if (typeof loadAdminSellers === "function") {
      await loadAdminSellers();
    }
  },

  applications: async () => {
    if (typeof loadSellerApplications === "function") {
      await loadSellerApplications();
    }
  },

  products: async () => {
    if (typeof loadAdminProducts === "function") {
      await loadAdminProducts();
    }
  },

  categories: async () => {
    if (typeof loadAdminCategories === "function") {
      await loadAdminCategories();
    }
  },

  orders: async () => {
    if (typeof loadAdminOrders === "function") {
      await loadAdminOrders();
    }
  },

  deliveries: async () => {
    if (typeof loadAdminDeliveries === "function") {
      await loadAdminDeliveries();
    }
  },

  payments: async () => {
    if (typeof loadAdminPayments === "function") {
      await loadAdminPayments();
    }
  },

  wallet: async () => {
    if (typeof loadAdminWallets === "function") {
      await loadAdminWallets();
    }
  },

  transactions: async () => {
    if (typeof loadAdminWalletTransactions === "function") {
      await loadAdminWalletTransactions();
    }
  },

  disputes: async () => {
    if (typeof loadTransactionDisputes === "function") {
      await loadTransactionDisputes();
    }
  },

  complaints: async () => {
    if (typeof loadCustomerComplaints === "function") {
      await loadCustomerComplaints();
    }
  },

  reviews: async () => {
    if (typeof loadAdminReviews === "function") {
      await loadAdminReviews();
    }
  },

  refunds: async () => {
    if (typeof loadRefundRequests === "function") {
      await loadRefundRequests();
    }
  },

  reports: async () => {
    if (typeof loadAdminReports === "function") {
      await loadAdminReports();
    }
  },

  audit: async () => {
    await loadAdminAuditLogs();
  },

  security: async () => {
    await loadAdminSecurityEvents();
    await loadAdminSessionInformation();
  },

  monthlyAudit: async () => {
    renderMonthlyAuditChecklist();
    await loadMonthlyAuditHistory();
  }

};


/* =========================================================
   2. NAVIGATION
========================================================= */

async function navigateZuneAdmin(pageName) {
  if (!requireZuneAdmin()) return;

  const page = String(pageName || "")
    .trim()
    .toLowerCase();

  if (!page) return;

  const pages = $$(
    "[data-admin-page], .admin-page, .dashboard-page"
  );

  pages.forEach(section => {
    const sectionName =
      section.dataset.adminPage ||
      section.id.replace(/Page$/, "").replace(/-/g, "");

    const normalized = sectionName
      .toLowerCase()
      .replace(/-/g, "");

    const selected = normalized ===
      page.replace(/-/g, "");

    section.hidden = !selected;
    section.classList.toggle("active", selected);
  });

  $$("[data-admin-nav]").forEach(button => {
    const selected =
      button.dataset.adminNav === page;

    button.classList.toggle("active", selected);

    button.setAttribute(
      "aria-current",
      selected ? "page" : "false"
    );
  });

  ZUNE_ADMIN.currentPage = page;

  try {
    const loader = ZUNE_ADMIN_PAGE_LOADERS[page];

    if (loader) {
      await loader();
    }

    document.dispatchEvent(
      new CustomEvent("zune:admin-page-changed", {
        detail: { page }
      })
    );

  } catch (error) {
    console.error("Admin navigation:", error);

    showAdminMessage(
      "Imeshindwa kufungua ukurasa: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   3. REFRESH CURRENT PAGE
========================================================= */

async function refreshCurrentAdminPage() {
  if (!requireZuneAdmin()) return;

  const page = ZUNE_ADMIN.currentPage || "dashboard";

  const loader = ZUNE_ADMIN_PAGE_LOADERS[page];

  if (!loader) {
    showAdminMessage(
      "Hakuna refresh function ya ukurasa huu.",
      "warning"
    );
    return;
  }

  try {
    await loader();

    showAdminMessage(
      "Taarifa zimefanyiwa refresh.",
      "success"
    );

  } catch (error) {
    console.error("Refresh:", error);

    showAdminMessage(
      "Refresh imeshindwa.",
      "error"
    );
  }
}


/* =========================================================
   4. SELLER DETAILS PAGE
========================================================= */

async function openSellerDetails(sellerId) {
  if (!requireZuneAdmin()) return;

  if (!sellerId) {
    showAdminMessage(
      "Seller ID haijapatikana.",
      "error"
    );
    return;
  }

  try {
    if (typeof loadSellerDetails === "function") {
      await loadSellerDetails(sellerId);
    } else if (
      typeof loadSellerProfileDetails === "function"
    ) {
      await loadSellerProfileDetails(sellerId);
    } else {
      throw new Error(
        "Seller Details loader haipo kwenye sehemu zilizotangulia."
      );
    }

    const page = adminElement("sellerDetailsPage");

    if (page) {
      page.hidden = false;
      page.classList.add("active");
    }

    ZUNE_ADMIN.currentSellerId = sellerId;

    document.dispatchEvent(
      new CustomEvent("zune:seller-details-opened", {
        detail: { sellerId }
      })
    );

  } catch (error) {
    console.error("Seller details:", error);

    showAdminMessage(
      "Imeshindwa kufungua maelezo ya seller: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
   5. SELLER DETAILS TABS
========================================================= */

function activateSellerDetailsTab(tabName) {
  const tab = String(tabName || "")
    .trim()
    .toLowerCase();

  if (!tab) return;

  $$("[data-seller-tab]").forEach(button => {
    const active = button.dataset.sellerTab === tab;

    button.classList.toggle("active", active);
    button.setAttribute(
      "aria-selected",
      active ? "true" : "false"
    );
  });

  $$("[data-seller-panel]").forEach(panel => {
    const active =
      panel.dataset.sellerPanel === tab;

    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}


/* =========================================================
   6. MODAL CONTROLS
========================================================= */

function openAdminModal(modalId) {
  if (!requireZuneAdmin()) return;

  const modal = adminElement(modalId);

  if (!modal) {
    console.warn("Modal haipo:", modalId);
    return;
  }

  modal.hidden = false;
  modal.classList.add("active");

  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");
}


function closeAdminModal(modalId) {
  const modal = adminElement(modalId);

  if (!modal) return;

  modal.hidden = true;
  modal.classList.remove("active");

  modal.setAttribute("aria-hidden", "true");

  const remaining = $$(".admin-modal.active");

  if (!remaining.length) {
    document.body.classList.remove("modal-open");
  }
}


function closeAllAdminModals() {
  $$(".admin-modal").forEach(modal => {
    modal.hidden = true;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  });

  document.body.classList.remove("modal-open");
}


/* =========================================================
   7. GLOBAL SEARCH
========================================================= */

async function performZuneAdminGlobalSearch(keyword) {
  if (!requireZuneAdmin()) return;

  const search = String(keyword || "").trim();

  if (search.length < 2) {
    showAdminMessage(
      "Andika angalau herufi mbili.",
      "warning"
    );
    return;
  }

  const searchInput = adminElement("globalAdminSearch");

  if (searchInput) {
    searchInput.value = search;
  }

  try {
    const { data, error } = await adminDB
      .from("profiles")
      .select("id, full_name, email, role, is_verified")
      .or(
        `full_name.ilike.%${search.replace(/[%_,()]/g, "")}%,email.ilike.%${search.replace(/[%_,()]/g, "")}%`
      )
      .limit(30);

    if (error) throw error;

    ZUNE_ADMIN.cache.globalSearch = data || [];

    const container = adminElement(
      "globalAdminSearchResults"
    );

    if (!container) return;

    if (!data.length) {
      container.innerHTML =
        `<p>Hakuna matokeo yaliyopatikana.</p>`;
      return;
    }

    container.innerHTML = data.map(user => `
      <button
        type="button"
        class="admin-search-result"
        data-search-user="${escapeAdminHTML(user.id)}"
      >
        <strong>${escapeAdminHTML(user.full_name || "Mtumiaji")}</strong>
        <span>${escapeAdminHTML(user.email || "")}</span>
        <small>${escapeAdminHTML(user.role || "")}</small>
      </button>
    `).join("");

    openAdminModal("globalSearchModal");

  } catch (error) {
    console.error("Global search:", error);

    showAdminMessage(
      "Global search imeshindwa: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   8. SEARCH RESULT ACTION
========================================================= */

function openGlobalSearchUser(userId) {
  if (!userId) return;

  closeAdminModal("globalSearchModal");

  if (typeof openUserDetails === "function") {
    openUserDetails(userId);
  } else if (typeof openSellerDetails === "function") {
    openSellerDetails(userId);
  }
}


/* =========================================================
   9. BUTTON EVENT DELEGATION
========================================================= */

function bindZuneAdminButtons() {

  document.addEventListener("click", async event => {

    const navButton = event.target.closest(
      "[data-admin-nav]"
    );

    if (navButton) {
      event.preventDefault();

      await navigateZuneAdmin(
        navButton.dataset.adminNav
      );

      return;
    }


    const refreshButton = event.target.closest(
      "[data-admin-refresh]"
    );

    if (refreshButton) {
      event.preventDefault();

      await refreshCurrentAdminPage();

      return;
    }


    const sellerButton = event.target.closest(
      "[data-open-seller]"
    );

    if (sellerButton) {
      event.preventDefault();

      await openSellerDetails(
        sellerButton.dataset.openSeller
      );

      return;
    }


    const sellerTab = event.target.closest(
      "[data-seller-tab]"
    );

    if (sellerTab) {
      event.preventDefault();

      activateSellerDetailsTab(
        sellerTab.dataset.sellerTab
      );

      return;
    }


    const openModalButton = event.target.closest(
      "[data-open-modal]"
    );

    if (openModalButton) {
      event.preventDefault();

      openAdminModal(
        openModalButton.dataset.openModal
      );

      return;
    }


    const closeModalButton = event.target.closest(
      "[data-close-modal]"
    );

    if (closeModalButton) {
      event.preventDefault();

      closeAdminModal(
        closeModalButton.dataset.closeModal
      );

      return;
    }


    const logoutButton = event.target.closest(
      "[data-admin-logout]"
    );

    if (logoutButton) {
      event.preventDefault();

      await logoutZuneAdmin();

      return;
    }


    const searchResult = event.target.closest(
      "[data-search-user]"
    );

    if (searchResult) {
      event.preventDefault();

      openGlobalSearchUser(
        searchResult.dataset.searchUser
      );

      return;
    }


    const exportButton = event.target.closest(
      "[data-export-audit]"
    );

    if (exportButton) {
      event.preventDefault();

      exportAdminAuditLogs();

      return;
    }

  });
}


/* =========================================================
   10. INPUT EVENT DELEGATION
========================================================= */

function bindZuneAdminInputs() {

  document.addEventListener("input", event => {

    const target = event.target;

    if (target.id === "globalAdminSearch") {
      if (target.value.trim().length >= 2) {
        performZuneAdminGlobalSearch(target.value);
      }
      return;
    }

    if (target.id === "auditLogsSearch") {
      searchAdminAuditLogs(target.value);
      return;
    }

    if (target.id === "securityEventsSearch") {
      searchAdminSecurityEvents(target.value);
      return;
    }

    if (target.id === "usersSearch") {
      if (typeof searchAdminUsers === "function") {
        searchAdminUsers(target.value);
      }
      return;
    }

    if (target.id === "sellersSearch") {
      if (typeof searchAdminSellers === "function") {
        searchAdminSellers(target.value);
      }
      return;
    }

    if (target.id === "productsSearch") {
      if (typeof searchAdminProducts === "function") {
        searchAdminProducts(target.value);
      }
      return;
    }

    if (target.classList.contains("monthly-audit-checkbox")) {
      updateMonthlyAuditProgress();
    }

  });


  document.addEventListener("change", event => {

    const target = event.target;

    if (target.id === "auditActionFilter") {
      filterAdminAuditLogs(target.value);
    }

    if (target.id === "securitySeverityFilter") {
      filterAdminSecurityEvents(target.value);
    }

  });

}


/* =========================================================
   11. MONTHLY AUDIT FORM
========================================================= */

function bindMonthlyAuditForm() {

  const form = adminElement("monthlyAuditForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const notes = adminElement("monthlyAuditNotes");
    const reason = adminElement("monthlyAuditReason");

    await saveMonthlyAdminAudit(
      notes ? notes.value : "",
      reason ? reason.value : ""
    );
  });

}


/* =========================================================
   12. KEYBOARD CONTROLS
========================================================= */

function bindAdminKeyboardControls() {

  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeAllAdminModals();
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      const search = adminElement("globalAdminSearch");

      if (search) {
        event.preventDefault();
        search.focus();
      }
    }

  });

}


/* =========================================================
   13. AUTHORIZATION CHECK BEFORE ACTIONS
========================================================= */

function requireZuneAdmin() {

  if (
    !ZUNE_ADMIN ||
    !ZUNE_ADMIN.isAuthenticated ||
    !ZUNE_ADMIN.user
  ) {
    showAdminMessage(
      "Tafadhali ingia tena kwenye akaunti ya Admin.",
      "error"
    );

    return false;
  }

  if (
    !ZUNE_ADMIN.profile ||
    ZUNE_ADMIN.profile.role !== "admin"
  ) {
    showAdminMessage(
      "Huna ruhusa ya kutumia Admin Dashboard.",
      "error"
    );

    return false;
  }

  return true;
}


/* =========================================================
   14. CONNECTION STATUS
========================================================= */

async function checkZuneAdminConnection() {

  const status = adminElement(
    "adminConnectionStatus"
  );

  try {
    const { error } = await adminDB
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) throw error;

    if (status) {
      status.textContent = "Connected";
      status.classList.add("connected");
      status.classList.remove("disconnected");
    }

    return true;

  } catch (error) {
    console.error("Connection check:", error);

    if (status) {
      status.textContent = "Connection error";
      status.classList.remove("connected");
      status.classList.add("disconnected");
    }

    return false;
  }
}


/* =========================================================
   15. ADMIN INITIALIZATION
========================================================= */

async function initializeZunePremiumAdmin() {

  if (ZUNE_ADMIN.initialized) return;

  try {

    if (!adminDB) {
      throw new Error(
        "Supabase client haijaanzishwa."
      );
    }

    const authorized = await verifyZuneAdmin();

    if (!authorized) {
      window.location.href = "login.html";
      return;
    }

    bindZuneAdminButtons();
    bindZuneAdminInputs();
    bindMonthlyAuditForm();
    bindAdminKeyboardControls();

    ZUNE_ADMIN.initialized = true;

    await checkZuneAdminConnection();

    await navigateZuneAdmin("dashboard");

    document.dispatchEvent(
      new CustomEvent("zune:admin-ready")
    );

    console.log(
      "ZUNE PREMIUM ADMIN imeanzishwa kikamilifu."
    );

  } catch (error) {

    console.error(
      "ZUNE ADMIN INITIALIZATION ERROR:",
      error
    );

    showAdminMessage(
      "Dashboard imeshindwa kuanzishwa: " +
      error.message,
      "error"
    );

  }

}


/* =========================================================
   16. GLOBAL FUNCTION EXPORTS
========================================================= */

window.navigateZuneAdmin = navigateZuneAdmin;
window.refreshCurrentAdminPage = refreshCurrentAdminPage;

window.openSellerDetails = openSellerDetails;
window.activateSellerDetailsTab = activateSellerDetailsTab;

window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.closeAllAdminModals = closeAllAdminModals;

window.performZuneAdminGlobalSearch =
  performZuneAdminGlobalSearch;

window.openGlobalSearchUser = openGlobalSearchUser;

window.requireZuneAdmin = requireZuneAdmin;
window.checkZuneAdminConnection = checkZuneAdminConnection;

window.initializeZunePremiumAdmin =
  initializeZunePremiumAdmin;


/* =========================================================
   17. START APPLICATION
========================================================= */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeZunePremiumAdmin,
    { once: true }
  );

} else {

  initializeZunePremiumAdmin();

}


/* =========================================================
   MWISHO WA ADMIN.JS — SEHEMU YA 7/7
========================================================= */
