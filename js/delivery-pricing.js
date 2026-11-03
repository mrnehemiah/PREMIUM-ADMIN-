/* ==========================================
   ZUNE ADMIN - DELIVERY PRICING
   Supabase Integration
========================================== */

document.addEventListener("DOMContentLoaded", async function () {

  "use strict";

  const $ = id => document.getElementById(id);

  const form = $("pricingForm");
  const tableBody = $("pricingTableBody");

  let db = null;
  let pricingRecords = [];
  let busy = false;

  /* ========================================
     1. SUPABASE CONNECTION
  ======================================== */

  function connectSupabase() {

    if (window.zuneSupabase) {
      return window.zuneSupabase;
    }

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY
    ) {
      window.zuneSupabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );

      return window.zuneSupabase;
    }

    return null;
  }

  db = connectSupabase();

  if (!db) {

    showFormMessage(
      "Supabase haijaunganishwa. Kagua CDN na config.js.",
      "error"
    );

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Supabase connection haijapatikana.
          </td>
        </tr>
      `;
    }

    return;
  }

  /* ========================================
     2. MESSAGE FUNCTIONS
  ======================================== */

  function showFormMessage(message, type = "success") {

    const element = $("formMessage");
    if (!element) return;

    element.textContent = message;
    element.style.color =
      type === "error" ? "#dc2626" : "#15803d";
  }

  function showListMessage(message, type = "success") {

    const element = $("listMessage");
    if (!element) return;

    element.textContent = message;
    element.style.color =
      type === "error" ? "#dc2626" : "#15803d";
  }

  function showError(error) {

    console.error("ZUNE Delivery Pricing:", error);

    return error?.message ||
      error?.details ||
      "Hitilafu isiyojulikana imetokea.";
  }

  /* ========================================
     3. AUTHENTICATION AND ADMIN CHECK
  ======================================== */

  async function verifyAdmin() {

    const { data, error } = await db.auth.getUser();

    if (error || !data?.user) {
      window.location.replace("../login.html");
      return false;
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {

      showFormMessage(
        "Imeshindikana kuthibitisha Admin: " +
        showError(profileError),
        "error"
      );

      return false;
    }

    if (!profile || profile.role !== "admin") {

      document.body.innerHTML = `
        <div style="
          max-width:500px;
          margin:80px auto;
          padding:25px;
          text-align:center;
          font-family:Arial,sans-serif;
        ">
          <h2 style="color:#dc2626">Access Denied</h2>
          <p>Unahitaji ruhusa ya Admin kufungua ukurasa huu.</p>
          <a href="../index.html">Rudi Dashboard</a>
        </div>
      `;

      return false;
    }

    return true;
  }

  const authorized = await verifyAdmin();

  if (!authorized) return;  /* ========================================
     4. LOAD PRICING
  ======================================== */

  async function loadPricing() {

    if (busy) return;

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Inapakia taarifa...
          </td>
        </tr>
      `;
    }

    const { data, error } = await db
      .from("delivery_pricing")
      .select("*")
      .order("country", { ascending: true })
      .order("region", { ascending: true });

    if (error) {

      pricingRecords = [];

      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              ${escapeHTML(showError(error))}
            </td>
          </tr>
        `;
      }

      showListMessage(showError(error), "error");
      updateStats();

      return;
    }

    pricingRecords = data || [];

    updateStats();
    renderPricing();
    showListMessage("");
  }

  /* ========================================
     5. STATISTICS
  ======================================== */

  function updateStats() {

    const total = pricingRecords.length;

    const active = pricingRecords.filter(
      item => item.is_active === true
    ).length;

    if ($("totalPricing")) {
      $("totalPricing").textContent = total;
    }

    if ($("activePricing")) {
      $("activePricing").textContent = active;
    }

    if ($("inactivePricing")) {
      $("inactivePricing").textContent = total - active;
    }

    if ($("recordCount")) {
      $("recordCount").textContent = total + " Records";
    }
  }

  /* ========================================
     6. FORMAT AND SECURITY
  ======================================== */

  function escapeHTML(value) {

    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );
  }

  function formatMoney(amount, currency) {

    const number = Number(amount);

    return number.toLocaleString("en-US") +
      " " + escapeHTML(currency);
  }

  /* ========================================
     7. DISPLAY PRICING RECORDS
  ======================================== */

  function renderPricing() {

    const search = $("searchPricing")?.value
      ?.toLowerCase()
      .trim() || "";

    const status = $("statusFilter")?.value || "all";

    const filtered = pricingRecords.filter(item => {

      const area = [
        item.country,
        item.region,
        item.district || ""
      ].join(" ").toLowerCase();

      const matchesSearch = area.includes(search);

      const matchesStatus =
        status === "all" ||
        (status === "active" && item.is_active === true) ||
        (status === "inactive" && item.is_active === false);

      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Hakuna taarifa zilizopatikana.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML = filtered.map(item => {

      const area = [
        item.country,
        item.region,
        item.district
      ].filter(Boolean).join(" / ");

      return `
        <tr>
          <td><strong>${escapeHTML(area)}</strong></td>

          <td>${formatMoney(item.base_fee, item.currency)}</td>

          <td>${formatMoney(item.price_per_km, item.currency)}</td>

          <td>${formatMoney(item.minimum_fee, item.currency)}</td>

          <td>${Number(item.maximum_distance_km)} KM</td>

          <td>
            <span class="${
              item.is_active ? "status-active" : "status-inactive"
            }">
              ${item.is_active ? "Active" : "Inactive"}
            </span>
          </td>

          <td>
            <button class="action-btn edit-btn"
              data-action="edit"
              data-id="${escapeHTML(item.id)}">
              Edit
            </button>

            <button class="action-btn toggle-btn"
              data-action="toggle"
              data-id="${escapeHTML(item.id)}">
              ${item.is_active ? "Zima" : "Washa"}
            </button>

            <button class="action-btn delete-btn"
              data-action="delete"
              data-id="${escapeHTML(item.id)}">
              Futa
            </button>
          </td>
        </tr>
      `;

    }).join("");
  }

  /* ========================================
     8. RESET FORM
  ======================================== */

  function resetForm() {

    form.reset();

    $("pricingId").value = "";

    $("formTitle").textContent =
      "Ongeza Delivery Pricing";

    $("savePricingBtn").textContent =
      "+ Hifadhi Bei";

    $("cancelEditBtn").hidden = true;

    showFormMessage("");
  }

  /* ========================================
     9. EDIT RECORD
  ======================================== */

  function editPricing(item) {

    $("pricingId").value = item.id;
    $("country").value = item.country;
    $("region").value = item.region;
    $("district").value = item.district || "";
    $("currency").value = item.currency;

    $("baseFee").value = item.base_fee;
    $("pricePerKm").value = item.price_per_km;
    $("minimumFee").value = item.minimum_fee;

    $("maximumDistance").value =
      item.maximum_distance_km;

    $("formTitle").textContent =
      "Hariri Delivery Pricing";

    $("savePricingBtn").textContent =
      "Sasisha Bei";

    $("cancelEditBtn").hidden = false;

    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }  /* ========================================
     10. SAVE AND UPDATE PRICING
  ======================================== */

  form.addEventListener("submit", async function(event) {

    event.preventDefault();

    if (busy) return;

    const id = $("pricingId").value;

    const payload = {

      country: $("country").value.trim(),

      region: $("region").value.trim(),

      district: $("district").value.trim() || null,

      currency: $("currency").value,

      base_fee: Number($("baseFee").value),

      price_per_km: Number($("pricePerKm").value),

      minimum_fee: Number($("minimumFee").value),

      maximum_distance_km:
        Number($("maximumDistance").value)
    };

    const values = [
      payload.base_fee,
      payload.price_per_km,
      payload.minimum_fee
    ];

    if (
      !payload.country ||
      !payload.region ||
      values.some(value =>
        !Number.isFinite(value) || value < 0
      ) ||
      !Number.isFinite(payload.maximum_distance_km) ||
      payload.maximum_distance_km <= 0
    ) {

      showFormMessage(
        "Tafadhali jaza taarifa zote kwa usahihi.",
        "error"
      );

      return;
    }

    busy = true;

    const button = $("savePricingBtn");

    button.disabled = true;
    button.textContent = "Inahifadhi...";

    try {

      let result;

      if (id) {

        result = await db
          .from("delivery_pricing")
          .update(payload)
          .eq("id", id)
          .select();

      } else {

        result = await db
          .from("delivery_pricing")
          .insert(payload)
          .select();

      }

      if (result.error) {
        throw result.error;
      }

      if (!result.data || result.data.length === 0) {
        throw new Error(
          "Hakuna taarifa iliyorejeshwa. Kagua ruhusa za database."
        );
      }

      showFormMessage(
        id
          ? "Delivery pricing imesasishwa."
          : "Delivery pricing imehifadhiwa."
      );

      resetForm();

      await loadPricing();

    } catch (error) {

      showFormMessage(showError(error), "error");

    } finally {

      busy = false;
      button.disabled = false;

      button.textContent = $("pricingId").value
        ? "Sasisha Bei"
        : "+ Hifadhi Bei";
    }

  });

  /* ========================================
     11. TABLE ACTIONS
  ======================================== */

  tableBody.addEventListener("click", async function(event) {

    const button = event.target.closest(
      "button[data-action]"
    );

    if (!button || busy) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const item = pricingRecords.find(
      record => String(record.id) === String(id)
    );

    if (!item) return;

    if (action === "edit") {
      editPricing(item);
      return;
    }

    if (action === "toggle") {

      const nextStatus = !item.is_active;

      const confirmed = confirm(
        nextStatus
          ? "Unataka kuwasha bei hii?"
          : "Unataka kuzima bei hii?"
      );

      if (!confirmed) return;

      busy = true;
      button.disabled = true;

      try {

        const { error } = await db
          .from("delivery_pricing")
          .update({ is_active: nextStatus })
          .eq("id", item.id);

        if (error) throw error;

        showListMessage("Status imebadilishwa.");

        await loadPricing();

      } catch (error) {

        showListMessage(showError(error), "error");

      } finally {

        busy = false;
        button.disabled = false;

      }

      return;
    }

    if (action === "delete") {

      const confirmed = confirm(
        "Una uhakika unataka kufuta bei hii? Kitendo hiki hakiwezi kurejeshwa."
      );

      if (!confirmed) return;

      busy = true;
      button.disabled = true;

      try {

        const { error } = await db
          .from("delivery_pricing")
          .delete()
          .eq("id", item.id);

        if (error) throw error;

        showListMessage("Bei imefutwa.");

        await loadPricing();

      } catch (error) {

        showListMessage(showError(error), "error");

      } finally {

        busy = false;
        button.disabled = false;

      }
    }

  });

  /* ========================================
     12. FILTERS AND BUTTONS
  ======================================== */

  $("cancelEditBtn").addEventListener(
    "click",
    resetForm
  );

  $("searchPricing").addEventListener(
    "input",
    renderPricing
  );

  $("statusFilter").addEventListener(
    "change",
    renderPricing
  );

  $("refreshPricing").addEventListener(
    "click",
    loadPricing
  );

  /* ========================================
     13. INITIAL LOAD
  ======================================== */

  await loadPricing();

  console.log(
    "ZUNE Delivery Pricing initialized successfully."
  );

});