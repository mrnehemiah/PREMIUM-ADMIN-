
/* =========================================================
   ZUNE PREMIUM ADMIN — LAYOUT SYSTEM
   Version: 2.0
   Dashboard mpya + Legacy pages support
========================================================= */

(function () {
  "use strict";

  /* =======================================================
     1. CONFIGURATION
  ======================================================= */

  if (window.__ZUNE_LAYOUT_INITIALIZED) return;
  window.__ZUNE_LAYOUT_INITIALIZED = true;

  const C = window.ZUNE_CONFIG || {};
  const sb = window.zuneSupabase;

  const path = location.pathname;
  const here = path.split("/").pop() || "index.html";

  const inPages = path.includes("/pages/");
  const root = inPages ? "../" : "";

  const isMainDashboard = here === "index.html";

  const pg = file =>
    inPages ? file : "pages/" + file;


  /* =======================================================
     2. AUTHENTICATION & ADMIN SECURITY
  ======================================================= */

  let authAllowed = true;

  const ready = (async function () {

    if (!C.AUTH_REQUIRED) return true;

    if (!sb || !sb.auth) {
      console.error("ZUNE: Supabase haijaanzishwa.");
      authAllowed = false;
      location.replace(root + "login.html");
      return false;
    }

    try {

      const {
        data: { session },
        error
      } = await sb.auth.getSession();

      if (error || !session) {
        authAllowed = false;
        location.replace(root + "login.html");
        return false;
      }

      const { data: profile, error: profileError } =
        await sb
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {

        await sb.auth.signOut();

        authAllowed = false;

        location.replace(root + "login.html");

        return false;
      }

      return true;

    } catch (error) {

      console.error("ZUNE authentication error:", error);

      authAllowed = false;

      location.replace(root + "login.html");

      return false;
    }

  })();


  /* =======================================================
     3. NAVIGATION MENU
  ======================================================= */

  const NAV = [

    ["Dashboard", root + "index.html", "▦"],

    ["Users", pg("users.html"), "👥"],

    ["Sellers", pg("sellers.html"), "🏪"],

    ["Verification", pg("verification.html"), "🛡️"],

    ["Products", pg("products.html"), "📦"],

    ["Orders", pg("orders.html"), "🧾"],

    ["Payments", pg("payments.html"), "💳"],

    ["Wallet", pg("wallet.html"), "💰"],

    ["Delivery Pricing", pg("delivery-pricing.html"), "🚚"],

    ["Coupons", pg("coupons.html"), "🏷️"],

    ["Announcements", pg("announcements.html"), "📣"],

    ["Notifications", pg("notifications.html"), "🔔"],

    ["Support Tickets", pg("support-tickets.html"), "🎧"],

    ["Disputes", pg("disputes.html"), "⚖️"],

    ["Reports", pg("reports.html"), "📊"],

    ["Security", pg("security.html"), "🔒"],

    ["Settings", pg("settings.html"), "⚙️"],

    ["Account", pg("account.html"), "👤"]

  ];


  /* =======================================================
     4. HELPER FUNCTIONS
  ======================================================= */

  const esc = value => {

    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
    );

  };


  /* =======================================================
     5. TOAST NOTIFICATIONS
  ======================================================= */

  function toast(message) {

    let element = document.getElementById("toast");

    if (!element) {

      element = document.createElement("div");

      element.id = "toast";

      element.setAttribute("role", "status");

      Object.assign(element.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "9999",
        display: "none",
        maxWidth: "90%",
        padding: "13px 18px",
        borderRadius: "12px",
        background: "#14372c",
        color: "#f4f2e9",
        border: "1px solid rgba(225,190,110,.3)",
        boxShadow: "0 10px 30px rgba(0,0,0,.3)"
      });

      document.body.appendChild(element);
    }

    element.textContent = message;

    element.style.display = "block";

    clearTimeout(element._timer);

    element._timer = setTimeout(() => {
      element.style.display = "none";
    }, 3000);

  }


  /* =======================================================
     6. STATUS BADGES
  ======================================================= */

  function pill(status) {

    const value = String(status ?? "");

    const key = value.toLowerCase();

    let cls = "";

    if (/active|verified|completed|approved|delivered/.test(key)) {
      cls = "ok";
    }

    else if (/pending|processing/.test(key)) {
      cls = "no";
    }

    else if (/suspend|reject|ban|fail|cancel|blocked/.test(key)) {
      cls = "bad";
    }

    return `
      <span class="pill ${cls}">
        ${esc(value)}
      </span>
    `;

  }


  /* =======================================================
     7. DATABASE LOADER
  ======================================================= */

  async function load(query, fallback = []) {

    const allowed = await ready;

    if (!allowed) return fallback;

    if (!sb || typeof query !== "function") {
      return fallback;
    }

    try {

      const { data, error } = await query(sb);

      if (error) {

        console.error("ZUNE database error:", error);

        toast(error.message);

        return fallback;
      }

      return data ?? fallback;

    } catch (error) {

      console.error("ZUNE loading error:", error);

      toast("Imeshindikana kupakia taarifa.");

      return fallback;
    }

  }


  /* =======================================================
     8. DYNAMIC TABLE BUILDER
  ======================================================= */

  function table(element, columns, rows = []) {

    if (!element) return;

    element.innerHTML = `
      <div class="card">
        <input
          type="search"
          placeholder="Tafuta..."
          aria-label="Tafuta"
        >
      </div>

      <div class="card sc">
        <table>
          <thead>
            <tr>
              ${columns.map(column => `
                <th>${esc(column[1])}</th>
              `).join("")}
            </tr>
          </thead>

          <tbody></tbody>
        </table>
      </div>
    `;

    const body = element.querySelector("tbody");

    const search = element.querySelector("input");

    function draw() {

      const keyword = search.value.toLowerCase();

      const filtered = rows.filter(row =>
        JSON.stringify(row)
          .toLowerCase()
          .includes(keyword)
      );

      if (!filtered.length) {

        body.innerHTML = `
          <tr>
            <td
              colspan="${columns.length}"
              class="empty-state"
            >
              Hakuna taarifa zilizopatikana.
            </td>
          </tr>
        `;

        return;
      }

      body.innerHTML = filtered.map(row => `

        <tr>

          ${columns.map(column => {

            const value = column[2]
              ? column[2](row)
              : esc(row[column[0]]);

            return `<td>${value ?? ""}</td>`;

          }).join("")}

        </tr>

      `).join("");

    }

    search.addEventListener("input", draw);

    draw();

  }


  /* =======================================================
     9. LEGACY LAYOUT
     Haitumiki kwenye index.html mpya.
  ======================================================= */

  function createLegacyLayout() {

    // Usitengeneze navigation ya zamani kwenye dashboard mpya.
    if (isMainDashboard) return;

    // Zuia layout kujirudia.
    if (document.getElementById("zuneLegacyApp")) return;

    const content = document.getElementById("content");

    if (!content) {
      console.warn("ZUNE: #content haijapatikana.");
      return;
    }

    const links = NAV.map(([name, href, icon]) => {

      const active =
        href.split("/").pop() === here ? "on" : "";

      return `
        <a
          href="${esc(href)}"
          class="${active}"
        >
          <span>${icon}</span>
          ${esc(name)}
        </a>
      `;

    }).join("");


    const app = document.createElement("div");

    app.id = "zuneLegacyApp";

    app.className = "app";

    app.innerHTML = `

      <aside id="sb">

        <div class="logo">

          <b>Z</b>

          <div>
            ZUNE
            <small>Admin Panel</small>
          </div>

        </div>

        ${links}

      </aside>

      <div id="scrim"></div>

      <div class="wrap">

        <div class="top">

          <button
            class="ib"
            id="mb"
            type="button"
            aria-label="Menu"
          >
            ☰
          </button>

          <div class="sp"></div>

          <span class="av">SA</span>

          <b>Super Admin</b>

        </div>

      </div>

    `;

    document.body.prepend(app);

    app.querySelector(".wrap").appendChild(content);


    /* Mobile menu */

    const sidebar = app.querySelector("#sb");

    const scrim = app.querySelector("#scrim");

    const menuButton = app.querySelector("#mb");

    function toggleMenu(force) {

      const open = typeof force === "boolean"
        ? force
        : !sidebar.classList.contains("open");

      sidebar.classList.toggle("open", open);

      scrim.classList.toggle("on", open);

    }

    menuButton.addEventListener("click", () => {
      toggleMenu();
    });

    scrim.addEventListener("click", () => {
      toggleMenu(false);
    });

    sidebar.querySelectorAll("a").forEach(link => {

      link.addEventListener("click", () => {
        toggleMenu(false);
      });

    });

  }


  /* =======================================================
     10. INITIALIZATION
  ======================================================= */

  if (!isMainDashboard) {
    createLegacyLayout();
  }


  /* =======================================================
     11. GLOBAL ZUNE API
     Functions zinazotumiwa na admin modules.
  ======================================================= */

  window.ZUNE = {

    sb,

    ready,

    load,

    toast,

    esc,

    pill,

    table,

    confirm: message => window.confirm(message)

  };


  /* =======================================================
     12. DEBUG INFORMATION
  ======================================================= */

  console.info(
    "ZUNE Admin Layout initialized:",
    isMainDashboard
      ? "Modern Dashboard"
      : "Legacy Admin Page"
  );

})();
