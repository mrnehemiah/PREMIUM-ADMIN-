
(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Announcements = {
    client: auth ? auth.client : null,

    initialized: false,
    loading: false,
    saving: false,

    announcements: [],
    filteredAnnouncements: [],

    searchTerm: "",
    statusFilter: "all",
    audienceFilter: "all",

    elements: {},

    // -----------------------------------------------------
    // ESCAPE HTML
    // -----------------------------------------------------

    escapeHTML(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    // -----------------------------------------------------
    // FORMAT DATE
    // -----------------------------------------------------

    formatDate(value) {
      if (!value) return "Haijawekwa";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Tarehe haijulikani";
      }

      return new Intl.DateTimeFormat("sw-TZ", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    },

    // -----------------------------------------------------
    // MESSAGE DISPLAY
    // -----------------------------------------------------

    showMessage(message, type = "info") {
      const target =
        this.elements.message ||
        document.getElementById("announcementsMessage");

      if (!target) {
        console.log(
          `[ZUNE Announcements: ${type}] ${message}`
        );
        return;
      }

      target.textContent = message;
      target.className =
        `admin-message admin-message-${type}`;

      target.hidden = false;
    },

    // -----------------------------------------------------
    // CHECK ADMIN ACCESS
    // -----------------------------------------------------

    async checkAccess() {
      if (!this.client || !auth) {
        this.showMessage(
          "AdminAuth haijapakiwa. Hakikisha admin-auth.js imeunganishwa.",
          "error"
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        this.showMessage(
          "Uhakiki wa ruhusa za admin haujapatikana.",
          "error"
        );
        return false;
      }

      try {
        const result = await auth.checkAccess();

        // Ruhusu tu matokeo yanayoonyesha access wazi.
        // Kama helper haitoi boolean, usikisie kuwa ni admin.
        if (result === true) return true;

        if (
          result &&
          typeof result === "object" &&
          (
            result.allowed === true ||
            result.isAdmin === true ||
            result.role === "admin"
          )
        ) {
          return true;
        }

        return false;
      } catch (error) {
        console.error(
          "ZUNE Announcements access error:",
          error
        );
        return false;
      }
    },

    // -----------------------------------------------------
    // CACHE HTML ELEMENTS
    // -----------------------------------------------------

    cacheElements() {
      this.elements.tableBody =
        document.getElementById("announcementsTableBody");

      this.elements.search =
        document.getElementById("announcementsSearchInput");

      this.elements.statusFilter =
        document.getElementById("announcementsStatusFilter");

      this.elements.audienceFilter =
        document.getElementById("announcementsAudienceFilter");

      this.elements.count =
        document.getElementById("announcementsTotalCount");

      this.elements.message =
        document.getElementById("announcementsMessage");

      this.elements.refresh =
        document.getElementById("announcementsRefreshBtn");

      this.elements.create =
        document.getElementById("announcementCreateBtn");

      this.elements.form =
        document.getElementById("announcementForm");
    }
  };

  // Fanya module ipatikane kwa scripts nyingine.
  window.AdminAnnouncements = Announcements;

  console.log(
    "ZUNE Announcements: Sehemu ya 1 imepakiwa."
  );
  
// SEHEMU YA 2 ITAENDELEA HAPA.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-announcements.js
// SEHEMU YA 2/4
// =========================================================

// ---------------------------------------------------------
// 1. LOAD ANNOUNCEMENTS
// ---------------------------------------------------------

AdminAnnouncements.loadAnnouncements = async function () {
  if (this.loading) return;

  this.loading = true;

  const body = this.elements.tableBody;

  if (body) {
    body.innerHTML = `
      <tr>
        <td colspan="6">Inapakia matangazo...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Imeshindikana kuthibitisha ruhusa za admin. Ingia tena au kagua AdminAuth.",
        "error"
      );

      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="6">
              Huna ruhusa ya kuona matangazo.
            </td>
          </tr>
        `;
      }

      return;
    }

    /*
      HATUA YA USALAMA:
      Bado hatujathibitisha jina la jedwali la matangazo
      wala columns zake katika Supabase.

      Kwa hiyo hatufanyi SELECT, INSERT, UPDATE au DELETE
      kwa jedwali lisilothibitishwa.
    */

    this.announcements = [];
    this.applyFilters();

    this.showMessage(
      "Muundo wa jedwali la matangazo bado unahitaji kuthibitishwa kabla ya kuunganisha database.",
      "info"
    );
  } catch (error) {
    console.error(
      "ZUNE Announcements load error:",
      error
    );

    this.showMessage(
      "Imeshindikana kuandaa orodha ya matangazo.",
      "error"
    );
  } finally {
    this.loading = false;
  }
};


// ---------------------------------------------------------
// 2. FILTER ANNOUNCEMENTS
// ---------------------------------------------------------

AdminAnnouncements.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredAnnouncements =
    this.announcements.filter(item => {
      const searchable = [
        item.title,
        item.message,
        item.audience,
        item.type,
        item.priority
      ]
        .map(value => String(value ?? ""))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term || searchable.includes(term);

      const status = String(
        item.status || "draft"
      ).toLowerCase();

      const matchesStatus =
        this.statusFilter === "all" ||
        status === this.statusFilter;

      const audience = String(
        item.audience || "all"
      ).toLowerCase();

      const matchesAudience =
        this.audienceFilter === "all" ||
        audience === this.audienceFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAudience
      );
    });

  this.displayAnnouncements();
};


