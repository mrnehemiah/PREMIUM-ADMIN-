/* =========================================================
   ZUNE PREMIUM ADMIN
   app.js — SEHEMU YA 1/5
   Msingi wa programu na vipengele vya jumla
   ========================================================= */

"use strict";

/* ---------- 1. APP CONFIGURATION ---------- */

const ZUNE_ADMIN_APP = Object.freeze({
  name: "ZUNE PREMIUM ADMIN",
  version: "1.0.0",
  currency: "TZS",
  locale: "sw-TZ"
});

/* ---------- 2. SHARED APP STATE ---------- */

const AdminApp = {
  currentPage: "dashboard",
  isSidebarOpen: false,
  isMoreMenuOpen: false,
  isModalOpen: false,
  isInitialized: false,

  elements: {},

  pageTitles: {
    dashboard: "Dashboard",
    reports: "Takwimu na Ripoti",
    users: "Watumiaji",
    sellers: "Wauzaji",
    products: "Bidhaa",
    orders: "Oda",
    payments: "Malipo",
    verification: "Verification Center",
    coupons: "Coupons",
    announcements: "Matangazo ya Admin",
    settings: "Mipangilio"
  }
};

/* ---------- 3. DOM SELECTOR HELPERS ---------- */

AdminApp.get = function (selector, root = document) {
  return root.querySelector(selector);
};

AdminApp.getAll = function (selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
};

AdminApp.getById = function (id) {
  return document.getElementById(id);
};

/* ---------- 4. CACHE IMPORTANT ELEMENTS ---------- */

AdminApp.cacheElements = function () {
  const ids = [
    "adminApp",
    "adminSidebar",
    "sidebarOverlay",
    "adminContent",
    "pageTitle",
    "mobileMenuBtn",
    "mobileBottomNav",
    "mobileMoreBtn",
    "mobileMoreMenu",
    "closeMobileMoreBtn",
    "adminModalBackdrop",
    "adminModal",
    "adminModalTitle",
    "adminModalBody",
    "adminModalActions",
    "adminModalCloseBtn",
    "adminGlobalMessage",
    "adminRefreshBtn",
    "adminLogoutBtn",
    "mobileLogoutBtn",
    "adminProfileBtn",
    "adminNotificationsBtn",
    "adminDisplayName",
    "adminAvatar",
    "settingsAdminName",
    "settingsAdminEmail",
    "settingsAdminAvatar",
    "currentYear",
    "footerYear"
  ];

  ids.forEach((id) => {
    AdminApp.elements[id] = AdminApp.getById(id);
  });
};

/* ---------- 5. SAFE TEXT HELPERS ---------- */

AdminApp.setText = function (id, value) {
  const element = AdminApp.getById(id);

  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? ""
      : String(value);
};

AdminApp.setHidden = function (element, hidden) {
  if (!element) return;

  element.hidden = Boolean(hidden);
};

AdminApp.setDisabled = function (element, disabled) {
  if (!element) return;

  element.disabled = Boolean(disabled);
};

/* ---------- 6. INITIAL PAGE INFORMATION ---------- */

AdminApp.updateYear = function () {
  const year = new Date().getFullYear();

  AdminApp.setText("currentYear", year);
  AdminApp.setText("footerYear", year);
};

