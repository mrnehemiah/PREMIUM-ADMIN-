
/* ==========================================
   ZUNE PREMIUM ADMIN WALLET
   ========================================== */

(() => {
  "use strict";

  const db = window.supabaseClient;

  const $ = id => document.getElementById(id);

  let transactions = [];

  const money = value =>
    new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS"
    }).format(Number(value) || 0);

  const safe = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  function message(text) {
    const table = $("transactionTable");

    if (table) {
      table.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            ${safe(text)}
          </td>
        </tr>
      `;
    }
  }

  // ========================================
  // ADMIN AUTHENTICATION
  // ========================================

  async function checkAdmin() {
    if (!db) {
      throw new Error("Supabase client not found.");
    }

    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {
      throw new Error("Admin login required.");
    }

    const { data: profile, error: profileError } =
      await db
        .from("profiles")
        .select("id, full_name, zune_id, role")
        .eq("id", data.user.id)
        .single();

    if (profileError || profile.role !== "admin") {
      throw new Error("Admin access denied.");
    }

    return profile;
  }

  // ========================================
  // LOAD WALLET SUMMARY
  // ========================================

  async function loadSummary() {
    const { data, error } = await db
      .from("admin_wallet_summary")
      .select("*")
      .single();

    if (error) throw error;

    $("totalBalance").textContent =
      money(data.platform_balance);

    $("totalDeposits").textContent =
      money(data.total_credits);

    $("totalWithdrawals").textContent =
      money(data.total_debits);

    $("totalCommission").textContent =
      money(data.total_commission);

    $("pendingTransactions").textContent =
      data.pending_transactions;

    $("totalTransactions").textContent =
      data.total_transactions;
  }

  // ========================================
  // LOAD TRANSACTIONS AND ZUNE IDS
  // ========================================

  async function loadTransactions() {
    message("Loading transactions...");

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
        created_at,
        profiles:user_id (
          full_name,
          zune_id
        )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    transactions = data || [];

    renderTransactions(transactions);
    updateCounts();
  }

  // ========================================
  // DISPLAY TRANSACTIONS
  // ========================================

  function renderTransactions(list) {
    const table = $("transactionTable");

    if (!table) return;

    if (!list.length) {
      message("No wallet transactions found.");
      return;
    }

    table.innerHTML = list.map(item => {
      const type = safe(item.transaction_type);
      const status = safe(item.status);

      const profile = item.profiles || {};

      const name = profile.full_name || "Unknown user";

      const zuneID =
        item.zune_id ||
        profile.zune_id ||
        "Not available";

      const negative = item.direction === "debit";

      return `
        <tr>
          <td>
            <span class="transaction-name">
              ${type}
            </span>

            <span class="transaction-id">
              ${safe(item.reference)}
            </span>

            <span class="transaction-id">
              ${safe(name)} · ZUNE ID: ${safe(zuneID)}
            </span>
          </td>

          <td>${new Date(item.created_at)
            .toLocaleDateString("en-TZ")}</td>

          <td class="${negative ?
            "amount-negative" : "amount-positive"}">
            ${negative ? "-" : "+"}
            ${money(item.amount)}
          </td>

          <td>
            <span class="status ${
              status === "pending" ? "pending" :
              ["rejected", "cancelled"].includes(status)
                ? "failed" : ""
            }">
              ${status}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  // ========================================
  // COUNTS
  // ========================================

  function updateCounts() {
    const completed = transactions.filter(
      item => item.status === "completed"
    ).length;

    const failed = transactions.filter(
      item => ["rejected", "cancelled"].includes(item.status)
    ).length;

    $("successfulCount").textContent = completed;
    $("failedCount").textContent = failed;
  }

  // ========================================
  // SEARCH
  // ========================================

  function filterTransactions() {
    const search =
      ($("transactionSearch")?.value || "").toLowerCase();

    const filter =
      $("transactionFilter")?.value || "all";

    const result = transactions.filter(item => {
      const profile = item.profiles || {};

      const text = [
        item.reference,
        item.zune_id,
        item.transaction_type,
        item.status,
        item.description,
        profile.full_name,
        profile.zune_id
      ].join(" ").toLowerCase();

      return text.includes(search) &&
        (filter === "all" ||
         item.transaction_type === filter);
    });

    renderTransactions(result);
  }

  // ========================================
  // EXPORT REPORT
  // ========================================

  function exportReport() {
    if (!transactions.length) {
      alert("No transactions available.");
      return;
    }

    const headers = [
      "Reference",
      "Name",
      "ZUNE ID",
      "Type",
      "Direction",
      "Amount",
      "Status",
      "Date"
    ];

    const rows = transactions.map(item => [
      item.reference,
      item.profiles?.full_name,
      item.zune_id || item.profiles?.zune_id,
      item.transaction_type,
      item.direction,
      item.amount,
      item.status,
      item.created_at
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(","))
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ZUNE-Admin-Wallet.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  // ========================================
  // QUICK FILTERS
  // ========================================

  function quickFilter(type) {
    $("transactionFilter").value = type;
    filterTransactions();

    document.querySelector(".wallet-table")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  // ========================================
  // INITIALIZE
  // ========================================

  async function initialize() {
    try {
      await checkAdmin();

      await loadSummary();
      await loadTransactions();

    } catch (error) {
      console.error("ZUNE WALLET ERROR:", error);

      message(error.message);
    }
  }

  $("refreshWallet")?.addEventListener(
    "click", initialize
  );

  $("exportWallet")?.addEventListener(
    "click", exportReport
  );

  $("transactionSearch")?.addEventListener(
    "input", filterTransactions
  );

  $("transactionFilter")?.addEventListener(
    "change", filterTransactions
  );

  $("depositsAction")?.addEventListener(
    "click", () => quickFilter("deposit")
  );

  $("withdrawalsAction")?.addEventListener(
    "click", () => quickFilter("withdrawal")
  );

  $("commissionsAction")?.addEventListener(
    "click", () => quickFilter("commission")
  );

  $("paymentsAction")?.addEventListener(
    "click", () => quickFilter("all")
  );

  $("viewAllTransactions")?.addEventListener(
    "click", event => {
      event.preventDefault();

      $("transactionSearch").value = "";
      $("transactionFilter").value = "all";

      filterTransactions();
    }
  );

  initialize();

})();
