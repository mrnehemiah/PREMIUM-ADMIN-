
/* =========================================================
   ZUNE PREMIUM ADMIN DASHBOARD
   admin-products.js — SEHEMU YA 1/4
   Product Management + Supabase
   ========================================================= */

(function () {
  "use strict";

  const auth = window.AdminAuth;

  const Products = {
    client: auth ? auth.client : null,
    initialized: false,
    loading: false,
    products: [],
    filteredProducts: [],
    searchTerm: "",
    categoryFilter: "all",
    elements: {},

    // -------------------------------------------------------
    // 1. ESCAPE HTML FOR SAFE DISPLAY
    // -------------------------------------------------------

    escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    },

    // -------------------------------------------------------
    // 2. FORMAT PRICE
    // -------------------------------------------------------

    formatPrice(value) {
      const amount = Number(value);

      if (!Number.isFinite(amount)) {
        return "TZS 0";
      }

      return new Intl.NumberFormat("sw-TZ", {
        style: "currency",
        currency: "TZS",
        maximumFractionDigits: 0
      }).format(amount);
    },

    // -------------------------------------------------------
    // 3. FORMAT DATE
    // -------------------------------------------------------

    formatDate(value) {
      if (!value) return "Haijapatikana";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Haijapatikana";
      }

      return new Intl.DateTimeFormat("sw-TZ", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    },

    // -------------------------------------------------------
    // 4. CHECK ADMIN PERMISSIONS
    // -------------------------------------------------------

    async checkAccess() {
      if (!auth || !this.client) {
        console.error(
          "ZUNE Products: AdminAuth/Supabase haipatikani."
        );
        return false;
      }

      if (typeof auth.checkAccess !== "function") {
        console.error(
          "ZUNE Products: checkAccess() haipo."
        );
        return false;
      }

      try {
        return Boolean(await auth.checkAccess());
      } catch (error) {
        console.error(
          "ZUNE Products: Imeshindikana kuthibitisha ruhusa.",
          error
        );
        return false;
      }
    },

    // -------------------------------------------------------
    // 5. CACHE HTML ELEMENTS
    // -------------------------------------------------------

    cacheElements() {
      this.elements = {
        tableBody: document.getElementById("productsTableBody"),
        search: document.getElementById("productsSearchInput"),
        category: document.getElementById("productsCategoryFilter"),
        count: document.getElementById("productsTotalCount"),
        message: document.getElementById("productsMessage"),
        refresh: document.getElementById("productsRefreshBtn")
      };
    },

    // -------------------------------------------------------
    // 6. DISPLAY STATUS MESSAGE
    // -------------------------------------------------------

    showMessage(message, type = "info") {
      const element = this.elements.message;

      if (element) {
        element.textContent = message;
        element.dataset.type = type;
        element.hidden = false;
      } else if (auth && typeof auth.showMessage === "function") {
        auth.showMessage(message, type);
      } else {
        console.log(message);
      }
    }
  };

  // Sehemu ya 2, 3 na 4 itaongezwa hapa chini.
  // Usiongeze })(); mpaka mwisho wa Sehemu ya 4.

  window.AdminProducts = Products;

  console.log("ZUNE Products: Sehemu ya 1 imepakiwa.");

// =========================================================
// 7. LOAD PRODUCTS FROM SUPABASE
// =========================================================

AdminProducts.loadProducts = async function () {
  if (this.loading) return;

  this.loading = true;

  if (this.elements.tableBody) {
    this.elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">Inapakia bidhaa...</td>
      </tr>
    `;
  }

  try {
    const allowed = await this.checkAccess();

    if (!allowed) {
      this.showMessage(
        "Huna ruhusa ya kuona bidhaa.",
        "error"
      );
      return;
    }

    const { data, error } = await this.client
      .from("products")
      .select(
        "id, vendor_id, title, description, price, stock_quantity, image_url, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    this.products = Array.isArray(data) ? data : [];

    this.applyFilters();

    this.showMessage(
      `Bidhaa ${this.products.length} zimepakiwa.`,
      "success"
    );

  } catch (error) {
    console.error(
      "ZUNE Products: Imeshindikana kupakia bidhaa:",
      error
    );

    if (this.elements.tableBody) {
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Imeshindikana kupakia bidhaa. Kagua muunganisho
            na ruhusa za SELECT kwenye Supabase.
          </td>
        </tr>
      `;
    }

    this.showMessage(
      error.message || "Hitilafu wakati wa kupakia bidhaa.",
      "error"
    );

  } finally {
    this.loading = false;
  }
};


