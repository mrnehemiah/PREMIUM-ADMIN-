// ============================================================
// ZUNE PREMIUM ADMIN — admin.js
// SEHEMU YA 1/5: CONFIGURATION, AUTHENTICATION & CORE UTILITIES
// ============================================================

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {

    // --------------------------------------------------------
    // 1. SUPABASE CONFIGURATION
    // --------------------------------------------------------

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY =
      window.SUPABASE_ANON_KEY ||
      window.SUPABASE_PUBLISHABLE_KEY;

    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
      console.error("ZUNE: Supabase configuration haijapatikana.");
      alert("Tatizo la muunganisho. Hakikisha js/config.js imepakiwa.");
      return;
    }

    const db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    window.ZUNE_ADMIN_DB = db;

    // --------------------------------------------------------
    // 2. GLOBAL ELEMENTS
    // --------------------------------------------------------

    const $ = (selector, root = document) =>
      root.querySelector(selector);

    const $$ = (selector, root = document) =>
      [...root.querySelectorAll(selector)];

    const globalMessage = $("#globalMessage");

    let currentAdmin = null;
    let currentSession = null;
    let refreshInProgress = false;

    // --------------------------------------------------------
    // 3. MESSAGE SYSTEM
    // --------------------------------------------------------

    function showMessage(message, type = "success", duration = 5000) {
      if (!globalMessage) {
        console.log(message);
        return;
      }

      globalMessage.hidden = false;
      globalMessage.textContent = message;

      const colors = {
        success: ["#e7f5ef", "#087f5b", "#c8eadb"],
        error: ["#fff0f0", "#b42323", "#f2caca"],
        warning: ["#fff8e8", "#805b16", "#f0dfb5"],
        info: ["#edf4ff", "#315ca6", "#d3e1fa"]
      };

      const selected = colors[type] || colors.info;

      globalMessage.style.background = selected[0];
      globalMessage.style.color = selected[1];
      globalMessage.style.borderColor = selected[2];

      clearTimeout(showMessage.timer);

      showMessage.timer = setTimeout(() => {
        globalMessage.hidden = true;
      }, duration);
    }

    window.ZUNE_ADMIN_MESSAGE = showMessage;

    // --------------------------------------------------------
    // 4. HTML SECURITY
    // --------------------------------------------------------

    function escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };

        return entities[character];
      });
    }

    function formatMoney(value, currency = "TZS") {
      const amount = Number(value || 0);

      return new Intl.NumberFormat("sw-TZ", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
      }).format(amount);
    }

    function formatNumber(value) {
      return new Intl.NumberFormat("sw-TZ").format(
        Number(value || 0)
      );
    }

    function formatDate(value) {
      if (!value) return "Haijulikani";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Haijulikani";
      }

      return new Intl.DateTimeFormat("sw-TZ", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    }

    function statusLabel(status) {
      const labels = {
        pending: "Inasubiri",
        approved: "Imeidhinishwa",
        rejected: "Imekataliwa",
        completed: "Imekamilika",
        paid: "Imelipwa",
        failed: "Imeshindwa",
        cancelled: "Imeghairiwa",
        active: "Inaendelea",
        inactive: "Haifanyi kazi",
        published: "Imechapishwa",
        draft: "Rasimu",
        suspended: "Imesimamishwa"
      };

      return labels[String(status || "").toLowerCase()] ||
        String(status || "Haijulikani");
    }

    function statusBadge(status) {
      const value = String(status || "").toLowerCase();

      let color = "#647067";
      let background = "#f0f3f0";

      if (["approved", "completed", "paid", "active", "published"].includes(value)) {
        color = "#087f5b";
        background = "#e7f5ef";
      }

      if (["pending", "draft"].includes(value)) {
        color = "#93630c";
        background = "#fff5df";
      }

      if (["rejected", "failed", "cancelled", "suspended"].includes(value)) {
        color = "#b42323";
        background = "#fff0f0";
      }

      return `
        <span style="
          display:inline-block;
          padding:5px 9px;
          border-radius:20px;
          font-size:9px;
          font-weight:800;
          color:${color};
          background:${background};
        ">
          ${escapeHTML(statusLabel(status))}
        </span>
      `;
    }

    // --------------------------------------------------------
    // 5. BUTTON LOADING
    // --------------------------------------------------------

    function setButtonLoading(button, loading, loadingText = "Inachakata...") {
      if (!button) return;

      if (loading) {
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.innerHTML;
        }

        button.disabled = true;
        button.style.opacity = "0.65";
        button.innerHTML = escapeHTML(loadingText);
      } else {
        button.disabled = false;
        button.style.opacity = "1";

        if (button.dataset.originalText) {
          button.innerHTML = button.dataset.originalText;
          delete button.dataset.originalText;
        }
      }
    }

    // --------------------------------------------------------
    // 6. SAFE DATABASE ERROR HANDLING
    // --------------------------------------------------------

    function handleDatabaseError(error, action = "operesheni") {
      console.error(`ZUNE ${action}:`, error);

      const message = error?.message || "Hitilafu isiyojulikana.";

      showMessage(
        `${action} haikufanikiwa: ${message}`,
        "error",
        8000
      );
    }

    // --------------------------------------------------------
    // 7. AUTHENTICATION
    // --------------------------------------------------------

    async function verifyAdmin() {
      const {
        data: sessionData,
        error: sessionError
      } = await db.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      currentSession = sessionData.session;

      if (!currentSession?.user) {
        window.location.replace("login.html");
        return false;
      }

      const userId = currentSession.user.id;

      const {
        data: profile,
        error: profileError
      } = await db
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile || profile.role !== "admin") {
        await db.auth.signOut();
        window.location.replace("login.html");
        return false;
      }

      currentAdmin = {
        id: userId,
        email: currentSession.user.email || "",
        role: profile.role
      };

      const adminName = $("#adminName");
      const adminAvatar = $("#adminAvatar");

      if (adminName) {
        adminName.textContent =
          currentSession.user.user_metadata?.full_name ||
          currentSession.user.email ||
          "Admin Mkuu";
      }

      if (adminAvatar) {
        const name =
          currentSession.user.user_metadata?.full_name ||
          currentSession.user.email ||
          "A";

        adminAvatar.textContent = name.charAt(0).toUpperCase();
      }

      return true;
    }

    // --------------------------------------------------------
    // 8. ADMIN AUDIT LOG
    // --------------------------------------------------------

    async function recordAdminAction(
      action,
      targetUserId = null,
      reason = ""
    ) {
      if (!currentAdmin?.id) {
        console.warn("Audit log haijaandikwa: Admin ID haipo.");
        return false;
      }

      const record = {
        admin_id: currentAdmin.id,
        target_user_id: targetUserId,
        action: String(action).slice(0, 500),
        reason: String(reason || "").slice(0, 2000)
      };

      const { error } = await db
        .from("admin_user_actions")
        .insert(record);

      if (error) {
        console.error("Admin audit log failed:", error);
        showMessage(
          "Tahadhari: Kitendo kimefanyika lakini audit log haijaandikwa.",
          "warning",
          8000
        );
        return false;
      }

      return true;
    }

    window.ZUNE_RECORD_ADMIN_ACTION = recordAdminAction;

    // --------------------------------------------------------
    // 9. ADMIN SESSION MONITOR
    // --------------------------------------------------------

    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.replace("login.html");
      }
    });

    // --------------------------------------------------------
    // 10. LOGOUT
    // --------------------------------------------------------

    const logoutButton = $("#logoutButton");

    logoutButton?.addEventListener("click", async () => {
      if (!confirm("Una uhakika unataka kutoka kwenye akaunti?")) {
        return;
      }

      setButtonLoading(logoutButton, true, "Inatoka...");

      await recordAdminAction(
        "ADMIN_LOGOUT",
        null,
        "Admin Mkuu ametoka kwenye dashboard."
      );

      const { error } = await db.auth.signOut();

      if (error) {
        handleDatabaseError(error, "Logout");
        setButtonLoading(logoutButton, false);
        return;
      }

      window.location.replace("login.html");
    });

    // --------------------------------------------------------
    // 11. DATABASE COUNT HELPER
    // --------------------------------------------------------

    async function getCount(table, configureQuery = null) {
      let query = db
        .from(table)
        .select("*", { count: "exact", head: true });

      if (typeof configureQuery === "function") {
        query = configureQuery(query);
      }

      const { count, error } = await query;

      if (error) {
        console.error(`Count error (${table}):`, error);
        return null;
      }

      return count ?? 0;
    }

    function updateStat(elementId, value) {
      const element = document.getElementById(elementId);

      if (!element) return;

      element.textContent =
        value === null ? "—" : formatNumber(value);
    }

    // Sehemu ya 2 itaendelea hapa.
    // ========================================================
    // SEHEMU YA 2/5: DASHBOARD, STATISTICS & ANNOUNCEMENTS
    // ========================================================

    // --------------------------------------------------------
    // 12. DASHBOARD STATISTICS
    // --------------------------------------------------------

    async function loadDashboardStats() {
      const [users, vendors, products, orders] = await Promise.all([
        getCount("profiles"),
        getCount("profiles", query =>
          query.eq("role", "vendor")
        ),
        getCount("products"),
        getCount("orders")
      ]);

      updateStat("totalUsers", users);
      updateStat("totalSellers", vendors);
      updateStat("totalProducts", products);
      updateStat("totalOrders", orders);

      return { users, vendors, products, orders };
    }

    // --------------------------------------------------------
    // 13. ADMIN ANNOUNCEMENTS
    // Table: admin_announcements
    // --------------------------------------------------------

    const announcementsList = $("#announcementsList");

    function renderAnnouncement(item) {
      const title = escapeHTML(item.title);
      const message = escapeHTML(item.message);
      const audience = escapeHTML(item.audience);
      const priority = escapeHTML(item.priority);
      const status = statusBadge(item.status);

      return `
        <article style="
          border:1px solid #e5ebe6;
          border-radius:13px;
          padding:13px;
          margin-bottom:9px;
          background:#fff;
        ">
          <div style="
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:10px;
          ">
            <div style="min-width:0">
              <strong style="font-size:12px">${title}</strong>
              <p style="
                font-size:10px;
                color:#68766d;
                line-height:1.6;
                margin:7px 0;
                white-space:pre-wrap;
              ">${message}</p>
              <small style="font-size:9px;color:#8a968e">
                Audience: ${audience}
                · Priority: ${priority}
              </small>
              <div style="margin-top:8px">${status}</div>
            </div>
            <small style="
              font-size:9px;
              color:#87938b;
              white-space:nowrap;
            ">${formatDate(item.created_at)}</small>
          </div>
        </article>
      `;
    }

    async function loadAnnouncements() {
      if (!announcementsList) return;

      announcementsList.innerHTML = `
        <div class="announcement-empty">Inapakia matangazo...</div>
      `;

      const { data, error } = await db
        .from("admin_announcements")
        .select(`
          id,
          title,
          message,
          audience,
          display_type,
          priority,
          status,
          created_by,
          created_at,
          expires_at
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        announcementsList.innerHTML = `
          <div class="announcement-empty">
            Matangazo hayajapakiwa. Hakikisha ruhusa za Supabase zinaruhusu kusoma.
          </div>
        `;

        console.error("Announcements:", error);
        return;
      }

      if (!data?.length) {
        announcementsList.innerHTML = `
          <div class="announcement-empty">
            Hakuna matangazo yaliyopatikana.
          </div>
        `;
        return;
      }

      announcementsList.innerHTML =
        data.map(renderAnnouncement).join("");
    }

    // --------------------------------------------------------
    // 14. CREATE ANNOUNCEMENT FORM
    // --------------------------------------------------------

    function createAnnouncementPanel() {
      const marketingCard = $("#marketing");

      if (!marketingCard || $("#adminAnnouncementForm")) return;

      const panel = document.createElement("div");

      panel.id = "adminAnnouncementForm";

      panel.style.cssText = `
        margin-top:14px;
        padding:15px;
        border:1px solid #e5ebe6;
        border-radius:14px;
        background:#fff;
      `;

      panel.innerHTML = `
        <div style="font-weight:800;font-size:12px;margin-bottom:12px">
          Tengeneza tangazo jipya la admin
        </div>

        <form id="announcementCreateForm">
          <label style="display:block;font-size:10px;margin-bottom:5px">
            Kichwa cha tangazo
          </label>

          <input
            name="title"
            maxlength="180"
            required
            placeholder="Mfano: Taarifa muhimu kwa watumiaji"
            style="
              width:100%;
              padding:11px;
              border:1px solid #e1e8e2;
              border-radius:9px;
              margin-bottom:11px;
              font-size:11px;
            "
          >

          <label style="display:block;font-size:10px;margin-bottom:5px">
            Ujumbe
          </label>

          <textarea
            name="message"
            maxlength="5000"
            required
            rows="4"
            placeholder="Andika ujumbe wa tangazo..."
            style="
              width:100%;
              padding:11px;
              border:1px solid #e1e8e2;
              border-radius:9px;
              resize:vertical;
              margin-bottom:11px;
              font-size:11px;
            "
          ></textarea>

          <div style="
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:10px;
          ">
            <div>
              <label style="display:block;font-size:10px;margin-bottom:5px">
                Audience
              </label>
              <select name="audience" style="
                width:100%;padding:10px;border:1px solid #e1e8e2;
                border-radius:9px;font-size:10px
              ">
                <option value="all">Wote</option>
                <option value="buyers">Buyers</option>
                <option value="vendors">Vendors</option>
                <option value="admins">Admins</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:10px;margin-bottom:5px">
                Aina ya tangazo
              </label>
              <select name="display_type" style="
                width:100%;padding:10px;border:1px solid #e1e8e2;
                border-radius:9px;font-size:10px
              ">
                <option value="banner">Banner</option>
                <option value="notice">Notice</option>
                <option value="popup">Popup</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:10px;margin-bottom:5px">
                Kipaumbele
              </label>
              <select name="priority" style="
                width:100%;padding:10px;border:1px solid #e1e8e2;
                border-radius:9px;font-size:10px
              ">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:10px;margin-bottom:5px">
                Hali
              </label>
              <select name="status" style="
                width:100%;padding:10px;border:1px solid #e1e8e2;
                border-radius:9px;font-size:10px
              ">
                <option value="draft">Rasimu</option>
                <option value="published">Chapisha</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn primary" style="margin-top:12px">
            + Hifadhi tangazo
          </button>
        </form>
      `;

      marketingCard.appendChild(panel);

      $("#announcementCreateForm")?.addEventListener(
        "submit",
        createAnnouncement
      );
    }

    async function createAnnouncement(event) {
      event.preventDefault();

      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);

      const title = String(formData.get("title") || "").trim();
      const message = String(formData.get("message") || "").trim();

      if (!title || !message) {
        showMessage("Jaza kichwa na ujumbe wa tangazo.", "warning");
        return;
      }

      if (!currentAdmin?.id) {
        showMessage("Admin hajathibitishwa.", "error");
        return;
      }

      const record = {
        title,
        message,
        audience: String(formData.get("audience")),
        display_type: String(formData.get("display_type")),
        priority: String(formData.get("priority")),
        status: String(formData.get("status")),
        created_by: currentAdmin.id
      };

      setButtonLoading(button, true, "Inahifadhi...");

      const { data, error } = await db
        .from("admin_announcements")
        .insert(record)
        .select("id")
        .single();

      setButtonLoading(button, false);

      if (error) {
        handleDatabaseError(error, "Kuhifadhi tangazo");
        return;
      }

      await recordAdminAction(
        "CREATE_ADMIN_ANNOUNCEMENT",
        null,
        `Tangazo: ${title}; ID: ${data.id}`
      );

      form.reset();

      showMessage("Tangazo limehifadhiwa.", "success");
      await loadAnnouncements();
    }

    // --------------------------------------------------------
    // 15. ANNOUNCEMENT REFRESH
    // --------------------------------------------------------

    async function refreshAnnouncementData() {
      await loadAnnouncements();
    }

    // Sehemu ya 3 itaendelea hapa.
    // ========================================================
    // SEHEMU YA 3/5: SELLER MANAGEMENT, WALLET & TRANSACTIONS
    // ========================================================

    // --------------------------------------------------------
    // 16. SELLER MANAGEMENT PANEL
    // --------------------------------------------------------

    function createSellerManagementPanel() {
      const sellerCard = $("#sellers");

      if (!sellerCard || $("#sellerPromotionPanel")) return;

      const panel = document.createElement("div");

      panel.id = "sellerPromotionPanel";
      panel.style.cssText = `
        margin-top:14px;
        padding:15px;
        border:1px solid #e5ebe6;
        border-radius:14px;
        background:#fff;
      `;

      panel.innerHTML = `
        <h4 style="font-size:12px;margin:0 0 7px">
          Mbadili Buyer kuwa Vendor
        </h4>

        <p style="
          font-size:10px;
          color:#75827b;
          line-height:1.6;
          margin:0 0 12px;
        ">
          Tumia email ya akaunti ya mteja. Mfumo utatumia RPC
          iliyopo ya admin_promote_customer_to_vendor.
        </p>

        <form id="sellerPromotionForm">
          <input
            type="email"
            name="customer_email"
            required
            placeholder="Email ya mteja"
            style="
              width:100%;
              padding:11px;
              border:1px solid #e1e8e2;
              border-radius:9px;
              margin-bottom:10px;
              font-size:11px;
            "
          >

          <button class="btn primary" type="submit">
            Mbadili kuwa Vendor
          </button>
        </form>
      `;

      sellerCard.appendChild(panel);

      $("#sellerPromotionForm")?.addEventListener(
        "submit",
        promoteCustomerToVendor
      );
    }

    // --------------------------------------------------------
    // 17. PROMOTE BUYER TO VENDOR
    // Existing RPC:
    // admin_promote_customer_to_vendor(customer_email)
    // --------------------------------------------------------

    async function promoteCustomerToVendor(event) {
      event.preventDefault();

      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const email = String(
        new FormData(form).get("customer_email") || ""
      ).trim().toLowerCase();

      if (!email) {
        showMessage("Weka email ya mteja.", "warning");
        return;
      }

      if (!confirm(
        `Una uhakika unataka kumpandisha ${email} kuwa Vendor?`
      )) {
        return;
      }

      setButtonLoading(button, true, "Inabadilisha...");

      const { data, error } = await db.rpc(
        "admin_promote_customer_to_vendor",
        {
          customer_email: email
        }
      );

      setButtonLoading(button, false);

      if (error) {
        handleDatabaseError(error, "Kubadili Buyer kuwa Vendor");
        return;
      }

      if (data?.success === false) {
        showMessage(
          data.message || "Ombi halijafanikiwa.",
          "error"
        );
        return;
      }

      await recordAdminAction(
        "PROMOTE_BUYER_TO_VENDOR",
        null,
        `Buyer amepandishwa kuwa vendor: ${email}`
      );

      showMessage(
        data?.message || `${email} sasa ni Vendor.`,
        "success"
      );

      form.reset();

      await loadDashboardStats();
    }

    // --------------------------------------------------------
    // 18. WALLET SUMMARY
    // Table: admin_wallet_summary
    // --------------------------------------------------------

    function createWalletSummaryPanel() {
      const walletCard = $("#wallet");

      if (!walletCard || $("#walletSummaryPanel")) return;

      const panel = document.createElement("div");

      panel.id = "walletSummaryPanel";
      panel.style.cssText = `
        margin-top:14px;
        padding:15px;
        border:1px solid #e5ebe6;
        border-radius:14px;
        background:#fff;
      `;

      panel.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:12px;
        ">
          <strong style="font-size:12px">Wallet financial summary</strong>
          <button class="btn" id="refreshWallet" type="button">
            ↻ Sasisha
          </button>
        </div>

        <div id="walletSummaryContent" style="
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px;
        ">
          <div class="announcement-empty">Inapakia wallet summary...</div>
        </div>
      `;

      walletCard.appendChild(panel);

      $("#refreshWallet")?.addEventListener(
        "click",
        loadWalletSummary
      );
    }

    async function loadWalletSummary() {
      const container = $("#walletSummaryContent");

      if (!container) return;

      container.innerHTML = `
        <div class="announcement-empty">Inapakia...</div>
      `;

      const { data, error } = await db
        .from("admin_wallet_summary")
        .select(`
          total_credits,
          total_debits,
          platform_balance,
          total_commission,
          total_seller_payouts,
          pending_transactions,
          total_transactions
        `)
        .limit(1);

      if (error) {
        container.innerHTML = `
          <div class="announcement-empty" style="grid-column:1/-1">
            Wallet summary haijapatikana. Hakikisha RLS na ruhusa za kusoma.
          </div>
        `;

        console.error("Wallet summary:", error);
        return;
      }

      if (!data?.length) {
        container.innerHTML = `
          <div class="announcement-empty" style="grid-column:1/-1">
            Hakuna wallet summary record iliyopatikana.
          </div>
        `;
        return;
      }

      const wallet = data[0];

      const values = [
        ["Jumla ya credits", wallet.total_credits],
        ["Jumla ya debits", wallet.total_debits],
        ["Platform balance", wallet.platform_balance],
        ["Jumla ya commission", wallet.total_commission],
        ["Seller payouts", wallet.total_seller_payouts],
        ["Pending transactions", wallet.pending_transactions],
        ["Transactions zote", wallet.total_transactions]
      ];

      container.innerHTML = values.map(([label, value]) => `
        <div style="
          padding:12px;
          background:#f8faf8;
          border:1px solid #edf1ed;
          border-radius:11px;
        ">
          <small style="font-size:9px;color:#75827b">
            ${escapeHTML(label)}
          </small>
          <strong style="
            display:block;
            font:800 15px Manrope;
            margin-top:6px;
            overflow-wrap:anywhere;
          ">
            ${escapeHTML(formatNumber(value))}
          </strong>
        </div>
      `).join("");
    }

    // --------------------------------------------------------
    // 19. WALLET TRANSACTIONS TABLE
    // Table: admin_wallet_transactions
    // --------------------------------------------------------

    function createWalletTransactionsPanel() {
      const walletCard = $("#wallet");

      if (!walletCard || $("#walletTransactionsPanel")) return;

      const panel = document.createElement("div");

      panel.id = "walletTransactionsPanel";
      panel.style.cssText = `
        margin-top:14px;
        padding:15px;
        border:1px solid #e5ebe6;
        border-radius:14px;
        background:#fff;
      `;

      panel.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:12px;
        ">
          <strong style="font-size:12px">Wallet transactions</strong>
          <button class="btn" id="refreshWalletTransactions" type="button">
            ↻ Sasisha
          </button>
        </div>

        <div style="overflow:auto">
          <table class="data-table" style="min-width:650px">
            <thead>
              <tr>
                <th>REFERENCE</th>
                <th>USER ID</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>DIRECTION</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody id="walletTransactionsBody">
              <tr>
                <td colspan="7" class="empty-state">Inapakia...</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      walletCard.appendChild(panel);

      $("#refreshWalletTransactions")?.addEventListener(
        "click",
        loadWalletTransactions
      );
    }

    async function loadWalletTransactions() {
      const body = $("#walletTransactionsBody");

      if (!body) return;

      body.innerHTML = `
        <tr><td colspan="7" class="empty-state">Inapakia...</td></tr>
      `;

      const { data, error } = await db
        .from("admin_wallet_transactions")
        .select(`
          id,
          reference,
          user_id,
          zune_id,
          transaction_type,
          direction,
          amount,
          currency,
          status,
          description,
          payment_reference,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        body.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              Imeshindwa kupakia wallet transactions.
            </td>
          </tr>
        `;

        console.error("Wallet transactions:", error);
        return;
      }

      if (!data?.length) {
        body.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <strong>Hakuna miamala</strong>
              Hakuna transaction iliyopatikana.
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML = data.map(transaction => `
        <tr>
          <td>${escapeHTML(transaction.reference || "—")}</td>
          <td>${escapeHTML(transaction.zune_id || transaction.user_id || "—")}</td>
          <td>${escapeHTML(transaction.transaction_type || "—")}</td>
          <td>
            ${escapeHTML(formatMoney(
              transaction.amount,
              transaction.currency || "TZS"
            ))}
          </td>
          <td>${escapeHTML(transaction.direction || "—")}</td>
          <td>${statusBadge(transaction.status)}</td>
          <td>${escapeHTML(formatDate(transaction.created_at))}</td>
        </tr>
      `).join("");
    }

    // Sehemu ya 4 itaendelea hapa.
    // ========================================================
    // SEHEMU YA 4/5: AUDIT LOGS, SEARCH & ADMIN OPERATIONS
    // ========================================================

    // --------------------------------------------------------
    // 20. AUDIT LOG PANEL
    // Table: admin_user_actions
    // --------------------------------------------------------

    function createAuditPanel() {
      const auditCard = $("#audit");

      if (!auditCard || $("#adminAuditPanel")) return;

      const panel = document.createElement("div");

      panel.id = "adminAuditPanel";
      panel.style.cssText = `
        margin-top:14px;
        padding:15px;
        border:1px solid #e5ebe6;
        border-radius:14px;
        background:#fff;
      `;

      panel.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:12px;
        ">
          <strong style="font-size:12px">Historia ya vitendo vya admin</strong>
          <button class="btn" id="refreshAdminAudit" type="button">
            ↻ Sasisha
          </button>
        </div>

        <div style="overflow:auto">
          <table class="data-table" style="min-width:620px">
            <thead>
              <tr>
                <th>ADMIN ID</th>
                <th>TARGET USER</th>
                <th>ACTION</th>
                <th>REASON</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody id="adminAuditBody">
              <tr><td colspan="5" class="empty-state">Inapakia...</td></tr>
            </tbody>
          </table>
        </div>
      `;

      auditCard.appendChild(panel);

      $("#refreshAdminAudit")?.addEventListener(
        "click",
        loadAdminAudit
      );
    }

    async function loadAdminAudit() {
      const body = $("#adminAuditBody");

      if (!body) return;

      body.innerHTML = `
        <tr><td colspan="5" class="empty-state">Inapakia...</td></tr>
      `;

      const { data, error } = await db
        .from("admin_user_actions")
        .select(`
          id,
          admin_id,
          target_user_id,
          action,
          reason,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        body.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">
              Imeshindwa kusoma audit logs. Kagua Supabase RLS.
            </td>
          </tr>
        `;

        console.error("Admin audit:", error);
        return;
      }

      if (!data?.length) {
        body.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">
              Hakuna audit records zilizopatikana.
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML = data.map(item => `
        <tr>
          <td>${escapeHTML(item.admin_id || "—")}</td>
          <td>${escapeHTML(item.target_user_id || "—")}</td>
          <td><strong>${escapeHTML(item.action || "—")}</strong></td>
          <td>${escapeHTML(item.reason || "—")}</td>
          <td>${escapeHTML(formatDate(item.created_at))}</td>
        </tr>
      `).join("");
    }

    // --------------------------------------------------------
    // 21. AUDIT LOG SEARCH
    // --------------------------------------------------------

    function createAuditSearch() {
      const auditCard = $("#adminAuditPanel");

      if (!auditCard || $("#auditSearchInput")) return;

      const searchBox = document.createElement("input");

      searchBox.id = "auditSearchInput";
      searchBox.type = "search";
      searchBox.placeholder = "Tafuta action, admin ID au target user...";
      searchBox.style.cssText = `
        width:100%;
        padding:10px;
        border:1px solid #e1e8e2;
        border-radius:9px;
        margin-bottom:12px;
        font-size:10px;
      `;

      const table = $("#adminAuditBody");

      table?.closest(".table-wrap");

      auditCard.insertBefore(
        searchBox,
        auditCard.querySelector("div[style*='overflow:auto']")
      );

      searchBox.addEventListener("input", () => {
        const query = searchBox.value.trim().toLowerCase();

        $$("#adminAuditBody tr").forEach(row => {
          row.hidden = Boolean(query) &&
            !row.textContent.toLowerCase().includes(query);
        });
      });
    }

    // --------------------------------------------------------
    // 22. ADMIN REFRESH EVENTS
    // --------------------------------------------------------

    async function refreshAllDashboardData() {
      if (refreshInProgress) return;

      refreshInProgress = true;

      try {
        await Promise.all([
          loadDashboardStats(),
          loadAnnouncements(),
          loadWalletSummary(),
          loadWalletTransactions(),
          loadAdminAudit()
        ]);
      } catch (error) {
        console.error("Dashboard refresh:", error);
      } finally {
        refreshInProgress = false;
      }
    }

    $("#refreshDashboard")?.addEventListener(
      "click",
      refreshAllDashboardData
    );

    window.addEventListener(
      "zune:admin-refresh",
      refreshAllDashboardData
    );

    // --------------------------------------------------------
    // 23. MODULE SEARCH
    // --------------------------------------------------------

    const moduleSearch = $("#moduleSearch");

    moduleSearch?.addEventListener("input", () => {
      const query = moduleSearch.value.trim().toLowerCase();

      $$(".module-card").forEach(card => {
        const searchableText = (
          card.innerText + " " + (card.dataset.search || "")
        ).toLowerCase();

        card.hidden = Boolean(query) &&
          !searchableText.includes(query);
      });
    });

    // --------------------------------------------------------
    // 24. ADMIN ACTION CONFIRMATION HELPER
    // --------------------------------------------------------

    async function confirmAdminAction({
      title = "Thibitisha kitendo",
      message = "Una uhakika unataka kuendelea?",
      action,
      targetUserId = null,
      reason = ""
    }) {
      if (!confirm(`${title}\n\n${message}`)) {
        return false;
      }

      if (typeof action !== "function") {
        showMessage(
          "Kitendo hiki hakijaunganishwa na backend bado.",
          "warning"
        );
        return false;
      }

      try {
        const result = await action();

        if (result?.error) {
          handleDatabaseError(result.error, title);
          return false;
        }

        await recordAdminAction(
          title,
          targetUserId,
          reason || message
        );

        showMessage(
          result?.message || "Kitendo kimekamilika.",
          "success"
        );

        return true;
      } catch (error) {
        handleDatabaseError(error, title);
        return false;
      }
    }

    window.ZUNE_ADMIN_CONFIRM_ACTION = confirmAdminAction;

    // --------------------------------------------------------
    // 25. AUDIT CHECKLIST STATUS
    // --------------------------------------------------------

    const auditChecklist = $("#auditChecklist");

    function updateAuditChecklist() {
      if (!auditChecklist) return;

      const inputs = $$('input[type="checkbox"]', auditChecklist);
      const completed = inputs.filter(input => input.checked).length;
      const total = inputs.length;
      const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

      const count = $("#auditCount");
      const progress = $("#auditProgress");
      const percent = $("#auditPercent");

      if (count) count.textContent = `${completed} / ${total}`;
      if (progress) progress.style.width = `${percentage}%`;
      if (percent) percent.textContent =
        `${percentage}% imekamilika`;
    }

    auditChecklist?.addEventListener(
      "change",
      updateAuditChecklist
    );

    $("#resetAuditChecklist")?.addEventListener("click", () => {
      if (!confirm("Unataka kuanza upya checklist ya ukaguzi?")) {
        return;
      }

      $$('input[type="checkbox"]', auditChecklist).forEach(input => {
        input.checked = false;
      });

      updateAuditChecklist();
    });

    // --------------------------------------------------------
    // 26. PRINT MONTHLY AUDIT
    // --------------------------------------------------------

    $("#printAuditChecklist")?.addEventListener("click", () => {
      window.print();
    });

    // --------------------------------------------------------
    // 27. NAVIGATION ACTIVE STATE
    // --------------------------------------------------------

    $$(".nav-list a").forEach(link => {
      link.addEventListener("click", () => {
        $$(".nav-list a").forEach(item => {
          item.classList.remove("active");
        });

        link.classList.add("active");
      });
    });

    // Sehemu ya 5 itaendelea hapa.
    // ========================================================
    // SEHEMU YA 5/5: INITIALIZATION, SECURITY & FINAL STARTUP
    // ========================================================

    // --------------------------------------------------------
    // 28. PROFILE IDENTITY
    // --------------------------------------------------------

    function initializeAdminIdentity() {
      if (!currentAdmin) return;

      const nameElement = $("#adminName");
      const avatarElement = $("#adminAvatar");

      const email = currentAdmin.email || "Admin Mkuu";

      if (nameElement && !nameElement.textContent.trim()) {
        nameElement.textContent = email;
      }

      if (avatarElement) {
        avatarElement.textContent =
          email.charAt(0).toUpperCase();
      }
    }

    // --------------------------------------------------------
    // 29. MODULE CONNECTION STATUS
    // --------------------------------------------------------

    function setModuleStatus(element, message, type = "info") {
      if (!element) return;

      const colors = {
        info: "#edf4ff",
        success: "#e7f5ef",
        warning: "#fff5df",
        error: "#fff0f0"
      };

      const color = colors[type] || colors.info;

      element.innerHTML = `
        <div style="
          padding:10px;
          background:${color};
          border-radius:9px;
          font-size:10px;
          line-height:1.6;
        ">
          ${escapeHTML(message)}
        </div>
      `;
    }

    // --------------------------------------------------------
    // 30. EXPOSE SAFE ADMIN HELPERS
    // --------------------------------------------------------

    window.ZUNE_ADMIN = {
      getAdmin: () => currentAdmin,

      getSession: () => currentSession,

      refresh: refreshAllDashboardData,

      refreshStats: loadDashboardStats,

      refreshAnnouncements: loadAnnouncements,

      refreshWallet: loadWalletSummary,

      refreshWalletTransactions: loadWalletTransactions,

      refreshAudit: loadAdminAudit,

      logAction: recordAdminAction,

      showMessage,

      formatMoney,

      formatDate,

      escapeHTML
    };

    // --------------------------------------------------------
    // 31. INITIALIZE MODULE PANELS
    // --------------------------------------------------------

    function initializeModulePanels() {
      createSellerManagementPanel();

      createWalletSummaryPanel();

      createWalletTransactionsPanel();

      createAuditPanel();

      createAnnouncementPanel();

      createAuditSearch();

      updateAuditChecklist();

      initializeAdminIdentity();
    }

    // --------------------------------------------------------
    // 32. INITIAL DATA LOAD
    // --------------------------------------------------------

    async function initializeDashboard() {
      initializeModulePanels();

      showMessage(
        "Admin Mkuu ameingia kwenye ZUNE Premium Admin.",
        "success",
        3000
      );

      await refreshAllDashboardData();
    }

    // --------------------------------------------------------
    // 33. AUTHENTICATION STARTUP
    // --------------------------------------------------------

    try {
      const authorized = await verifyAdmin();

      if (!authorized) return;

      await initializeDashboard();

    } catch (error) {
      console.error("ZUNE ADMIN INITIALIZATION ERROR:", error);

      showMessage(
        "Imeshindwa kuthibitisha akaunti au kuanzisha dashboard. " +
        (error?.message || ""),
        "error",
        10000
      );
    }

  });
})();