AdminApp.updatePageDate = function () {
  const dateElement = AdminApp.getById("dashboardDate");

  if (!dateElement) return;

  const now = new Date();

  dateElement.textContent = new Intl.DateTimeFormat(
    ZUNE_ADMIN_APP.locale,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(now);
};

/* ---------- 7. APP LOGGING ---------- */

AdminApp.log = function (message, details = null) {
  if (details !== null) {
    console.info(`[${ZUNE_ADMIN_APP.name}] ${message}`, details);
    return;
  }

  console.info(`[${ZUNE_ADMIN_APP.name}] ${message}`);
};

AdminApp.warn = function (message, error = null) {
  if (error) {
    console.warn(`[${ZUNE_ADMIN_APP.name}] ${message}`, error);
    return;
  }

  console.warn(`[${ZUNE_ADMIN_APP.name}] ${message}`);
};

/* ---------- 8. BASIC INITIALIZATION ---------- */

AdminApp.initializeBase = function () {
  if (AdminApp.isInitialized) return;

  AdminApp.cacheElements();
  AdminApp.updateYear();
  AdminApp.updatePageDate();

  AdminApp.isInitialized = true;

  AdminApp.log("Msingi wa app.js umeanzishwa.");
};/* =========================================================
   app.js — SEHEMU YA 2/5
   Page navigation na active states
   ========================================================= */

/* ---------- 9. SHOW A PAGE ---------- */

AdminApp.navigateTo = function (pageName) {
  const page = AdminApp.getById(`page-${pageName}`);

  if (!page || !AdminApp.pageTitles[pageName]) {
    AdminApp.warn(`Ukurasa haujapatikana: ${pageName}`);
    AdminApp.showMessage(
      "Ukurasa huu haujapatikana. Tafadhali kagua index.html.",
      "error"
    );
    return;
  }

  AdminApp.currentPage = pageName;

  // Ficha kurasa zote.
  AdminApp.getAll(".admin-page").forEach((section) => {
    section.classList.remove("active");
    section.hidden = true;
  });

  // Onyesha ukurasa uliochaguliwa.
  page.hidden = false;
  page.classList.add("active");

  // Sasisha kichwa cha ukurasa.
  AdminApp.setText(
    "pageTitle",
    AdminApp.pageTitles[pageName]
  );

  // Sasisha navigation ya desktop na simu.
  AdminApp.updateActiveNavigation(pageName);

  // Funga menyu za simu baada ya kuchagua ukurasa.
  AdminApp.closeSidebar();
  AdminApp.closeMoreMenu();

  // Rudisha ukurasa juu.
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  // Hifadhi hali kwenye history ya browser.
  try {
    window.history.replaceState(
      { page: pageName },
      "",
      `#${pageName}`
    );
  } catch (error) {
    AdminApp.warn("History haikuweza kusasishwa.", error);
  }

  document.dispatchEvent(
    new CustomEvent("zune:admin-page-changed", {
      detail: { page: pageName }
    })
  );

  AdminApp.log(`Ukurasa umefunguliwa: ${pageName}`);
};

/* ---------- 10. ACTIVE NAVIGATION ---------- */

AdminApp.updateActiveNavigation = function (pageName) {
  AdminApp.getAll("[data-page]").forEach((button) => {
    const isActive = button.dataset.page === pageName;

    button.classList.toggle("active", isActive);

    if (
      button.classList.contains("nav-item") ||
      button.classList.contains("mobile-nav-item")
    ) {
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  });
};

/* ---------- 11. BIND NAVIGATION BUTTONS ---------- */

AdminApp.bindNavigation = function () {
  AdminApp.getAll("[data-page]").forEach((button) => {
    if (button.dataset.navigationBound === "true") return;

    button.dataset.navigationBound = "true";

    button.addEventListener("click", () => {
      const pageName = button.dataset.page;

      if (!pageName) return;

      AdminApp.navigateTo(pageName);
    });
  });
};

/* ---------- 12. RESTORE PAGE FROM URL ---------- */

AdminApp.restorePageFromURL = function () {
  const requestedPage = window.location.hash
    .replace(/^#/, "")
    .trim();

  if (
    requestedPage &&
    AdminApp.pageTitles[requestedPage] &&
    AdminApp.getById(`page-${requestedPage}`)
  ) {
    AdminApp.navigateTo(requestedPage);
    return;
  }

  AdminApp.navigateTo("dashboard");
};

/* ---------- 13. HANDLE BROWSER BACK/FORWARD ---------- */

AdminApp.bindHistoryNavigation = function () {
  window.addEventListener("hashchange", () => {
    const pageName = window.location.hash
      .replace(/^#/, "")
      .trim();

    if (
      pageName &&
      AdminApp.pageTitles[pageName] &&
      AdminApp.getById(`page-${pageName}`)
    ) {
      AdminApp.navigateTo(pageName);
    }
  });
};/* =========================================================
   app.js — SEHEMU YA 3/5
   Mobile sidebar, bottom navigation na More menu
   ========================================================= */

/* ---------- 14. OPEN SIDEBAR ---------- */

AdminApp.openSidebar = function () {
  const sidebar = AdminApp.getById("adminSidebar");
  const overlay = AdminApp.getById("sidebarOverlay");
  const menuButton = AdminApp.getById("mobileMenuBtn");

  if (!sidebar) return;

  sidebar.classList.add("sidebar-open");

  if (overlay) {
    overlay.classList.add("overlay-visible");
    overlay.hidden = false;
  }

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "true");
  }

  AdminApp.isSidebarOpen = true;
};

/* ---------- 15. CLOSE SIDEBAR ---------- */

AdminApp.closeSidebar = function () {
  const sidebar = AdminApp.getById("adminSidebar");
  const overlay = AdminApp.getById("sidebarOverlay");
  const menuButton = AdminApp.getById("mobileMenuBtn");

  if (sidebar) {
    sidebar.classList.remove("sidebar-open");
  }

  if (overlay) {
    overlay.classList.remove("overlay-visible");
    overlay.hidden = true;
  }

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "false");
  }

  AdminApp.isSidebarOpen = false;
};