// =========================================================
// 8. FILTER PRODUCTS
// =========================================================

AdminProducts.applyFilters = function () {
  const term = String(this.searchTerm || "")
    .trim()
    .toLowerCase();

  this.filteredProducts = this.products.filter((product) => {
    const searchable = [
      product.title,
      product.description,
      product.id,
      product.vendor_id
    ].join(" ").toLowerCase();

    const matchesSearch =
      !term || searchable.includes(term);

    // Jedwali la products tulilonalo halina category column.
    // Kwa hiyo kichujio cha category hakitumiki kwa sasa.
    const matchesCategory =
      this.categoryFilter === "all";

    return matchesSearch && matchesCategory;
  });

  this.displayProducts();
};


// =========================================================
// 9. UPDATE PRODUCT COUNT
// =========================================================

AdminProducts.updateCount = function () {
  if (this.elements.count) {
    this.elements.count.textContent =
      `${this.filteredProducts.length} kati ya ` +
      `${this.products.length} bidhaa`;
  }
};


// =========================================================
// 10. DISPLAY PRODUCTS TABLE
// =========================================================

AdminProducts.displayProducts = function () {
  const body = this.elements.tableBody;

  this.updateCount();

  if (!body) {
    console.warn(
      "ZUNE Products: productsTableBody haipo kwenye index.html."
    );
    return;
  }

  if (this.filteredProducts.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          Hakuna bidhaa zinazolingana na utafutaji.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = this.filteredProducts.map((product) => {
    const id = this.escapeHTML(product.id);
    const title = this.escapeHTML(
      product.title || "Bidhaa haina jina"
    );
    const vendor = this.escapeHTML(
      product.vendor_id || "Haijapatikana"
    );
    const price = this.escapeHTML(
      this.formatPrice(product.price)
    );
    const stock = this.escapeHTML(
      product.stock_quantity ?? 0
    );
    const date = this.escapeHTML(
      this.formatDate(product.created_at)
    );

    return `
      <tr>
        <td>
          <strong>${title}</strong>
          <small>${id}</small>
        </td>
        <td>${vendor}</td>
        <td>${price}</td>
        <td>${stock}</td>
        <td>${date}</td>
        <td>
          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-product-details="${id}"
          >
            Maelezo
          </button>
        </td>
      </tr>
    `;
  }).join("");
};

// =========================================================
// 11. SHOW PRODUCT DETAILS
// =========================================================

AdminProducts.showProductDetails = function (productId) {
  const product = this.products.find(
    (item) => String(item.id) === String(productId)
  );

  if (!product) {
    this.showMessage("Bidhaa haijapatikana.", "error");
    return;
  }

  const title = this.escapeHTML(
    product.title || "Bidhaa haina jina"
  );

  const description = this.escapeHTML(
    product.description || "Hakuna maelezo"
  );

  const vendor = this.escapeHTML(
    product.vendor_id || "Haijapatikana"
  );

  const price = this.escapeHTML(
    this.formatPrice(product.price)
  );

  const stock = this.escapeHTML(
    product.stock_quantity ?? 0
  );

  const date = this.escapeHTML(
    this.formatDate(product.created_at)
  );

  const details = `
    <div class="admin-product-details">
      <p><strong>Jina:</strong> ${title}</p>
      <p><strong>Maelezo:</strong> ${description}</p>
      <p><strong>Muuzaji ID:</strong> ${vendor}</p>
      <p><strong>Bei:</strong> ${price}</p>
      <p><strong>Idadi iliyopo:</strong> ${stock}</p>
      <p><strong>Tarehe ya kuongezwa:</strong> ${date}</p>
      <p><strong>Product ID:</strong> ${this.escapeHTML(product.id)}</p>
    </div>
  `;

  if (
    window.ZUNEAdmin &&
    typeof window.ZUNEAdmin.openModal === "function"
  ) {
    window.ZUNEAdmin.openModal(
      "Maelezo ya Bidhaa",
      details
    );
    return;
  }

  window.alert([
    `Jina: ${product.title || "Bidhaa haina jina"}`,
    `Muuzaji ID: ${product.vendor_id || "Haijapatikana"}`,
    `Bei: ${this.formatPrice(product.price)}`,
    `Idadi: ${product.stock_quantity ?? 0}`,
    `Tarehe: ${this.formatDate(product.created_at)}`
  ].join("\n"));
};


// =========================================================
// 12. CONNECT SEARCH, FILTER AND REFRESH
// =========================================================

AdminProducts.connectControls = function () {
  const search = this.elements.search;
  const category = this.elements.category;
  const refresh = this.elements.refresh;
  const body = this.elements.tableBody;

  if (search && !search.dataset.productsBound) {
    search.addEventListener("input", () => {
      this.searchTerm = search.value || "";
      this.applyFilters();
    });

    search.dataset.productsBound = "true";
  }

  if (category && !category.dataset.productsBound) {
    category.addEventListener("change", () => {
      this.categoryFilter = category.value || "all";
      this.applyFilters();
    });

    category.dataset.productsBound = "true";
  }

  if (refresh && !refresh.dataset.productsBound) {
    refresh.addEventListener("click", () => {
      this.loadProducts();
    });

    refresh.dataset.productsBound = "true";
  }

  if (body && !body.dataset.productsBound) {
    body.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-product-details]"
      );

      if (!button) return;

      this.showProductDetails(
        button.getAttribute("data-product-details")
      );
    });

    body.dataset.productsBound = "true";
  }
};


