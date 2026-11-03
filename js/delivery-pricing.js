/* =========================================
   ZUNE ADMIN - DELIVERY PRICING
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

  const db =
    window.zuneSupabase ||
    window.supabaseClient ||
    window.adminSupabase;

  const form = document.getElementById("pricingForm");
  const tableBody = document.getElementById("pricingTableBody");
  const formMessage = document.getElementById("formMessage");
  const listMessage = document.getElementById("listMessage");

  let pricingRecords = [];
  let currentAdmin = null;

  if (!db || typeof db.from !== "function") {
    showFormMessage(
      "Supabase haijaunganishwa. Kagua ../js/config.js",
      "error"
    );
    return;
  }

  function showFormMessage(message, type = "success") {
    formMessage.textContent = message;
    formMessage.style.color =
      type === "error" ? "#dc2626" : "#15803d";
  }

  function showListMessage(message, type = "success") {
    listMessage.textContent = message;
    listMessage.style.color =
      type === "error" ? "#dc2626" : "#15803d";
  }

  function formatMoney(amount, currency) {
    return `${Number(amount).toLocaleString()} ${currency}`;
  }

  /* AUTHENTICATION + ADMIN CHECK */

  async function verifyAdmin() {

    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError || !authData.user) {
      window.location.href = "../login.html";
      return false;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      document.body.innerHTML = `
        <div style="
          max-width:500px;
          margin:80px auto;
          padding:25px;
          text-align:center;
          font-family:Arial;
        ">
          <h2 style="color:#dc2626">Access Denied</h2>
          <p>Unaruhusiwa kufungua ukurasa huu.</p>
          <a href="../index.html">Rudi Dashboard</a>
        </div>
      `;
      return false;
    }

    currentAdmin = profile;
    return true;
  }

  const authorized = await verifyAdmin();

  if (!authorized) return;
  /* LOAD PRICING RECORDS */

  async function loadPricing() {

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          Inapakia...
        </td>
      </tr>
    `;

    const { data, error } = await db
      .from("delivery_pricing")
      .select("*")
      .order("country", { ascending: true })
      .order("region", { ascending: true });

    if (error) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Imeshindikana kupakia taarifa.
          </td>
        </tr>
      `;
      showListMessage(error.message, "error");
      return;
    }

    pricingRecords = data || [];

    updateStats();
    renderPricing();
  }

  /* UPDATE STATISTICS */

  function updateStats() {

    const total = pricingRecords.length;
    const active = pricingRecords.filter(
      item => item.is_active
    ).length;

    document.getElementById("totalPricing").textContent = total;

    document.getElementById("activePricing").textContent = active;

    document.getElementById("inactivePricing").textContent =
      total - active;

    document.getElementById("recordCount").textContent =
      `${total} Records`;
  }

  /* DISPLAY RECORDS */

  function renderPricing() {

    const search = document
      .getElementById("searchPricing")
      .value.toLowerCase()
      .trim();

    const status = document
      .getElementById("statusFilter")
      .value;

    const filtered = pricingRecords.filter(item => {

      const matchesSearch = [
        item.country,
        item.region,
        item.district || ""
      ].join(" ").toLowerCase().includes(search);

      const matchesStatus =
        status === "all" ||
        (status === "active" && item.is_active) ||
        (status === "inactive" && !item.is_active);

      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Hakuna delivery pricing iliyopatikana.
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
          <td>
            <strong>${escapeHTML(area)}</strong>
          </td>

          <td>${formatMoney(item.base_fee, item.currency)}</td>

          <td>${formatMoney(item.price_per_km, item.currency)}</td>

          <td>${formatMoney(item.minimum_fee, item.currency)}</td>

          <td>${Number(item.maximum_distance_km)} KM</td>

          <td>
            <span class="${
              item.is_active
                ? "status-active"
                : "status-inactive"
            }">
              ${item.is_active ? "Active" : "Inactive"}
            </span>
          </td>

          <td>
            <button
              class="action-btn edit-btn"
              data-action="edit"
              data-id="${item.id}">
              Edit
            </button>

            <button
              class="action-btn toggle-btn"
              data-action="toggle"
              data-id="${item.id}">
              ${item.is_active ? "Zima" : "Washa"}
            </button>

            <button
              class="action-btn delete-btn"
              data-action="delete"
              data-id="${item.id}">
              Futa
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  /* SAFE HTML */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  /* SAVE OR UPDATE */

  form.addEventListener("submit", async event => {

    event.preventDefault();

    const id = document.getElementById("pricingId").value;

    const payload = {
      country: document.getElementById("country").value.trim(),
      region: document.getElementById("region").value.trim(),
      district:
        document.getElementById("district").value.trim() || null,
      currency: document.getElementById("currency").value,
      base_fee: Number(document.getElementById("baseFee").value),
      price_per_km: Number(document.getElementById("pricePerKm").value),
      minimum_fee: Number(document.getElementById("minimumFee").value),
      maximum_distance_km:
        Number(document.getElementById("maximumDistance").value)
    };

    if (
      !payload.country ||
      !payload.region ||
      !Number.isFinite(payload.base_fee) ||
      !Number.isFinite(payload.price_per_km) ||
      !Number.isFinite(payload.minimum_fee) ||
      !Number.isFinite(payload.maximum_distance_km) ||
      payload.base_fee < 0 ||
      payload.price_per_km < 0 ||
      payload.minimum_fee < 0 ||
      payload.maximum_distance_km <= 0
    ) {
      showFormMessage("Tafadhali hakiki taarifa zote.", "error");
      return;
    }

    const saveButton = document.getElementById("savePricingBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Inahifadhi...";

    let result;

    if (id) {

      result = await db
        .from("delivery_pricing")
        .update(payload)
        .eq("id", id);

    } else {

      result = await db
        .from("delivery_pricing")
        .insert(payload);
    }

    saveButton.disabled = false;
    saveButton.textContent = id ? "Sasisha Bei" : "+ Hifadhi Bei";

    if (result.error) {
      showFormMessage(result.error.message, "error");
      return;
    }

    showFormMessage(
      id ? "Bei imesasishwa kikamilifu." : "Bei imehifadhiwa kikamilifu."
    );

    resetForm();
    await loadPricing();
  });
  /* EDIT, ACTIVATE, DEACTIVATE AND DELETE */

  tableBody.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const item = pricingRecords.find(
      record => String(record.id) === String(id)
    );

    if (!item) return;

    if (action === "edit") {

      document.getElementById("pricingId").value = item.id;
      document.getElementById("country").value = item.country;
      document.getElementById("region").value = item.region;
      document.getElementById("district").value = item.district || "";
      document.getElementById("currency").value = item.currency;
      document.getElementById("baseFee").value = item.base_fee;
      document.getElementById("pricePerKm").value = item.price_per_km;
      document.getElementById("minimumFee").value = item.minimum_fee;
      document.getElementById("maximumDistance").value =
        item.maximum_distance_km;

      document.getElementById("formTitle").textContent =
        "Hariri Delivery Pricing";

      document.getElementById("savePricingBtn").textContent =
        "Sasisha Bei";

      document.getElementById("cancelEditBtn").hidden = false;

      document.getElementById("pricingForm").scrollIntoView({
        behavior: "smooth"
      });

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

      button.disabled = true;

      const { error } = await db
        .from("delivery_pricing")
        .update({ is_active: nextStatus })
        .eq("id", item.id);

      button.disabled = false;

      if (error) {
        showListMessage(error.message, "error");
        return;
      }

      showListMessage("Status imebadilishwa kikamilifu.");
      await loadPricing();
      return;
    }

    if (action === "delete") {

      const confirmed = confirm(
        "Una uhakika unataka kufuta bei hii? Kitendo hiki hakiwezi kurejeshwa."
      );

      if (!confirmed) return;

      button.disabled = true;

      const { error } = await db
        .from("delivery_pricing")
        .delete()
        .eq("id", item.id);

      button.disabled = false;

      if (error) {
        showListMessage(error.message, "error");
        return;
      }

      showListMessage("Delivery pricing imefutwa.");
      await loadPricing();
    }
  });

  /* RESET FORM */

  function resetForm() {

    form.reset();

    document.getElementById("pricingId").value = "";

    document.getElementById("formTitle").textContent =
      "Ongeza Delivery Pricing";

    document.getElementById("savePricingBtn").textContent =
      "+ Hifadhi Bei";

    document.getElementById("cancelEditBtn").hidden = true;
  }

  /* FILTERS AND BUTTONS */

  document.getElementById("cancelEditBtn")
    .addEventListener("click", resetForm);

  document.getElementById("searchPricing")
    .addEventListener("input", renderPricing);

  document.getElementById("statusFilter")
    .addEventListener("change", renderPricing);

  document.getElementById("refreshPricing")
    .addEventListener("click", loadPricing);

  /* INITIAL LOAD */

  await loadPricing();

});