
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   FILE: admin-auth.js
   SEHEMU YA 1/4
   Supabase Configuration + Authentication Foundation
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 1. SUPABASE CONFIGURATION
  // ---------------------------------------------------------

  const SUPABASE_URL =
    "https://rpkogiieegqgxqbzwxwo.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

  // Hakikisha Supabase JS imepakiwa kwenye index.html.
  if (!window.supabase || !window.supabase.createClient) {
    console.error(
      "ZUNE Admin: Supabase library haijapakiwa."
    );

    document.addEventListener("DOMContentLoaded", function () {
      const message = document.getElementById("adminGlobalMessage");

      if (message) {
        message.hidden = false;
        message.textContent =
          "Imeshindikana kuanzisha mfumo. Hakikisha Supabase JS imepakiwa.";
      }
    });

    return;
  }

  // ---------------------------------------------------------
  // 2. CREATE SUPABASE CLIENT
  // ---------------------------------------------------------

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // ---------------------------------------------------------
  // 3. ADMIN AUTHENTICATION STATE
  // ---------------------------------------------------------

  const AdminAuth = {
    client: supabaseClient,

    session: null,
    user: null,
    profile: null,

    isAuthenticated: false,
    isAdmin: false,
    isChecking: false,

    initialized: false,

    // -------------------------------------------------------
    // 4. GET HTML ELEMENTS
    // -------------------------------------------------------

    getElement: function (id) {
      return document.getElementById(id);
    },

    // -------------------------------------------------------
    // 5. DISPLAY GLOBAL MESSAGE
    // -------------------------------------------------------

    showMessage: function (message, type) {
      const element = this.getElement("adminGlobalMessage");

      if (element) {
        element.hidden = false;
        element.textContent = message;

        element.classList.remove(
          "message-success",
          "message-error",
          "message-warning",
          "message-info"
        );

        element.classList.add(
          "message-" + (type || "info")
        );

        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
      }

      console.log("[ZUNE Admin]", message);
    },

    // -------------------------------------------------------
    // 6. HIDE GLOBAL MESSAGE
    // -------------------------------------------------------

    hideMessage: function () {
      const element = this.getElement("adminGlobalMessage");

      if (element) {
        element.hidden = true;
        element.textContent = "";
      }
    },

    // -------------------------------------------------------
    // 7. CHECK REQUIRED HTML ELEMENTS
    // -------------------------------------------------------

    checkRequiredElements: function () {
      const requiredElements = [
        "adminDisplayName",
        "adminAvatar"
      ];

      const missing = requiredElements.filter(
        (id) => !this.getElement(id)
      );

      if (missing.length > 0) {
        console.warn(
          "ZUNE Admin: Baadhi ya HTML IDs hazipo:",
          missing
        );
      }

      return missing.length === 0;
    }
  };

  // ---------------------------------------------------------
  // 8. EXPOSE AUTHENTICATION OBJECT
  // ---------------------------------------------------------

  window.AdminAuth = AdminAuth;

  console.log(
    "ZUNE Admin: Authentication foundation imeanzishwa."
  );


/* =========================================================
   SEHEMU YA 2/4
   Session Management + Admin Role Verification
   Endelea ndani ya IIFE ileile ya Sehemu ya 1.
   ========================================================= */

// ---------------------------------------------------------
// 9. GET CURRENT SESSION
// ---------------------------------------------------------

AdminAuth.getCurrentSession = async function () {
  const { data, error } = await this.client.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
    throw error;
  }

  this.session = data.session || null;
  this.user = data.session?.user || null;
  this.isAuthenticated = Boolean(this.session);

  return this.session;
};

// ---------------------------------------------------------
// 10. LOAD SIGNED-IN USER PROFILE
// ---------------------------------------------------------

AdminAuth.loadProfile = async function () {
  if (!this.user) {
    this.profile = null;
    return null;
  }

  const { data, error } = await this.client
    .from("profiles")
    .select("id, full_name, role, is_verified")
    .eq("id", this.user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile loading error:", error.message);
    throw error;
  }

  this.profile = data || null;
  return this.profile;
};

// ---------------------------------------------------------
// 11. VERIFY ADMIN ROLE
// ---------------------------------------------------------

AdminAuth.verifyAdmin = async function () {
  this.isAdmin = false;

  // Lazima kuwe na session ya Supabase.
  if (!this.session || !this.user) {
    return {
      allowed: false,
      reason: "not_authenticated"
    };
  }

  // Pata profile ya mtumiaji aliyeingia.
  const profile = await this.loadProfile();

  if (!profile) {
    return {
      allowed: false,
      reason: "profile_not_found"
    };
  }

  // Ruhusa ya dashboard inategemea role ya database,
  // si jina, email, localStorage au badge inayoonekana.
  if (String(profile.role).toLowerCase() !== "admin") {
    return {
      allowed: false,
      reason: "not_admin"
    };
  }

  this.isAdmin = true;

  return {
    allowed: true,
    reason: "verified_admin",
    profile: profile
  };
};