// =========================================================
// 13. INITIALIZE PRODUCT MANAGEMENT
// =========================================================

AdminProducts.initialize = async function () {
  if (this.initialized) return;

  this.cacheElements();
  this.connectControls();

  const allowed = await this.checkAccess();

  if (!allowed) {
    this.showMessage(
      "Ingia kwa akaunti ya admin yenye ruhusa.",
      "error"
    );
    return;
  }

  await this.loadProducts();

  this.initialized = true;
};


// =========================================================
// 14. REFRESH PRODUCT LIST
// =========================================================

AdminProducts.refresh = async function () {
  this.cacheElements();
  await this.loadProducts();
};

// =========================================================
// 15. OPEN PRODUCTS PAGE
// =========================================================

AdminProducts.onPageOpen = async function () {
  if (!this.initialized) {
    await this.initialize();
    return;
  }

  await this.loadProducts();
};


// =========================================================
// 16. STARTUP
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
  AdminProducts.cacheElements();
  AdminProducts.connectControls();

  const productLinks = document.querySelectorAll(
    '[data-page="products"]'
  );

  productLinks.forEach((link) => {
    if (link.dataset.productsNavigationBound) return;

    link.addEventListener("click", function () {
      window.setTimeout(() => {
        AdminProducts.onPageOpen();
      }, 100);
    });

    link.dataset.productsNavigationBound = "true";
  });

  const productsPage = document.getElementById("page-products");

  if (
    productsPage &&
    productsPage.classList.contains("active")
  ) {
    AdminProducts.initialize();
  }
});


// =========================================================
// 17. GLOBAL REFRESH FUNCTION
// =========================================================

window.refreshZuneAdminProducts = function () {
  return AdminProducts.refresh();
};


// =========================================================
// 18. FILE COMPLETE
// =========================================================

console.log(
  "ZUNE Products: admin-products.js imepakiwa."
);

})();
