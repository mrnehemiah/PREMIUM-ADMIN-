// ============================================
// ZUNE ADMIN - DELIVERY PRICING
// ============================================

document.addEventListener("DOMContentLoaded", async () => {

  const $ = id => document.getElementById(id);

  const form = $("pricingForm");
  const regionSelect = $("region");
  const districtSelect = $("district");
  const wardSelect = $("ward");
  const tableBody = $("pricingTableBody");

  let db = null;
  let pricingRecords = [];
  let regions = [];
  let districts = [];
  let wards = [];

  // ------------------------------------------
  // SUPABASE CONNECTION
  // ------------------------------------------

  function connectSupabase() {

    if (window.zuneSupabase) {
      db = window.zuneSupabase;
      return true;
    }

    if (window.supabaseClient) {
      db = window.supabaseClient;
      return true;
    }

    if (
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY
    ) {
      db = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );

      window.zuneSupabase = db;
      return true;
    }

    return false;
  }

  function showFormMessage(message, success = false) {
    $("formMessage").textContent = message;
    $("formMessage").style.color =
      success ? "#15803d" : "#dc2626";
  }

  function showListMessage(message, error = false) {
    $("listMessage").textContent = message;
    $("listMessage").style.color =
      error ? "#dc2626" : "#77857b";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-TZ");
  }

  // ------------------------------------------
  // ADMIN ACCESS CHECK
  // ------------------------------------------

  async function checkAdmin() {

    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Tafadhali ingia kwenye akaunti ya admin.");
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (error) throw error;

    if (profile.role !== "admin") {
      throw new Error("Admin access required.");
    }
  }

  // ------------------------------------------
  // TANZANIA LOCATION DATA
  // ------------------------------------------

  async function loadLocations() {

    regionSelect.disabled = true;
    regionSelect.innerHTML =
      '<option value="">Inapakia mikoa...</option>';

    const response = await fetch(
      "https://api.openadmindata.org/api/v1/countries/tz.json"
    );

    if (!response.ok) {
      throw new Error("Imeshindwa kupakua orodha ya maeneo.");
    }

    const result = await response.json();

    regions = result.data?.region || [];
    districts = result.data?.district || [];
    wards = result.data?.ward || [];

    if (!regions.length) {
      throw new Error("Orodha ya mikoa haijapatikana.");
    }

    regionSelect.innerHTML =
      '<option value="">Chagua mkoa</option>';

    regions
      .sort((a, b) => a.name_en.localeCompare(b.name_en))
      .forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name_local || item.name_en;
        regionSelect.appendChild(option);
      });

    regionSelect.disabled = false;
  }

  function resetDistricts() {
    districtSelect.innerHTML =
      '<option value="">Chagua mkoa kwanza</option>';
    districtSelect.disabled = true;
  }

  function resetWards() {
    wardSelect.innerHTML =
      '<option value="">Chagua wilaya kwanza</option>';
    wardSelect.disabled = true;
  }

  regionSelect.addEventListener("change", () => {

    const regionId = regionSelect.value;

    resetDistricts();
    resetWards();

    if (!regionId) return;

    const matches = districts
      .filter(item => item.parent_id === regionId)
      .sort((a, b) => a.name_en.localeCompare(b.name_en));

    districtSelect.innerHTML =
      '<option value="">Chagua wilaya</option>';

    matches.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name_local || item.name_en;
      districtSelect.appendChild(option);
    });

    districtSelect.disabled = false;
  });

  districtSelect.addEventListener("change", () => {

    const districtId = districtSelect.value;

    resetWards();

    if (!districtId) return;

    const matches = wards
      .filter(item => item.parent_id === districtId)
      .sort((a, b) => a.name_en.localeCompare(b.name_en));

    wardSelect.innerHTML =
      '<option value="">Wilaya nzima / Kata zote</option>';

    matches.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name_local || item.name_en;
      wardSelect.appendChild(option);
    });

    wardSelect.disabled = false;
  });

  // ------------------------------------------
  // LOCATION NAME HELPERS
  // ------------------------------------------

  function selectedName(select) {
    return select.selectedOptions[0]?.textContent || "";
  }

  function findLocationName(list, id) {
    const item = list.find(entry => entry.id === id);
    return item ? (item.name_local || item.name_en) : "";
  }

  function getLocationRecord(record) {
    return {
      region: record.region || "",
      district: record.district || "",
      ward: record.ward || ""
    };
  }

  // ------------------------------------------
  // LOAD PRICING RECORDS
  // ------------------------------------------

  async function loadPricing() {

    showListMessage("Inapakia bei za delivery...");

    const { data, error } = await db
      .from("delivery_pricing")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    pricingRecords = data || [];

    renderPricing();
    updateStats();
  }
  // ------------------------------------------
  // UPDATE STATISTICS
  // ------------------------------------------

  function updateStats() {

    $("totalPricing").textContent =
      pricingRecords.length;

    $("activePricing").textContent =
      pricingRecords.filter(item => item.is_active).length;

    $("inactivePricing").textContent =
      pricingRecords.filter(item => !item.is_active).length;

    $("recordCount").textContent =
      document.querySelectorAll("#pricingTableBody tr[data-id]").length;
  }

  // ------------------------------------------
  // RENDER PRICING TABLE
  // ------------------------------------------

  function renderPricing() {

    const search = $("searchPricing").value
      .trim()
      .toLowerCase();

    const status = $("statusFilter").value;

    const filtered = pricingRecords.filter(item => {

      const text = [
        item.country,
        item.region,
        item.district,
        item.ward
      ].join(" ").toLowerCase();

      const matchesSearch = text.includes(search);

      const matchesStatus =
        status === "all" ||
        (status === "active" && item.is_active) ||
        (status === "inactive" && !item.is_active);

      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7"
            style="padding:25px;text-align:center;color:#77857b">
            Hakuna bei zilizopatikana.
          </td>
        </tr>
      `;

      updateStats();
      return;
    }

    tableBody.innerHTML = filtered.map(item => {

      const area = [
        item.region,
        item.district || "Wilaya zote",
        item.ward || "Kata zote"
      ].filter(Boolean).map(escapeHTML).join(" / ");

      return `
        <tr data-id="${escapeHTML(item.id)}"
            style="border-bottom:1px solid #e8eee9">

          <td style="padding:13px;font-size:12px">
            <strong>${area}</strong>
          </td>

          <td style="padding:13px">
            ${formatMoney(item.base_fee)}
          </td>

          <td style="padding:13px">
            ${formatMoney(item.price_per_km)}
          </td>

          <td style="padding:13px">
            ${formatMoney(item.minimum_fee)}
          </td>

          <td style="padding:13px">
            ${escapeHTML(item.maximum_distance_km)}
          </td>

          <td style="padding:13px">
            <span style="
              display:inline-block;
              padding:6px 10px;
              border-radius:20px;
              font-size:11px;
              font-weight:700;
              background:${item.is_active ? '#eaf7ee' : '#feecec'};
              color:${item.is_active ? '#15803d' : '#dc2626'}
            ">
              ${item.is_active ? "Active" : "Inactive"}
            </span>
          </td>

          <td style="padding:13px;white-space:nowrap">

            <button
              type="button"
              data-action="edit"
              data-id="${escapeHTML(item.id)}"
              style="border:0;background:#eaf7ee;color:#15803d;padding:8px 10px;border-radius:8px;cursor:pointer">
              Edit
            </button>

            <button
              type="button"
              data-action="toggle"
              data-id="${escapeHTML(item.id)}"
              style="border:0;background:#fff7d6;color:#805b00;padding:8px 10px;border-radius:8px;cursor:pointer">
              ${item.is_active ? "Disable" : "Enable"}
            </button>

            <button
              type="button"
              data-action="delete"
              data-id="${escapeHTML(item.id)}"
              style="border:0;background:#feecec;color:#dc2626;padding:8px 10px;border-radius:8px;cursor:pointer">
              Delete
            </button>

          </td>
        </tr>
      `;
    }).join("");

    updateStats();
  }

  // ------------------------------------------
  // RESET FORM
  // ------------------------------------------

  function resetForm() {

    form.reset();

    $("pricingId").value = "";
    $("country").value = "Tanzania";

    resetDistricts();
    resetWards();

    $("formTitle").textContent = "Weka Delivery Pricing";
    $("savePricingBtn").textContent = "Save Pricing";
    $("cancelEditBtn").style.display = "none";

    showFormMessage("");
  }

  // ------------------------------------------
  // SAVE OR UPDATE PRICING
  // ------------------------------------------

  form.addEventListener("submit", async event => {

    event.preventDefault();

    const region = selectedName(regionSelect);
    const district = selectedName(districtSelect);
    const ward = wardSelect.value
      ? selectedName(wardSelect)
      : null;

    if (!region || !district) {
      showFormMessage("Chagua mkoa na wilaya.");
      return;
    }

    const baseFee = Number($("baseFee").value);
    const pricePerKm = Number($("pricePerKm").value);
    const minimumFee = Number($("minimumFee").value);
    const maximumDistance = Number($("maximumDistance").value);

    if (
      !Number.isFinite(baseFee) ||
      !Number.isFinite(pricePerKm) ||
      !Number.isFinite(minimumFee) ||
      !Number.isFinite(maximumDistance) ||
      baseFee < 0 ||
      pricePerKm < 0 ||
      minimumFee < 0 ||
      maximumDistance <= 0
    ) {
      showFormMessage("Tafadhali hakiki gharama na umbali ulioingiza.");
      return;
    }

    const payload = {
      country: "Tanzania",
      region,
      district: district === "Wilaya nzima / Kata zote" ? null : district,
      ward,
      currency: "TZS",
      base_fee: baseFee,
      price_per_km: pricePerKm,
      minimum_fee: minimumFee,
      maximum_distance_km: maximumDistance,
      updated_at: new Date().toISOString()
    };

    const id = $("pricingId").value;
    const saveButton = $("savePricingBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

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

      if (result.error) throw result.error;

      if (!result.data || !result.data.length) {
        throw new Error("Hakuna rekodi iliyohifadhiwa. Hakiki ruhusa za database.");
      }

      showFormMessage(
        id ? "Bei imebadilishwa kikamilifu." : "Bei imehifadhiwa kikamilifu.",
        true
      );

      resetForm();
      await loadPricing();

    } catch (error) {

      console.error("Save pricing error:", error);
      showFormMessage(error.message || "Imeshindwa kuhifadhi bei.");

    } finally {

      saveButton.disabled = false;
      saveButton.textContent = "Save Pricing";
    }
  });

  // ------------------------------------------
  // EDIT LOCATION HELPER
  // ------------------------------------------

  function selectByName(select, list, name) {

    const item = list.find(entry =>
      (entry.name_local || entry.name_en) === name ||
      entry.name_en === name ||
      entry.name_local === name
    );

    if (!item) return false;

    select.value = item.id;
    return true;
  }

  async function editPricing(id) {

    const item = pricingRecords.find(record => record.id === id);
    if (!item) return;

    resetForm();

    const regionFound = selectByName(
      regionSelect,
      regions,
      item.region
    );

    if (!regionFound) {
      showFormMessage("Mkoa wa rekodi hii haujapatikana kwenye orodha.");
      return;
    }

    regionSelect.dispatchEvent(new Event("change"));

    const districtFound = selectByName(
      districtSelect,
      districts.filter(entry =>
        entry.parent_id === regionSelect.value
      ),
      item.district
    );

    if (!districtFound) {
      showFormMessage("Wilaya ya rekodi hii haijapatikana.");
      return;
    }

    districtSelect.dispatchEvent(new Event("change"));

    if (item.ward) {
      selectByName(
        wardSelect,
        wards.filter(entry =>
          entry.parent_id === districtSelect.value
        ),
        item.ward
      );
    }

    $("pricingId").value = item.id;
    $("baseFee").value = item.base_fee;
    $("pricePerKm").value = item.price_per_km;
    $("minimumFee").value = item.minimum_fee;
    $("maximumDistance").value = item.maximum_distance_km;
    $("currency").value = item.currency || "TZS";

    $("formTitle").textContent = "Hariri Delivery Pricing";
    $("savePricingBtn").textContent = "Update Pricing";
    $("cancelEditBtn").style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ------------------------------------------
  // TOGGLE ACTIVE STATUS
  // ------------------------------------------

  async function togglePricing(id) {

    const item = pricingRecords.find(record => record.id === id);
    if (!item) return;

    const { error } = await db
      .from("delivery_pricing")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    await loadPricing();
  }

  // ------------------------------------------
  // DELETE PRICING
  // ------------------------------------------

  async function deletePricing(id) {

    const confirmed = confirm(
      "Una uhakika unataka kufuta bei hii?"
    );

    if (!confirmed) return;

    const { error } = await db
      .from("delivery_pricing")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await loadPricing();
  }

  // ------------------------------------------
  // TABLE ACTIONS
  // ------------------------------------------

  tableBody.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    button.disabled = true;

    try {

      if (action === "edit") {
        await editPricing(id);
      }

      if (action === "toggle") {
        await togglePricing(id);
      }

      if (action === "delete") {
        await deletePricing(id);
      }

    } catch (error) {

      console.error("Pricing action error:", error);
      showListMessage(error.message || "Kitendo kimeshindwa.", true);

    } finally {

      button.disabled = false;
    }
  });

  // ------------------------------------------
  // SEARCH AND FILTER
  // ------------------------------------------

  $("searchPricing").addEventListener("input", renderPricing);
  $("statusFilter").addEventListener("change", renderPricing);

  // ------------------------------------------
  // CANCEL EDIT
  // ------------------------------------------

  $("cancelEditBtn").addEventListener("click", resetForm);

  // ------------------------------------------
  // START SYSTEM
  // ------------------------------------------

  try {

    if (!connectSupabase()) {
      throw new Error("Supabase haijaunganishwa. Hakiki config.js.");
    }

    await checkAdmin();
    await loadLocations();
    await loadPricing();

    showListMessage("Delivery Pricing imeunganishwa kikamilifu.");

  } catch (error) {

    console.error("ZUNE Delivery Pricing:", error);

    showListMessage(error.message || "Imeshindwa kuanzisha mfumo.", true);

    regionSelect.innerHTML =
      '<option value="">Orodha haijapatikana</option>';

  }

});