/* ---------- 16. TOGGLE SIDEBAR ---------- */

AdminApp.toggleSidebar = function () {
  if (AdminApp.isSidebarOpen) {
    AdminApp.closeSidebar();
  } else {
    AdminApp.openSidebar();
  }
};

/* ---------- 17. OPEN MORE MENU ---------- */

AdminApp.openMoreMenu = function () {
  const menu = AdminApp.getById("mobileMoreMenu");
  const button = AdminApp.getById("mobileMoreBtn");

  if (!menu) return;

  menu.hidden = false;
  menu.classList.add("more-menu-open");

  if (button) {
    button.classList.add("active");
    button.setAttribute("aria-expanded", "true");
  }

  AdminApp.isMoreMenuOpen = true;
};

/* ---------- 18. CLOSE MORE MENU ---------- */

AdminApp.closeMoreMenu = function () {
  const menu = AdminApp.getById("mobileMoreMenu");
  const button = AdminApp.getById("mobileMoreBtn");

  if (menu) {
    menu.classList.remove("more-menu-open");
    menu.hidden = true;
  }

  if (button) {
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("active");
  }

  AdminApp.isMoreMenuOpen = false;
};

/* ---------- 19. TOGGLE MORE MENU ---------- */

AdminApp.toggleMoreMenu = function () {
  if (AdminApp.isMoreMenuOpen) {
    AdminApp.closeMoreMenu();
  } else {
    AdminApp.openMoreMenu();
  }
};

/* ---------- 20. BIND MOBILE CONTROLS ---------- */

AdminApp.bindMobileControls = function () {
  const menuButton = AdminApp.getById("mobileMenuBtn");
  const overlay = AdminApp.getById("sidebarOverlay");
  const moreButton = AdminApp.getById("mobileMoreBtn");
  const closeMoreButton = AdminApp.getById("closeMobileMoreBtn");

  if (menuButton && menuButton.dataset.bound !== "true") {
    menuButton.dataset.bound = "true";

    menuButton.addEventListener("click", () => {
      AdminApp.toggleSidebar();
    });
  }

  if (overlay && overlay.dataset.bound !== "true") {
    overlay.dataset.bound = "true";

    overlay.addEventListener("click", () => {
      AdminApp.closeSidebar();
    });
  }

  if (moreButton && moreButton.dataset.bound !== "true") {
    moreButton.dataset.bound = "true";

    moreButton.addEventListener("click", () => {
      AdminApp.toggleMoreMenu();
    });
  }

  if (
    closeMoreButton &&
    closeMoreButton.dataset.bound !== "true"
  ) {
    closeMoreButton.dataset.bound = "true";

    closeMoreButton.addEventListener("click", () => {
      AdminApp.closeMoreMenu();
    });
  }
};