// ---------------------------------------------------------
// 12. UPDATE ADMIN NAME AND AVATAR
// ---------------------------------------------------------

AdminAuth.updateAdminInterface = function () {
  if (!this.user || !this.profile) return;

  const displayName =
    this.profile.full_name ||
    this.user.user_metadata?.full_name ||
    this.user.email ||
    "Admin";

  const nameElement =
    document.getElementById("adminDisplayName");

  const avatarElement =
    document.getElementById("adminAvatar");

  if (nameElement) {
    nameElement.textContent = displayName;
  }

  if (avatarElement) {
    avatarElement.textContent =
      displayName.trim().charAt(0).toUpperCase() || "A";
    avatarElement.setAttribute(
      "aria-label",
      "Picha ya akaunti ya " + displayName
    );
  }

  // Badge ni ya kuonyesha hali tu.
  // Ruhusa halisi imeshakaguliwa kwenye database.
  const badge = document.getElementById("adminVerifiedBadge");

  if (badge) {
    badge.hidden = !this.profile.is_verified;
    badge.title = this.profile.is_verified
      ? "Akaunti imethibitishwa"
      : "Akaunti haijathibitishwa";
  }
};

// ---------------------------------------------------------
// 13. CHECK SESSION AND ADMIN PERMISSIONS
// ---------------------------------------------------------

AdminAuth.checkAccess = async function () {
  if (this.isChecking) return false;

  this.isChecking = true;

  try {
    const session = await this.getCurrentSession();

    if (!session) {
      this.isAuthenticated = false;
      this.isAdmin = false;
      return false;
    }

    const result = await this.verifyAdmin();

    if (!result.allowed) {
      this.isAdmin = false;

      if (result.reason === "not_admin") {
        this.showMessage(
          "Akaunti hii haina ruhusa ya kuingia Admin Dashboard.",
          "error"
        );
      } else if (result.reason === "profile_not_found") {
        this.showMessage(
          "Profile haijapatikana. Tafadhali hakikisha akaunti yako imesanidiwa.",
          "error"
        );
      }

      return false;
    }

    this.updateAdminInterface();
    this.hideMessage();

    return true;

  } catch (error) {
    console.error("Admin access check failed:", error);

    this.showMessage(
      "Imeshindikana kuthibitisha ruhusa. Angalia mtandao na sera za Supabase RLS.",
      "error"
    );

    return false;

  } finally {
    this.isChecking = false;
  }
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   SEHEMU YA 3/4
   Login + Logout + Session Events
   ========================================================= */

// ---------------------------------------------------------
// 14. ADMIN LOGIN
// ---------------------------------------------------------

AdminAuth.login = async function (email, password) {
  const cleanEmail = String(email || "").trim();

  if (!cleanEmail || !password) {
    this.showMessage(
      "Tafadhali jaza email na password.",
      "error"
    );
    return false;
  }

  this.showMessage("Tunaangalia taarifa zako...", "info");

  try {
    const { data, error } = await this.client.auth
      .signInWithPassword({
        email: cleanEmail,
        password: password
      });

    if (error) throw error;

    this.session = data.session;
    this.user = data.user;
    this.isAuthenticated = Boolean(data.session);

    const result = await this.verifyAdmin();

    if (!result.allowed) {
      // Ondoa session ikiwa akaunti si admin.
      await this.client.auth.signOut();

      this.session = null;
      this.user = null;
      this.profile = null;
      this.isAuthenticated = false;
      this.isAdmin = false;

      this.showMessage(
        result.reason === "profile_not_found"
          ? "Profile haijapatikana. Wasiliana na msimamizi."
          : "Akaunti hii haina ruhusa ya kuingia Admin Dashboard.",
        "error"
      );

      return false;
    }

    this.updateAdminInterface();

    this.showMessage(
      "Umeingia kwenye ZUNE Admin Dashboard.",
      "success"
    );

    // Ficha login panel ikiwa ipo.
    const loginPanel = document.getElementById("adminLoginPanel");
    if (loginPanel) loginPanel.hidden = true;

    // Onyesha eneo la dashboard ikiwa limewekewa ID hii.
    const dashboard = document.getElementById("adminDashboard");
    if (dashboard) dashboard.hidden = false;

    this.initialized = true;
    return true;

  } catch (error) {
    console.error("Admin login error:", error);

    this.showMessage(
      "Kuingia kumeshindikana. Hakikisha email, password na mtandao wako.",
      "error"
    );

    return false;
  }
};

// ---------------------------------------------------------
// 15. ADMIN LOGOUT
// ---------------------------------------------------------

AdminAuth.logout = async function () {
  try {
    const { error } = await this.client.auth.signOut();

    if (error) throw error;

    this.session = null;
    this.user = null;
    this.profile = null;
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.initialized = false;

    // Ficha dashboard, ikiwa ID hii ipo.
    const dashboard = document.getElementById("adminDashboard");
    if (dashboard) dashboard.hidden = true;

    // Onyesha login panel, ikiwa ID hii ipo.
    const loginPanel = document.getElementById("adminLoginPanel");
    if (loginPanel) loginPanel.hidden = false;

    this.showMessage(
      "Umetoka kwenye akaunti kwa usalama.",
      "success"
    );

    // Tumia login page iliyopo ikiwa imetengenezwa.
    // Ikiwa login iko ndani ya index.html, usielekeze
    // kwenye faili ambalo halipo.
    const loginForm = document.getElementById("adminLoginForm");

    if (loginForm) {
      loginForm.reset();
    }

    return true;

  } catch (error) {
    console.error("Admin logout error:", error);

    this.showMessage(
      "Imeshindikana kutoka. Jaribu tena.",
      "error"
    );

    return false;
  }
};

// ---------------------------------------------------------
// 16. BIND LOGIN FORM
// ---------------------------------------------------------

AdminAuth.bindLoginForm = function () {
  const form = document.getElementById("adminLoginForm");

  if (!form || form.dataset.authBound === "true") return;

  form.dataset.authBound = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("adminLoginEmail");
    const passwordInput = document.getElementById("adminLoginPassword");
    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    const email = emailInput?.value || "";
    const password = passwordInput?.value || "";

    if (submitButton) submitButton.disabled = true;

    try {
      await AdminAuth.login(email, password);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
};

// ---------------------------------------------------------
// 17. BIND LOGOUT BUTTONS
// ---------------------------------------------------------

AdminAuth.bindLogoutButtons = function () {
  const logoutIds = [
    "adminLogoutBtn",
    "mobileLogoutBtn"
  ];

  logoutIds.forEach((id) => {
    const button = document.getElementById(id);

    if (!button || button.dataset.authBound === "true") return;

    button.dataset.authBound = "true";

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const confirmed = window.confirm(
        "Unataka kutoka kwenye akaunti ya admin?"
      );

      if (confirmed) {
        await AdminAuth.logout();
      }
    });
  });
};

