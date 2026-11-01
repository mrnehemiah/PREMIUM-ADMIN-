
const supabase = window.supabaseClient;

const $ = id => document.getElementById(id);

let currentControl = null;
let currentAdmin = null;

function showNotice(message, type = "success") {
    const notice = $("securityNotice");

    notice.textContent = message;
    notice.className = `show ${type}`;

    window.setTimeout(() => {
        notice.className = "";
    }, 6000);
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

function toLocalInputValue(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const local = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Tarehe au muda si sahihi.");
    }

    return date.toISOString();
}

function formatDate(value) {
    if (!value) return "Not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString();
}

function getEffectiveStatus(control) {
    if (!control || !control.is_enabled) {
        return "OFF";
    }

    if (
        control.shutdown_at &&
        new Date(control.shutdown_at).getTime() <= Date.now()
    ) {
        return "OFF";
    }

    if (control.shutdown_at) {
        return "SCHEDULED";
    }

    return "ON";
}

async function verifyAdmin() {
    if (!supabase) {
        throw new Error(
            "Supabase client haijapatikana. Kagua js/config.js."
        );
    }

    const { data: authData, error: authError } =
        await supabase.auth.getUser();

    if (authError || !authData.user) {
        window.location.href = "../login.html";
        return false;
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", authData.user.id)
        .single();

    if (error || profile?.role !== "admin") {
        alert("Huna ruhusa ya kufungua ZUNE Security Center.");
        window.location.href = "../index.html";
        return false;
    }

    currentAdmin = profile;

    return true;
}

async function loadSecuritySettings() {
    $("mainStatusTitle").textContent = "Loading...";
    $("mainStatusBadge").textContent = "CHECKING";

    const { data, error } = await supabase
        .from("marketplace_control")
        .select("*")
        .eq("id", true)
        .maybeSingle();

    if (error) {
        throw new Error(
            "Imeshindikana kusoma marketplace_control: " + error.message
        );
    }

    if (!data) {
        throw new Error(
            "Control record haipo. Hakikisha umeendesha SQL ya marketplace_control."
        );
    }

    currentControl = data;

    renderSecuritySettings();
}

function renderSecuritySettings() {
    const control = currentControl;
    const status = getEffectiveStatus(control);

    $("mainStatusTitle").textContent =
        status === "ON"
            ? "ZUNE Marketplace is Active"
            : status === "SCHEDULED"
                ? "Marketplace Shutdown Scheduled"
                : "ZUNE Marketplace is Disabled";

    $("mainStatusDescription").textContent =
        status === "ON"
            ? "Marketplace control is currently enabled."
            : status === "SCHEDULED"
                ? `Scheduled shutdown: ${formatDate(control.shutdown_at)}`
                : "Marketplace is currently marked as unavailable.";

    const badge = $("mainStatusBadge");

    badge.textContent = status;

    badge.className = "status-pill";

    if (status === "OFF") {
        badge.classList.add("off");
    } else if (status === "SCHEDULED") {
        badge.classList.add("scheduled");
    }

    $("shutdownAt").value =
        toLocalInputValue(control.shutdown_at);

    $("returnAt").value =
        toLocalInputValue(control.expected_return_at);

    $("maintenanceMessage").value =
        control.maintenance_message || "";

    updateMessagePreview();

    $("scheduleSummary").textContent =
        control.shutdown_at
            ? `Scheduled shutdown: ${formatDate(control.shutdown_at)} | Expected return: ${formatDate(control.expected_return_at)}`
            : "No automatic shutdown is currently scheduled.";

    $("securityActivity").textContent =
        `Last updated: ${formatDate(control.updated_at)}. ` +
        `Updated by admin ID: ${control.updated_by || "Not recorded"}.`;
}

async function updateMarketplace(values, successMessage) {
    const updateValues = {
        ...values,
        updated_by: currentAdmin.id,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from("marketplace_control")
        .update(updateValues)
        .eq("id", true)
        .select("*")
        .single();

    if (error) {
        console.error("Marketplace update error:", error);

        throw new Error(
            "Mabadiliko hayajahifadhiwa: " + error.message
        );
    }

    currentControl = data;

    renderSecuritySettings();

    showNotice(successMessage, "success");
}

async function enableMarketplace() {
    const confirmed = confirm(
        "Unataka kuruhusu ZUNE Marketplace kufanya kazi tena?"
    );

    if (!confirmed) return;

    await updateMarketplace(
        {
            is_enabled: true,
            shutdown_at: null
        },
        "Marketplace control imewashwa. Ratiba ya kuzima imeondolewa."
    );
}

async function disableMarketplace() {
    const confirmed = confirm(
        "TAHADHARI: Unataka kuzima ZUNE Marketplace? " +
        "Watumiaji wa kawaida hawataweza kutumia huduma ikiwa maintenance gate imeunganishwa."
    );

    if (!confirmed) return;

    await updateMarketplace(
        {
            is_enabled: false,
            shutdown_at: null
        },
        "Marketplace imewekwa kuwa DISABLED."
    );
}

async function saveShutdownSchedule() {
    const shutdownValue = $("shutdownAt").value;
    const returnValue = $("returnAt").value;

    if (!shutdownValue) {
        throw new Error(
            "Weka tarehe na muda wa automatic shutdown."
        );
    }

    const shutdownAt = fromLocalInputValue(shutdownValue);
    const returnAt = fromLocalInputValue(returnValue);

    if (new Date(shutdownAt).getTime() <= Date.now()) {
        throw new Error(
            "Muda wa shutdown lazima uwe mbele ya muda wa sasa."
        );
    }

    if (
        returnAt &&
        new Date(returnAt).getTime() <= new Date(shutdownAt).getTime()
    ) {
        throw new Error(
            "Expected return time lazima iwe baada ya shutdown time."
        );
    }

    await updateMarketplace(
        {
            is_enabled: true,
            shutdown_at: shutdownAt,
            expected_return_at: returnAt
        },
        "Automatic shutdown schedule imehifadhiwa."
    );
}

async function clearShutdownSchedule() {
    if (!currentControl?.shutdown_at) {
        showNotice("Hakuna shutdown schedule ya kufuta.");
        return;
    }

    const confirmed = confirm(
        "Unataka kufuta ratiba ya automatic shutdown?"
    );

    if (!confirmed) return;

    await updateMarketplace(
        {
            shutdown_at: null
        },
        "Shutdown schedule imeondolewa."
    );
}

async function saveMaintenanceMessage() {
    const message = $("maintenanceMessage").value.trim();

    if (!message) {
        throw new Error(
            "Andika ujumbe ambao watumiaji wataona."
        );
    }

    if (message.length > 1000) {
        throw new Error("Ujumbe umezidi herufi 1000.");
    }

    await updateMarketplace(
        {
            maintenance_message: message
        },
        "Maintenance message imehifadhiwa."
    );
}

function updateMessagePreview() {
    const message = $("maintenanceMessage").value.trim();

    $("messagePreview").textContent =
        message || "Your maintenance message will appear here.";
}

function setButtonLoading(button, loading, originalText) {
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : originalText;
}

async function runAction(buttonId, originalText, action) {
    const button = $(buttonId);

    try {
        setButtonLoading(button, true, originalText);
        await action();
    } catch (error) {
        console.error(error);
        showNotice(error.message || "Hitilafu imetokea.", "error");
    } finally {
        setButtonLoading(button, false, originalText);
    }
}

function connectSecurityButtons() {
    $("enableMarketplace").addEventListener("click", () => {
        runAction(
            "enableMarketplace",
            "Enable Marketplace",
            enableMarketplace
        );
    });

    $("disableMarketplace").addEventListener("click", () => {
        runAction(
            "disableMarketplace",
            "Disable Marketplace",
            disableMarketplace
        );
    });

    $("saveSchedule").addEventListener("click", () => {
        runAction(
            "saveSchedule",
            "Save Shutdown Schedule",
            saveShutdownSchedule
        );
    });

    $("clearSchedule").addEventListener("click", () => {
        runAction(
            "clearSchedule",
            "Clear Schedule",
            clearShutdownSchedule
        );
    });

    $("saveMessage").addEventListener("click", () => {
        runAction(
            "saveMessage",
            "Save Public Message",
            saveMaintenanceMessage
        );
    });

    $("refreshSecurity").addEventListener("click", () => {
        runAction(
            "refreshSecurity",
            "↻ Refresh Security Status",
            loadSecuritySettings
        );
    });

    $("maintenanceMessage").addEventListener(
        "input",
        updateMessagePreview
    );
}

async function initializeSecurity() {
    try {
        const authorized = await verifyAdmin();

        if (!authorized) return;

        connectSecurityButtons();

        await loadSecuritySettings();

    } catch (error) {
        console.error("Security initialization error:", error);

        showNotice(
            error.message || "Security Center imeshindwa kuanza.",
            "error"
        );

        $("mainStatusTitle").textContent =
            "Security settings unavailable";

        $("mainStatusDescription").textContent =
            "Kagua Supabase connection na database setup.";

        $("mainStatusBadge").textContent = "ERROR";
        $("mainStatusBadge").className = "status-pill off";
    }
}

initializeSecurity();