/* ---------- 21. CLOSE MENUS WITH ESCAPE ---------- */

AdminApp.bindEscapeKey = function () {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    AdminApp.closeSidebar();
    AdminApp.closeMoreMenu();
    AdminApp.closeModal();
  });
};

/* ---------- 22. RESPONSIVE MENU CLEANUP ---------- */

AdminApp.bindResponsiveCleanup = function () {
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      AdminApp.closeSidebar();
      AdminApp.closeMoreMenu();
    }
  });
};/* =========================================================
   app.js — SEHEMU YA 4/5
   Modals, messages na general actions
   ========================================================= */

/* ---------- 23. GLOBAL MESSAGE ---------- */

AdminApp.showMessage = function (
  message,
  type = "info",
  duration = 4500
) {
  const element = AdminApp.getById("adminGlobalMessage");

  if (!element) {
    console.info(message);
    return;
  }

  element.textContent = String(message);
  element.className = `global-message message-${type}`;
  element.hidden = false;

  if (AdminApp.messageTimeout) {
    window.clearTimeout(AdminApp.messageTimeout);
  }

  if (duration > 0) {
    AdminApp.messageTimeout = window.setTimeout(() => {
      element.hidden = true;
    }, duration);
  }
};

/* ---------- 24. OPEN MODAL ---------- */

AdminApp.openModal = function ({
  title = "Taarifa",
  content = "",
  actions = []
} = {}) {
  const backdrop = AdminApp.getById("adminModalBackdrop");
  const titleElement = AdminApp.getById("adminModalTitle");
  const bodyElement = AdminApp.getById("adminModalBody");
  const actionsElement = AdminApp.getById("adminModalActions");

  if (!backdrop || !bodyElement) {
    AdminApp.showMessage(
      "Sehemu ya modal haijapatikana kwenye index.html.",
      "error"
    );
    return;
  }

  if (titleElement) {
    titleElement.textContent = title;
  }

  // Maudhui ya kawaida yanawekwa kama maandishi salama.
  if (content instanceof Node) {
    bodyElement.replaceChildren(content);
  } else {
    bodyElement.textContent = String(content);
  }

  if (actionsElement) {
    actionsElement.replaceChildren();

    actions.forEach((action) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = action.className || "outline-button";
      button.textContent = action.label || "Sawa";

      button.addEventListener("click", () => {
        if (typeof action.onClick === "function") {
          action.onClick();
        }

        if (action.closeOnClick !== false) {
          AdminApp.closeModal();
        }
      });

      actionsElement.appendChild(button);
    });
  }

  backdrop.hidden = false;
  backdrop.classList.add("modal-visible");
  AdminApp.isModalOpen = true;

  const closeButton = AdminApp.getById("adminModalCloseBtn");

  if (closeButton) {
    closeButton.focus();
  }
};

/* ---------- 25. CLOSE MODAL ---------- */

AdminApp.closeModal = function () {
  const backdrop = AdminApp.getById("adminModalBackdrop");

  if (!backdrop) return;

  backdrop.classList.remove("modal-visible");
  backdrop.hidden = true;

  AdminApp.isModalOpen = false;
};

/* ---------- 26. BIND MODAL CONTROLS ---------- */

