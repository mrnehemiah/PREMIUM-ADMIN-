
/* =========================================
   ZUNE PREMIUM ADMIN - WALLET
   Supabase Financial Dashboard
========================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const supabaseClient =
    window.supabaseClient ||
    window.supabase?.createClient &&
    window.supabase.createClient(
      window.SUPABASE_URL || "",
      window.SUPABASE_ANON_KEY || ""
    );

  let transactions = [];
  let filteredTransactions = [];

  const currency = (amount) =>
    new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 2
    }).format(Number(amount) || 0);

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (isNaN(parsed)) return "—";

    return parsed.toLocaleDateString("en-TZ", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setMessage(message) {
    const table = $("transactionTable");

    if (table) {
      table.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            ${escapeHTML(message)}
          </td>
        </tr>
      `;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );
  }

  // -------------------------------------
  // AUTHENTICATION
  // -------------------------------------

  async function verifyAdmin() {
    if (!supabaseClient) {
      throw new Error("Supabase configuration is missing.");
    }

    const { data, error } =
      await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Please log in to continue.");
    }

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
      throw new Error("Administrator access required.");
    }

    return data.user;
  }

  // -------------------------------------
  // TRANSACTION DATA
  // -------------------------------------

  /*
    IMPORTANT:
    Connect this loader to your actual financial
    table after confirming its database schema.
  */

  async function loadTransactions() {
    setMessage("Financial transaction schema not configured yet.");

    transactions = [];
    filteredTransactions = [];

    renderTransactions();
    updateStatistics();

    return;
  }

  // -------------------------------------
  // STATISTICS
  // -------------------------------------

  function updateStatistics() {
    let deposits = 0;
    let withdrawals = 0;
    let commissions = 0;
    let pending = 0;
    let successful = 0;
    let failed = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;
      const type = String(transaction.type || "").toLowerCase();
      const status = String(transaction.status || "").toLowerCase();

      if (type === "deposit") deposits += amount;

      if (type === "withdrawal") withdrawals += amount;

      if (type === "commission") commissions += amount;

      if (status === "pending") pending++;

      if (["completed", "success", "successful", "paid"].includes(status)) {
        successful++;
      }

      if (["failed", "rejected", "cancelled"].includes(status)) {
        failed++;
      }
    });

    const balance = deposits + commissions - withdrawals;

    setText("totalBalance", currency(balance));
    setText("totalDeposits", currency(deposits));
    setText("totalWithdrawals", currency(withdrawals));
    setText("totalCommission", currency(commissions));

    setText("pendingTransactions", pending);
    setText("successfulCount", successful);
    setText("failedCount", failed);
    setText("totalTransactions", transactions.length);
  }

  // -------------------------------------
  // TRANSACTION TABLE
  // -------------------------------------

  function renderTransactions() {
    const table = $("transactionTable");

    if (!table) return;

    if (!filteredTransactions.length) {
      setMessage("No verified financial transactions available.");
      return;
    }

    table.innerHTML = filteredTransactions
      .map((transaction) => {
        const status = String(
          transaction.status || "unknown"
        ).toLowerCase();

        const type = String(
          transaction.type || "transaction"
        ).toLowerCase();

        const statusClass =
          ["pending"].includes(status)
            ? "pending"
            : ["failed", "rejected", "cancelled"].includes(status)
              ? "failed"
              : "";

        const amountClass =
          type === "withdrawal"
            ? "amount-negative"
            : "amount-positive";

        const sign =
          type === "withdrawal" ? "−" : "+";

        return `
          <tr>
            <td>
              <span class="transaction-name">
                ${escapeHTML(transaction.description || type)}
              </span>

              <span class="transaction-id">
                ${escapeHTML(transaction.id || "")}
              </span>
            </td>

            <td>${escapeHTML(formatDate(transaction.created_at))}</td>

            <td class="${amountClass}">
              ${sign}${escapeHTML(currency(transaction.amount))}
            </td>

            <td>
              <span class="status ${statusClass}">
                ${escapeHTML(status)}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // -------------------------------------
  // SEARCH AND FILTER
  // -------------------------------------

  function filterTransactions() {
    const search = (
      $("transactionSearch")?.value || ""
    ).toLowerCase();

    const filter =
      $("transactionFilter")?.value || "all";

    filteredTransactions = transactions.filter((item) => {
      const searchable = [
        item.id,
        item.description,
        item.type,
        item.status
      ].join(" ").toLowerCase();

      const matchesSearch = searchable.includes(search);

      const matchesFilter =
        filter === "all" ||
        String(item.type).toLowerCase() === filter;

      return matchesSearch && matchesFilter;
    });

    renderTransactions();
  }

  // -------------------------------------
  // EXPORT CSV
  // -------------------------------------

  function exportReport() {
    if (!transactions.length) {
      alert("No financial records available to export.");
      return;
    }

    const headers = [
      "Transaction ID",
      "Description",
      "Type",
      "Amount",
      "Status",
      "Date"
    ];

    const rows = transactions.map((item) => [
      item.id,
      item.description,
      item.type,
      item.amount,
      item.status,
      item.created_at
    ]);

    const csv = [
      headers,
      ...rows
    ].map(row =>
      row.map(value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(",")
    ).join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      "ZUNE-Wallet-Report-" +
      new Date().toISOString().slice(0, 10) +
      ".csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  // -------------------------------------
  // QUICK ACTIONS
  // -------------------------------------

  function quickAction(type) {
    const filter = $("transactionFilter");

    if (!filter) return;

    filter.value = type;

    filterTransactions();

    document.querySelector(".wallet-table")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  // -------------------------------------
  // INITIALIZATION
  // -------------------------------------

  async function initializeWallet() {
    try {
      await verifyAdmin();
      await loadTransactions();

    } catch (error) {
      console.error("ZUNE Wallet:", error);

      setMessage(error.message);

      setText("totalBalance", "Unavailable");
    }
  }

  $("refreshWallet")?.addEventListener(
    "click",
    initializeWallet
  );

  $("exportWallet")?.addEventListener(
    "click",
    exportReport
  );

  $("transactionSearch")?.addEventListener(
    "input",
    filterTransactions
  );

  $("transactionFilter")?.addEventListener(
    "change",
    filterTransactions
  );

  $("depositsAction")?.addEventListener(
    "click",
    () => quickAction("deposit")
  );

  $("withdrawalsAction")?.addEventListener(
    "click",
    () => quickAction("withdrawal")
  );

  $("commissionsAction")?.addEventListener(
    "click",
    () => quickAction("commission")
  );

  $("paymentsAction")?.addEventListener(
    "click",
    () => quickAction("all")
  );

  $("viewAllTransactions")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      if ($("transactionFilter")) {
        $("transactionFilter").value = "all";
      }

      if ($("transactionSearch")) {
        $("transactionSearch").value = "";
      }

      filterTransactions();
    }
  );

  initializeWallet();

})();