// ---------------------------------------------------------
// 18. LISTEN FOR SUPABASE AUTH CHANGES
// ---------------------------------------------------------

AdminAuth.bindAuthStateListener = function () {
  if (this.authListenerBound) return;

  this.authListenerBound = true;

  this.client.auth.onAuthStateChange((event, session) => {
    this.session = session || null;
    this.user = session?.user || null;
    this.isAuthenticated = Boolean(session);

    if (event === "SIGNED_OUT") {
      this.profile = null;
      this.isAdmin = false;
      this.initialized = false;
    }

    console.log(
      "ZUNE Admin auth event:",
      event
    );
  });
};

/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   SEHEMU YA 4/4
   Initialization + Session Check + Final Closure
   ========================================================= */

// ---------------------------------------------------------
// 19. INITIALIZE AUTHENTICATION
// ---------------------------------------------------------

AdminAuth.initialize = async function () {
  if (this.initialized) return;

  this.bindLoginForm();
  this.bindLogoutButtons();
  this.bindAuthStateListener();

  try {
    const allowed = await this.checkAccess();

    const loginPanel =
      document.getElementById("adminLoginPanel");

    const dashboard =
      document.getElementById("adminDashboard");

    if (allowed) {
      if (loginPanel) loginPanel.hidden = true;
      if (dashboard) dashboard.hidden = false;

      this.initialized = true;

      console.log(
        "ZUNE Admin: Admin access confirmed."
      );

      return;
    }

    if (dashboard) dashboard.hidden = true;

    // Ikiwa login form ipo kwenye index.html,
    // ionyeshe ili admin aweze kuingia.
    if (loginPanel) loginPanel.hidden = false;

    this.bindLoginForm();

  } catch (error) {
    console.error(
      "ZUNE Admin initialization error:",
      error
    );

    this.showMessage(
      "Imeshindikana kuanzisha uthibitishaji. Tafadhali jaribu tena.",
      "error"
    );
  }
};

// ---------------------------------------------------------
// 20. INITIALIZE WHEN HTML IS READY
// ---------------------------------------------------------

function startAdminAuthentication() {
  if (!window.AdminAuth) return;

  AdminAuth.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startAdminAuthentication,
    { once: true }
  );
} else {
  startAdminAuthentication();
}

// ---------------------------------------------------------
// 21. FINAL EXPORT
// ---------------------------------------------------------

window.AdminAuth = AdminAuth;

console.log(
  "ZUNE Premium Admin Authentication loaded."
);

// Muhimu: hii ndiyo closure ya mwisho ya Sehemu ya 1–4.
})();
})();