AdminApp.bindModalControls = function () {
  const closeButton = AdminApp.getById("adminModalCloseBtn");
  const backdrop = AdminApp.getById("adminModalBackdrop");
  const modal = AdminApp.getById("adminModal");

  if (closeButton && closeButton.dataset.bound !== "true") {
    closeButton.dataset.bound = "true";

    closeButton.addEventListener("click", () => {
      AdminApp.closeModal();
    });
  }

  if (backdrop && backdrop.dataset.bound !== "true") {
    backdrop.dataset.bound = "true";

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        AdminApp.closeModal();
      }
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
};

/* ---------- 27. REFRESH BUTTON ---------- */

AdminApp.bindRefreshButton = function () {
  const button = AdminApp.getById("adminRefreshBtn");

  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";

  button.addEventListener("click", async () => {
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Inasasisha...";

    try {
      /*
       * Moduli za data zitaunganishwa hapa baadaye.
       * Hatutengenezi takwimu bandia.
       */
      document.dispatchEvent(
        new CustomEvent("zune:admin-refresh-requested", {
          detail: { page: AdminApp.currentPage }
        })
      );

      AdminApp.showMessage(
        "Ombi la kusasisha limetumwa. Data halisi itapatikana baada ya kuunganisha huduma za Supabase.",
        "info"
      );
    } catch (error) {
      AdminApp.warn("Refresh imeshindwa.", error);

      AdminApp.showMessage(
        "Imeshindikana kuanzisha usasishaji.",
        "error"
      );
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
};

/* ---------- 28. PROFILE BUTTON ---------- */

AdminApp.bindProfileButton = function () {
  const button = AdminApp.getById("adminProfileBtn");

  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";

  button.addEventListener("click", () => {
    AdminApp.navigateTo("settings");
  });
};

/* ---------- 29. NOTIFICATIONS BUTTON ---------- */

AdminApp.bindNotificationsButton = function () {
  const button = AdminApp.getById("adminNotificationsBtn");

  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";

  button.addEventListener("click", () => {
    AdminApp.openModal({
      title: "Notifications",
      content:
        "Taarifa za Admin zitaonekana hapa baada ya kuunganisha mfumo wa notifications."
    });
  });
};

/* ---------- 30. INITIAL BUTTON BINDING ---------- */

AdminApp.bindGeneralActions = function () {
  AdminApp.bindRefreshButton();
  AdminApp.bindProfileButton();
  AdminApp.bindNotificationsButton();
  AdminApp.bindModalControls();
};/* =========================================================
   app.js — SEHEMU YA 5/5
   Initialization na application startup
   ========================================================= */

/* ---------- 31. HANDLE KEYBOARD ACCESSIBILITY ---------- */

AdminApp.bindAccessibility = function () {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");

    if (!link) return;

    const pageName = link.getAttribute("href").slice(1);

    if (AdminApp.pageTitles[pageName]) {
      event.preventDefault();
      AdminApp.navigateTo(pageName);
    }
  });
};

/* ---------- 32. APPLICATION STARTUP ---------- */

AdminApp.start = function () {
  if (AdminApp.isStarted) return;

  AdminApp.initializeBase();

  AdminApp.bindNavigation();
  AdminApp.bindHistoryNavigation();
  AdminApp.bindMobileControls();
  AdminApp.bindEscapeKey();
  AdminApp.bindResponsiveCleanup();
  AdminApp.bindGeneralActions();
  AdminApp.bindAccessibility();

  AdminApp.restorePageFromURL();

  AdminApp.isStarted = true;

  AdminApp.log(
    `${ZUNE_ADMIN_APP.name} v${ZUNE_ADMIN_APP.version} imeanzishwa.`
  );

  document.dispatchEvent(
    new CustomEvent("zune:admin-app-ready")
  );
};

/* ---------- 33. START WHEN HTML IS READY ---------- */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminApp.start(),
    { once: true }
  );
} else {
  AdminApp.start();
}

/* ---------- 34. EXPOSE APP API FOR OTHER MODULES ---------- */

window.ZUNEAdmin = AdminApp; 