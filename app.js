
"use strict";

const ZuneApp = (() => {
  const SELECTORS = {
    themeToggle: "#themeToggle",
    currentYear: "#currentYear"
  };

  const THEME_KEY = "zune_premium_admin_theme";

  const getElement = (selector) => {
    return document.querySelector(selector);
  };

  // -------------------------------
  // 1. YEAR
  // -------------------------------

  function setCurrentYear() {
    const yearElement = getElement(SELECTORS.currentYear);

    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }

  // -------------------------------
  // 2. THEME
  // -------------------------------

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Ukurasa utaendelea kufanya kazi hata storage ikizuiwa.
    }
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);

    const themeButton = getElement(SELECTORS.themeToggle);

    if (themeButton) {
      themeButton.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';

      themeButton.setAttribute(
        "aria-label",
        isDark ? "Washa mwonekano mweupe" : "Washa mwonekano wa giza"
      );

      themeButton.setAttribute("aria-pressed", String(isDark));
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.setAttribute("content", isDark ? "#101914" : "#087f50");
    }
  }

  function initializeTheme() {
    const savedTheme = getSavedTheme();
    const initialTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : "light";

    applyTheme(initialTheme);

    const themeButton = getElement(SELECTORS.themeToggle);

    if (themeButton) {
      themeButton.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark")
          ? "light"
          : "dark";

        applyTheme(nextTheme);
        saveTheme(nextTheme);
      });
    }
  }

  // -------------------------------
  // 3. INTERNAL NAVIGATION
  // -------------------------------

  function initializeNavigation() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target = document.querySelector(targetId);

        if (!target) {
          return;
        }

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  // -------------------------------
  // 4. ADMIN LINK SAFETY
  // -------------------------------

  function initializeAdminLinks() {
    const adminLinks = document.querySelectorAll('a[href="admin.html"]');

    adminLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        /*
          Usibadilishe link kuwa uthibitisho wa admin.
          admin.html na admin.js lazima zikague Supabase Auth
          na profiles.role === "admin" kabla ya kuonyesha data.
        */

        const target = link.getAttribute("href");

        if (!target) {
          event.preventDefault();
          return;
        }

        // Ruhusu browser kufungua admin.html kawaida.
      });
    });
  }

  // -------------------------------
  // 5. START APPLICATION
  // -------------------------------

  function init() {
    setCurrentYear();
    initializeTheme();
    initializeNavigation();
    initializeAdminLinks();

    console.info("ZUNE Premium Admin homepage initialized.");
  }

  return { init };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ZuneApp.init);
} else {
  ZuneApp.init();
}
