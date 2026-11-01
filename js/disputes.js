
const supabase = window.supabaseClient;

const tableBody = document.getElementById("disputeTableBody");
const searchInput = document.getElementById("disputeSearch");
const statusFilter = document.getElementById("disputeStatus");
const typeFilter = document.getElementById("disputeType");

let allDisputes = [];

const issueLabels = {
    item_not_received: "Item Not Received",
    wrong_item: "Wrong Item",
    damaged_item: "Damaged Item",
    payment_problem: "Payment Problem",
    seller_not_paid: "Seller Not Paid",
    refund_request: "Refund Request",
    order_cancelled: "Order Cancelled",
    other: "Other"
};

const statusLabels = {
    open: "Open",
    under_review: "Under Review",
    waiting_for_buyer: "Waiting for Buyer",
    waiting_for_seller: "Waiting for Seller",
    resolved: "Resolved",
    rejected: "Rejected",
    escalated: "Escalated"
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function formatMoney(amount, currency = "TZS") {
    return `${currency} ${Number(amount || 0).toLocaleString("en-US")}`;
}

function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

async function verifyAdmin() {
    if (!supabase) {
        throw new Error("Supabase client haijapatikana. Kagua config.js.");
    }

    const { data: authData, error: authError } =
        await supabase.auth.getUser();

    if (authError || !authData.user) {
        window.location.href = "../login.html";
        return false;
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

    if (error || profile?.role !== "admin") {
        alert("Huna ruhusa ya kufungua ukurasa huu.");
        window.location.href = "../index.html";
        return false;
    }

    return true;
}

async function loadDisputes() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="loading">
                Loading disputes...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("transaction_disputes")
        .select(`
            id,
            case_number,
            order_id,
            buyer_id,
            seller_id,
            issue_type,
            amount,
            currency,
            status,
            created_at,
            buyer:profiles!transaction_disputes_buyer_id_fkey(
                full_name,
                zune_id
            ),
            seller:profiles!transaction_disputes_seller_id_fkey(
                full_name,
                zune_id
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Disputes error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    Imeshindikana kupakia kesi. Kagua RLS na ruhusa za profiles.
                </td>
            </tr>
        `;

        return;
    }

    allDisputes = data || [];

    updateStatistics();
    renderDisputes();
}

function updateStatistics() {
    document.getElementById("openCases").textContent =
        allDisputes.filter(d => d.status === "open").length;

    document.getElementById("reviewCases").textContent =
        allDisputes.filter(d => d.status === "under_review").length;

    document.getElementById("resolvedCases").textContent =
        allDisputes.filter(d => d.status === "resolved").length;

    document.getElementById("escalatedCases").textContent =
        allDisputes.filter(d => d.status === "escalated").length;

    document.getElementById("totalDisputes").textContent =
        `${allDisputes.length} Cases`;
}

function renderDisputes() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedType = typeFilter.value;

    const filtered = allDisputes.filter(dispute => {
        const buyerZuneId = dispute.buyer?.zune_id || "";
        const sellerZuneId = dispute.seller?.zune_id || "";

        const searchable = [
            dispute.case_number,
            dispute.order_id,
            buyerZuneId,
            sellerZuneId,
            dispute.buyer?.full_name,
            dispute.seller?.full_name
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(search);

        const matchesStatus =
            selectedStatus === "all" ||
            dispute.status === selectedStatus;

        const matchesType =
            selectedType === "all" ||
            dispute.issue_type === selectedType;

        return matchesSearch && matchesStatus && matchesType;
    });

    if (!filtered.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <div class="icon">📂</div>
                        <h3>No disputes found</h3>
                        <p>Hakuna kesi inayolingana na utafutaji wako.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = filtered.map(dispute => {
        const buyerName = dispute.buyer?.full_name || "Unknown Buyer";
        const sellerName = dispute.seller?.full_name || "Unknown Seller";

        const buyerZune = dispute.buyer?.zune_id || "Not assigned";
        const sellerZune = dispute.seller?.zune_id || "Not assigned";

        const statusClass = ["resolved", "rejected"].includes(dispute.status)
            ? dispute.status
            : "";

        return `
            <tr>
                <td>
                    <span class="case-number">
                        ${escapeHTML(dispute.case_number)}
                    </span>
                </td>

                <td title="${escapeHTML(dispute.order_id)}">
                    ${escapeHTML(dispute.order_id?.slice(0, 8) || "—")}
                </td>

                <td>
                    <strong>${escapeHTML(buyerName)}</strong><br>
                    <small>ZUNE ID: ${escapeHTML(buyerZune)}</small>
                </td>

                <td>
                    <strong>${escapeHTML(sellerName)}</strong><br>
                    <small>ZUNE ID: ${escapeHTML(sellerZune)}</small>
                </td>

                <td>
                    ${escapeHTML(issueLabels[dispute.issue_type] || dispute.issue_type)}
                </td>

                <td>
                    ${escapeHTML(formatMoney(dispute.amount, dispute.currency))}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHTML(statusLabels[dispute.status] || dispute.status)}
                    </span>
                </td>

                <td>${escapeHTML(formatDate(dispute.created_at))}</td>

                <td>
                    <button
                        class="view-btn"
                        data-case-id="${escapeHTML(dispute.id)}"
                    >
                        View Case
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

searchInput.addEventListener("input", renderDisputes);
statusFilter.addEventListener("change", renderDisputes);
typeFilter.addEventListener("change", renderDisputes);

document.getElementById("refreshDisputes")
    .addEventListener("click", loadDisputes);

document.getElementById("exportDisputes")
    .addEventListener("click", () => {
        if (!allDisputes.length) {
            alert("Hakuna kesi za ku-export.");
            return;
        }

        const headers = [
            "Case Number",
            "Order ID",
            "Buyer ZUNE ID",
            "Seller ZUNE ID",
            "Issue",
            "Amount",
            "Currency",
            "Status",
            "Date"
        ];

        const rows = allDisputes.map(d => [
            d.case_number,
            d.order_id,
            d.buyer?.zune_id || "",
            d.seller?.zune_id || "",
            issueLabels[d.issue_type] || d.issue_type,
            d.amount,
            d.currency,
            statusLabels[d.status] || d.status,
            formatDate(d.created_at)
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(value =>
                `"${String(value ?? "").replace(/"/g, '""')}"`
            ).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "ZUNE-Disputes.csv";
        link.click();

        URL.revokeObjectURL(url);
    });

tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-case-id]");

    if (!button) return;

    const caseId = button.dataset.caseId;

    const selectedCase = allDisputes.find(
        dispute => dispute.id === caseId
    );

    if (!selectedCase) return;

    alert(
        `Case: ${selectedCase.case_number}\n` +
        `Buyer ZUNE ID: ${selectedCase.buyer?.zune_id || "Not assigned"}\n` +
        `Seller ZUNE ID: ${selectedCase.seller?.zune_id || "Not assigned"}\n\n` +
        "Case details page itaongezwa katika hatua inayofuata."
    );
});

(async function initializeDisputes() {
    try {
        const authorized = await verifyAdmin();

        if (authorized) {
            await loadDisputes();
        }
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
})();
