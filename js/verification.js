(() => {
  "use strict";

  const supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  const $ = (id) => document.getElementById(id);

  let applications = [];
  let selectedApplication = null;
  let currentAdmin = null;

  const elements = {
    adminEmail: $("adminEmail"),
    pendingCount: $("pendingCount"),
    approvedCount: $("approvedCount"),
    rejectedCount: $("rejectedCount"),
    table: $("applicationsTable"),
    filter: $("statusFilter"),
    search: $("searchInput"),
    modal: $("applicationModal"),
    details: $("applicationDetails"),
    note: $("adminNote"),
    close: $("closeModal"),
    approve: $("approveButton"),
    reject: $("rejectButton")
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

  function showTableMessage(text) {
    elements.table.innerHTML = `
      <tr>
        <td colspan="6" class="message">
          ${escapeHTML(text)}
        </td>
      </tr>
    `;
  }

  function notify(text) {
    alert(text);
  }

  function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString();
  }

  function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") return "approved";
    if (value === "rejected") return "rejected";

    return "pending";
  }

  function updateStats() {
    elements.pendingCount.textContent =
      applications.filter(a => normalizeStatus(a.status) === "pending").length;

    elements.approvedCount.textContent =
      applications.filter(a => normalizeStatus(a.status) === "approved").length;

    elements.rejectedCount.textContent =
      applications.filter(a => normalizeStatus(a.status) === "rejected").length;
  }

  async function checkAdmin() {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      window.location.href = "../login.html";
      return false;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      notify("Access denied. Admin account required.");
      await supabase.auth.signOut();
      window.location.href = "../login.html";
      return false;
    }

    currentAdmin = session.user;

    if (elements.adminEmail) {
      elements.adminEmail.textContent =
        session.user.email || "Administrator";
    }

    return true;
  }

  async function loadApplications() {
    showTableMessage("Loading verification applications...");

    const { data, error } = await supabase
      .from("verification_requests")
      .select(`
        id,
        user_id,
        full_name,
        document_type,
        document_number,
        document_url,
        status,
        admin_note,
        created_at,
        updated_at,
        reason,
        role
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Verification load error:", error);

      showTableMessage(
        "Failed to load applications: " + error.message
      );

      return;
    }

    applications = data || [];

    updateStats();
    renderApplications();
  }

  function renderApplications() {
    const filter = elements.filter?.value || "all";
    const search = (elements.search?.value || "").toLowerCase().trim();

    let filtered = applications.filter(application => {
      const status = normalizeStatus(application.status);

      const matchesStatus =
        filter === "all" || status === filter;

      const searchable = [
        application.full_name,
        application.document_type,
        application.document_number,
        application.user_id,
        application.role
      ].join(" ").toLowerCase();

      return matchesStatus && searchable.includes(search);
    });

    if (!filtered.length) {
      showTableMessage("No verification applications found.");
      return;
    }

    elements.table.innerHTML = filtered.map(application => {
      const status = normalizeStatus(application.status);

      return `
        <tr>
          <td>
            <strong>${escapeHTML(application.full_name)}</strong>
          </td>

          <td>${escapeHTML(application.document_type)}</td>

          <td>${escapeHTML(application.role || "user")}</td>

          <td>${escapeHTML(formatDate(application.created_at))}</td>

          <td>
            <span class="status ${status}">
              ${status}
            </span>
          </td>

          <td>
            <button
              class="view-btn"
              data-application-id="${escapeHTML(application.id)}"
              type="button"
            >
              View
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function openApplication(id) {
    const application = applications.find(item => item.id === id);

    if (!application) return;

    selectedApplication = application;

    const details = [
      ["Full Name", application.full_name],
      ["User ID", application.user_id],
      ["Account Type", application.role || "user"],
      ["Document Type", application.document_type],
      ["Document Number", application.document_number || "Not provided"],
      ["Reason", application.reason || "Not provided"],
      ["Document URL", application.document_url || "Not uploaded"],
      ["Submitted", formatDate(application.created_at)],
      ["Current Status", application.status],
      ["Previous Admin Note", application.admin_note || "None"]
    ];

    elements.details.innerHTML = details.map(([label, value]) => `
      <div class="detail">
        <small>${escapeHTML(label)}</small>
        <strong>${escapeHTML(value)}</strong>
      </div>
    `).join("");

    elements.note.value = application.admin_note || "";

    const pending = normalizeStatus(application.status) === "pending";

    elements.approve.disabled = !pending;
    elements.reject.disabled = !pending;

    elements.approve.style.opacity = pending ? "1" : ".5";
    elements.reject.style.opacity = pending ? "1" : ".5";

    elements.modal.classList.add("show");
  }

  async function reviewApplication(newStatus) {
    if (!selectedApplication || !currentAdmin) return;

    if (!["approved", "rejected"].includes(newStatus)) return;

    if (normalizeStatus(selectedApplication.status) !== "pending") {
      notify("This application has already been reviewed.");
      return;
    }

    const note = elements.note.value.trim();

    if (newStatus === "rejected" && !note) {
      notify("Please provide a reason before rejecting an application.");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to ${newStatus} this application?`
    );

    if (!confirmed) return;

    elements.approve.disabled = true;
    elements.reject.disabled = true;

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session || session.user.id !== currentAdmin.id) {
        throw new Error("Admin session expired. Please sign in again.");
      }

      const { data, error } = await supabase
        .from("verification_requests")
        .update({
          status: newStatus,
          admin_note: note || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedApplication.id)
        .eq("status", "pending")
        .select("id, status, admin_note")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Application was not updated. It may already have been reviewed."
        );
      }

      notify(
        `Application ${newStatus} successfully.`
      );

      elements.modal.classList.remove("show");
      selectedApplication = null;

      await loadApplications();

    } catch (error) {
      console.error("Review error:", error);

      notify(
        "Could not update application: " + error.message
      );

    } finally {
      elements.approve.disabled = false;
      elements.reject.disabled = false;
    }
  }

  function attachEvents() {
    elements.filter?.addEventListener("change", renderApplications);
    elements.search?.addEventListener("input", renderApplications);

    elements.table?.addEventListener("click", event => {
      const button = event.target.closest("[data-application-id]");

      if (!button) return;

      openApplication(button.dataset.applicationId);
    });

    elements.close?.addEventListener("click", () => {
      elements.modal.classList.remove("show");
      selectedApplication = null;
    });

    elements.modal?.addEventListener("click", event => {
      if (event.target === elements.modal) {
        elements.modal.classList.remove("show");
        selectedApplication = null;
      }
    });

    elements.approve?.addEventListener("click", () => {
      reviewApplication("approved");
    });

    elements.reject?.addEventListener("click", () => {
      reviewApplication("rejected");
    });
  }

  async function initialize() {
    try {
      const authorized = await checkAdmin();

      if (!authorized) return;

      attachEvents();

      await loadApplications();

      // Refresh applications periodically while the page is open.
      window.setInterval(() => {
        loadApplications();
      }, 30000);

    } catch (error) {
      console.error("Verification initialization error:", error);

      showTableMessage(
        "Unable to initialize verification: " + error.message
      );
    }
  }

  initialize();

})();