// ---------------------------------------------------------
// 3. UPDATE TOTAL COUNT
// ---------------------------------------------------------

AdminAnnouncements.updateCount = function () {
  if (!this.elements.count) return;

  this.elements.count.textContent =
    `${this.filteredAnnouncements.length} kati ya ` +
    `${this.announcements.length} matangazo`;
};


// ---------------------------------------------------------
// 4. DISPLAY ANNOUNCEMENTS
// ---------------------------------------------------------

AdminAnnouncements.displayAnnouncements = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "announcementsTableBody haipo kwenye HTML."
    );
    return;
  }

  if (this.filteredAnnouncements.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna matangazo ya kuonyesha.
          Database itaunganishwa baada ya schema kuthibitishwa.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = this.filteredAnnouncements
    .map(item => {
      const title = this.escapeHTML(
        item.title || "Bila kichwa"
      );

      const message = this.escapeHTML(
        item.message || ""
      );

      const audienceLabels = {
        all: "Wote",
        buyers: "Wateja",
        customers: "Wateja",
        vendors: "Wauzaji",
        sellers: "Wauzaji"
      };

      const audienceKey = String(
        item.audience || "all"
      ).toLowerCase();

      const audience = this.escapeHTML(
        audienceLabels[audienceKey] ||
        audienceKey
      );

      const statusLabels = {
        draft: "Rasimu",
        scheduled: "Imepangwa",
        published: "Imechapishwa",
        active: "Inatumika",
        expired: "Muda umeisha",
        inactive: "Haifanyi kazi"
      };

      const statusKey = String(
        item.status || "draft"
      ).toLowerCase();

      const status = this.escapeHTML(
        statusLabels[statusKey] || statusKey
      );

      const date = this.escapeHTML(
        this.formatDate(item.created_at)
      );

      return `
        <tr>
          <td>
            <strong>${title}</strong>
            <small>${message}</small>
          </td>

          <td>${audience}</td>

          <td>
            <span class="admin-status">
              ${status}
            </span>
          </td>

          <td>${date}</td>

          <td>
            <button
              type="button"
              class="admin-btn admin-btn-secondary"
              data-announcement-details="${this.escapeHTML(item.id)}"
            >
              Maelezo
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
};

console.log(
  "ZUNE Announcements: Sehemu ya 2 imepakiwa."
);

// Sehemu ya 3 itaendelea hapa.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-announcements.js
// SEHEMU YA 3/4
// =========================================================

// ---------------------------------------------------------
// 5. SHOW ANNOUNCEMENT DETAILS
// ---------------------------------------------------------

AdminAnnouncements.showAnnouncementDetails = function (
  announcementId
) {
  const item = this.announcements.find(
    announcement =>
      String(announcement.id) === String(announcementId)
  );

  if (!item) {
    this.showMessage(
      "Tangazo halijapatikana.",
      "error"
    );
    return;
  }

  const audienceLabels = {
    all: "Wote",
    buyers: "Wateja",
    customers: "Wateja",
    vendors: "Wauzaji",
    sellers: "Wauzaji"
  };

  const typeLabels = {
    notification: "Notification pekee",
    banner: "Slide/banner pekee",
    both: "Notification na slide"
  };

  const priorityLabels = {
    low: "Chini",
    normal: "Kawaida",
    high: "Juu",
    urgent: "Dharura"
  };

  const audienceKey = String(
    item.audience || "all"
  ).toLowerCase();

  const typeKey = String(
    item.type || "notification"
  ).toLowerCase();

  const priorityKey = String(
    item.priority || "normal"
  ).toLowerCase();

  const details = [
    ["Kichwa", item.title],
    ["Ujumbe", item.message],
    [
      "Walengwa",
      audienceLabels[audienceKey] || audienceKey
    ],
    [
      "Aina ya tangazo",
      typeLabels[typeKey] || typeKey
    ],
    [
      "Kipaumbele",
      priorityLabels[priorityKey] || priorityKey
    ],
    ["Hali", item.status],
    ["Limeundwa", this.formatDate(item.created_at)],
    ["Linaisha", this.formatDate(item.expires_at)]
  ];

  const html = `
    <div class="announcement-details">
      ${details.map(([label, value]) => `
        <div class="announcement-detail-row">
          <span>${this.escapeHTML(label)}</span>
          <strong>${this.escapeHTML(value ?? "Haijatajwa")}</strong>
        </div>
      `).join("")}
    </div>

    <p class="admin-muted">
      Haya ni maelezo ya kuonyesha tu.
      Hakuna tangazo lililotumwa au kubadilishwa.
    </p>
  `;

  const backdrop = document.getElementById(
    "adminModalBackdrop"
  );

  const modal = document.getElementById("adminModal");

  const title = document.getElementById(
    "adminModalTitle"
  );

  const body = document.getElementById(
    "adminModalBody"
  );

  const actions = document.getElementById(
    "adminModalActions"
  );

  if (!backdrop || !modal || !title || !body) {
    this.showMessage(
      "Modal haipatikani. Kagua admin modal ndani ya index.html.",
      "error"
    );
    return;
  }

  title.textContent = "Maelezo ya Tangazo";
  body.innerHTML = html;

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        class="admin-btn admin-btn-primary"
        id="announcementDetailsClose"
      >
        Funga
      </button>
    `;

    document
      .getElementById("announcementDetailsClose")
      ?.addEventListener("click", () => {
        backdrop.hidden = true;
        modal.hidden = true;
      });
  }

  backdrop.hidden = false;
  modal.hidden = false;
};


// ---------------------------------------------------------
// 6. CONNECT SEARCH, FILTERS AND BUTTONS
// ---------------------------------------------------------

AdminAnnouncements.connectControls = function () {
  const search = this.elements.search;
  const statusFilter = this.elements.statusFilter;
  const audienceFilter = this.elements.audienceFilter;
  const refresh = this.elements.refresh;
  const create = this.elements.create;
  const tableBody = this.elements.tableBody;

  if (search && !search.dataset.announcementsBound) {
    search.dataset.announcementsBound = "true";

    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });
  }

  if (
    statusFilter &&
    !statusFilter.dataset.announcementsBound
  ) {
    statusFilter.dataset.announcementsBound = "true";

    statusFilter.addEventListener("change", () => {
      this.statusFilter = String(
        statusFilter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (
    audienceFilter &&
    !audienceFilter.dataset.announcementsBound
  ) {
    audienceFilter.dataset.announcementsBound = "true";

    audienceFilter.addEventListener("change", () => {
      this.audienceFilter = String(
        audienceFilter.value || "all"
      ).toLowerCase();

      this.applyFilters();
    });
  }

  if (refresh && !refresh.dataset.announcementsBound) {
    refresh.dataset.announcementsBound = "true";

    refresh.addEventListener("click", () => {
      this.loadAnnouncements();
    });
  }

  if (
    tableBody &&
    !tableBody.dataset.announcementsBound
  ) {
    tableBody.dataset.announcementsBound = "true";

    tableBody.addEventListener("click", event => {
      const button = event.target.closest(
        "[data-announcement-details]"
      );

      if (!button) return;

      this.showAnnouncementDetails(
        button.getAttribute(
          "data-announcement-details"
        )
      );
    });
  }

  // Kitufe hiki hakitatuma tangazo bado.
  // Sehemu ya 4 itaunganisha maandalizi ya fomu.
  if (create && !create.dataset.announcementsBound) {
    create.dataset.announcementsBound = "true";

    create.addEventListener("click", () => {
      this.openAnnouncementForm();
    });
  }
};


// ---------------------------------------------------------
// 7. RESET FILTERS
// ---------------------------------------------------------

AdminAnnouncements.resetFilters = function () {
  this.searchTerm = "";
  this.statusFilter = "all";
  this.audienceFilter = "all";

  if (this.elements.search) {
    this.elements.search.value = "";
  }

  if (this.elements.statusFilter) {
    this.elements.statusFilter.value = "all";
  }

  if (this.elements.audienceFilter) {
    this.elements.audienceFilter.value = "all";
  }

  this.applyFilters();
};

console.log(
  "ZUNE Announcements: Sehemu ya 3 imepakiwa."
);

// Sehemu ya 4 itaendelea hapa.
// Usifunge IIFE mpaka Sehemu ya 4.

// =========================================================
// ZUNE PREMIUM ADMIN
// FILE: admin-announcements.js
// SEHEMU YA 4/4
// =========================================================

// ---------------------------------------------------------
// 8. OPEN ANNOUNCEMENT FORM
// ---------------------------------------------------------

AdminAnnouncements.openAnnouncementForm = function () {
  const backdrop = document.getElementById(
    "adminModalBackdrop"
  );

  const modal = document.getElementById("adminModal");

  const title = document.getElementById(
    "adminModalTitle"
  );

  const body = document.getElementById(
    "adminModalBody"
  );

  const actions = document.getElementById(
    "adminModalActions"
  );

  if (!backdrop || !modal || !title || !body) {
    this.showMessage(
      "Modal haipatikani. Kagua admin modal kwenye index.html.",
      "error"
    );
    return;
  }

  title.textContent = "Andaa Tangazo Jipya";

  body.innerHTML = `
    <form id="announcementDraftForm" class="admin-form">

      <label for="announcementDraftTitle">
        Kichwa cha tangazo
      </label>

      <input
        id="announcementDraftTitle"
        name="title"
        type="text"
        maxlength="120"
        required
        placeholder="Mfano: Karibu ZUNE"
      >

      <label for="announcementDraftMessage">
        Ujumbe
      </label>

      <textarea
        id="announcementDraftMessage"
        name="message"
        rows="5"
        maxlength="2000"
        required
        placeholder="Andika ujumbe wa tangazo..."
      ></textarea>

      <label for="announcementDraftAudience">
        Walengwa
      </label>

      <select
        id="announcementDraftAudience"
        name="audience"
        required
      >
        <option value="all">Wateja na wauzaji wote</option>
        <option value="buyers">Wateja pekee</option>
        <option value="vendors">Wauzaji pekee</option>
      </select>

      <label for="announcementDraftType">
        Aina ya tangazo
      </label>

      <select
        id="announcementDraftType"
        name="type"
        required
      >
        <option value="notification">
          Notification pekee
        </option>
        <option value="banner">
          Slide/banner pekee
        </option>
        <option value="both">
          Notification na slide
        </option>
      </select>

      <label for="announcementDraftPriority">
        Kipaumbele
      </label>

      <select
        id="announcementDraftPriority"
        name="priority"
        required
      >
        <option value="normal">Kawaida</option>
        <option value="low">Chini</option>
        <option value="high">Juu</option>
        <option value="urgent">Dharura</option>
      </select>

      <label for="announcementDraftExpiry">
        Tarehe ya mwisho (si lazima)
      </label>

      <input
        id="announcementDraftExpiry"
        name="expires_at"
        type="datetime-local"
      >

      <p class="admin-muted">
        Hii ni fomu ya maandalizi tu.
        Haitahifadhi wala kutuma tangazo kwenye Supabase.
      </p>

      <p
        id="announcementDraftMessage"
        class="admin-message"
        hidden
      ></p>

    </form>
  `;

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        class="admin-btn admin-btn-secondary"
        id="announcementDraftCancel"
      >
        Ghairi
      </button>

      <button
        type="button"
        class="admin-btn admin-btn-primary"
        id="announcementDraftPreview"
      >
        Hakiki tangazo
      </button>
    `;
  }

  backdrop.hidden = false;
  modal.hidden = false;

  document
    .getElementById("announcementDraftCancel")
    ?.addEventListener("click", () => {
      backdrop.hidden = true;
      modal.hidden = true;
    });

  document
    .getElementById("announcementDraftPreview")
    ?.addEventListener("click", () => {
      this.previewAnnouncementDraft();
    });
};


// ---------------------------------------------------------
// 9. VALIDATE AND PREVIEW DRAFT
// ---------------------------------------------------------

AdminAnnouncements.previewAnnouncementDraft = function () {
  const form = document.getElementById(
    "announcementDraftForm"
  );

  const messageBox = document.getElementById(
    "announcementDraftMessage"
  );

  if (!form) {
    this.showMessage(
      "Fomu ya tangazo haipatikani.",
      "error"
    );
    return;
  }

  const title = form.elements.title.value.trim();
  const message = form.elements.message.value.trim();
  const audience = form.elements.audience.value;
  const type = form.elements.type.value;
  const priority = form.elements.priority.value;
  const expiryValue = form.elements.expires_at.value;

  if (!title || !message) {
    messageBox.textContent =
      "Jaza kichwa na ujumbe kabla ya kuendelea.";
    messageBox.className = "admin-message admin-message-error";
    messageBox.hidden = false;
    return;
  }

  if (expiryValue) {
    const expiryDate = new Date(expiryValue);

    if (
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate.getTime() <= Date.now()
    ) {
      messageBox.textContent =
        "Tarehe ya mwisho lazima iwe ya baadaye.";
      messageBox.className = "admin-message admin-message-error";
      messageBox.hidden = false;
      return;
    }
  }

  const draft = {
    title,
    message,
    audience,
    type,
    priority,
    expires_at: expiryValue
      ? new Date(expiryValue).toISOString()
      : null
  };

  const audienceLabels = {
    all: "Wateja na wauzaji wote",
    buyers: "Wateja pekee",
    vendors: "Wauzaji pekee"
  };

  const typeLabels = {
    notification: "Notification pekee",
    banner: "Slide/banner pekee",
    both: "Notification na slide"
  };

  const priorityLabels = {
    low: "Chini",
    normal: "Kawaida",
    high: "Juu",
    urgent: "Dharura"
  };

  const body = document.getElementById("adminModalBody");

  if (!body) return;

  body.innerHTML = `
    <div class="announcement-preview">
      <p class="admin-muted">HAKIKI YA TANGAZO — HALIJATUMWA</p>

      <h3>${this.escapeHTML(draft.title)}</h3>

      <p>${this.escapeHTML(draft.message).replace(/\n/g, "<br>")}</p>

      <hr>

      <p>
        <strong>Walengwa:</strong>
        ${this.escapeHTML(audienceLabels[draft.audience])}
      </p>

      <p>
        <strong>Aina:</strong>
        ${this.escapeHTML(typeLabels[draft.type])}
      </p>

      <p>
        <strong>Kipaumbele:</strong>
        ${this.escapeHTML(priorityLabels[draft.priority])}
      </p>

      <p>
        <strong>Tarehe ya mwisho:</strong>
        ${this.escapeHTML(
          draft.expires_at
            ? this.formatDate(draft.expires_at)
            : "Hakuna tarehe iliyowekwa"
        )}
      </p>

      <p class="admin-muted">
        Hakiki hii ni ya muda tu. Haijahifadhiwa kwenye database
        wala kutumwa kwa watumiaji.
      </p>
    </div>
  `;

  const actions = document.getElementById(
    "adminModalActions"
  );

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        class="admin-btn admin-btn-secondary"
        id="announcementPreviewBack"
      >
        Rudi kuhariri
      </button>

      <button
        type="button"
        class="admin-btn admin-btn-primary"
        id="announcementPreviewClose"
      >
        Funga hakiki
      </button>
    `;
  }

  document
    .getElementById("announcementPreviewBack")
    ?.addEventListener("click", () => {
      this.openAnnouncementForm();
    });

  document
    .getElementById("announcementPreviewClose")
    ?.addEventListener("click", () => {
      document.getElementById("adminModalBackdrop").hidden = true;
      document.getElementById("adminModal").hidden = true;
    });
};


// ---------------------------------------------------------
// 10. INITIALIZE MODULE
// ---------------------------------------------------------

AdminAnnouncements.initialize = async function () {
  if (this.initialized) {
    await this.loadAnnouncements();
    return;
  }

  this.cacheElements();
  this.connectControls();

  this.initialized = true;

  await this.loadAnnouncements();

  console.log(
    "ZUNE Announcements: Module imeanzishwa."
  );
};


// ---------------------------------------------------------
// 11. REFRESH
// ---------------------------------------------------------

AdminAnnouncements.refresh = async function () {
  await this.loadAnnouncements();
};


// ---------------------------------------------------------
// 12. PAGE NAVIGATION
// ---------------------------------------------------------

document.addEventListener("click", event => {
  const navLink = event.target.closest("[data-page]");

  if (!navLink) return;

  if (
    navLink.getAttribute("data-page") === "announcements"
  ) {
    AdminAnnouncements.initialize();
  }
});


// ---------------------------------------------------------
// 13. START MODULE
// ---------------------------------------------------------

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => AdminAnnouncements.initialize(),
    { once: true }
  );
} else {
  AdminAnnouncements.initialize();
}


// =========================================================
// END OF admin-announcements.js
// =========================================================

})();
