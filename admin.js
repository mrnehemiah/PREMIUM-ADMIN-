// =====================================================
// ZUNE MARKETPLACE - PREMIUM ADMIN DASHBOARD
// VERSION 2.0
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

  console.log("ZUNE PREMIUM ADMIN INITIALIZING...");

  // =====================================================
  // 1. GLOBAL MESSAGE SYSTEM
  // =====================================================

  const messageBox = () => {

    let box = document.getElementById("globalMessage");

    if (!box) {

      box = document.createElement("div");
      box.id = "globalMessage";

      box.style.cssText = `
        margin:15px;
        padding:14px;
        border-radius:12px;
        background:#fff5df;
        color:#805500;
        font-size:14px;
        white-space:pre-wrap;
      `;

      const main = document.querySelector("main") || document.body;

      main.prepend(box);
    }

    return box;
  };


  const showMessage = (message, isError = true) => {

    const box = messageBox();

    box.hidden = false;
    box.textContent = message;

    box.style.background = isError
      ? "#fff0f0"
      : "#e8f7ed";

    box.style.color = isError
      ? "#b42318"
      : "#15803d";
  };


  const updateStat = (id, value) => {

    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };


  // =====================================================
  // 2. SUPABASE CONNECTION
  // =====================================================

  let client;

  try {

    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      throw new Error(
        "Supabase configuration is missing."
      );
    }

    client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );


    // =====================================================
    // 3. CHECK AUTHENTICATION
    // =====================================================

    const {
      data: sessionData,
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {

      window.location.replace("login.html");

      return;
    }

    const user = sessionData.session.user;


    // =====================================================
    // 4. VERIFY ADMIN ROLE
    // =====================================================

    const {
      data: profile,
      error: profileError
    } = await client
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {

      await client.auth.signOut();

      window.location.replace("login.html");

      return;
    }


    console.log("ADMIN AUTHENTICATED:", user.email);


    // =====================================================
    // 5. SELLER MANAGEMENT
    // =====================================================

    function createSellerManagement() {

      // Avoid duplicate sections

      if (
        document.getElementById("zuneSellerManagement")
      ) {
        return;
      }

      const section = document.createElement("section");

      section.id = "zuneSellerManagement";

      section.style.cssText = `
        margin:20px 15px;
        padding:22px;
        background:#ffffff;
        border:1px solid #e5e7eb;
        border-radius:18px;
        box-shadow:0 4px 18px rgba(0,0,0,.04);
      `;


      // Seller section heading

      const heading = document.createElement("div");

      heading.style.cssText = `
        display:flex;
        align-items:center;
        gap:12px;
        margin-bottom:15px;
      `;

      heading.innerHTML = `
        <div style="
          width:46px;
          height:46px;
          background:#fff0df;
          color:#ea580c;
          border-radius:13px;
          display:grid;
          place-items:center;
          font-size:23px;
        ">🏪</div>

        <div>
          <h3 style="
            margin:0;
            font-size:18px;
            color:#111827;
          ">
            Seller Management
          </h3>

          <small style="color:#64748b">
            Manage ZUNE Marketplace Sellers
          </small>
        </div>
      `;


      const description = document.createElement("p");

      description.textContent =
        "Unaweza kumpa mteja yeyote uwezo wa kuwa Seller bila kuomba kupitia Seller Application.";

      description.style.cssText = `
        color:#64748b;
        font-size:14px;
        line-height:1.6;
        margin-bottom:18px;
      `;


      // Email label

      const label = document.createElement("label");

      label.textContent = "Email ya mteja";

      label.style.cssText = `
        display:block;
        font-size:14px;
        font-weight:700;
        margin-bottom:8px;
        color:#374151;
      `;


      // Email input

      const emailInput = document.createElement("input");

      emailInput.type = "email";
      emailInput.id = "sellerCustomerEmail";

      emailInput.placeholder = "customer@example.com";

      emailInput.autocomplete = "off";
      emailInput.required = true;

      emailInput.style.cssText = `
        width:100%;
        box-sizing:border-box;
        padding:15px;
        border:1px solid #d1d5db;
        border-radius:12px;
        font-size:15px;
        outline:none;
        margin-bottom:14px;
        background:#ffffff;
        color:#111827;
      `;


      // Promote button

      const promoteButton = document.createElement("button");

      promoteButton.type = "button";
      promoteButton.id = "promoteCustomerButton";

      promoteButton.textContent =
        "+ Muweke kuwa Seller";

      promoteButton.style.cssText = `
        width:100%;
        padding:16px;
        border:0;
        border-radius:12px;
        background:#ea580c;
        color:#ffffff;
        font-size:15px;
        font-weight:700;
        cursor:pointer;
        transition:.2s;
      `;


      promoteButton.addEventListener("mouseenter", () => {
        promoteButton.style.background = "#c2410c";
      });

      promoteButton.addEventListener("mouseleave", () => {
        promoteButton.style.background = "#ea580c";
      });


      // Result message

      const resultBox = document.createElement("div");

      resultBox.id = "sellerPromotionResult";

      resultBox.style.cssText = `
        display:none;
        margin-top:15px;
        padding:14px;
        border-radius:12px;
        font-size:14px;
        line-height:1.6;
        overflow-wrap:anywhere;
      `;


      // Append elements

      section.append(
        heading,
        description,
        label,
        emailInput,
        promoteButton,
        resultBox
      );


      const main =
        document.querySelector("main") ||
        document.body;

      main.prepend(section);


      // =================================================
      // PROMOTE CUSTOMER
      // =================================================

      promoteButton.addEventListener(
        "click",
        async () => {

          const email = emailInput.value
            .trim()
            .toLowerCase();

          resultBox.style.display = "none";


          // Validate email

          if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ) {

            resultBox.style.display = "block";
            resultBox.style.background = "#fff0f0";
            resultBox.style.color = "#b42318";

            resultBox.textContent =
              "Tafadhali ingiza email sahihi.";

            emailInput.focus();

            return;
          }


          // Confirmation

          const confirmed = window.confirm(
            "Una uhakika unataka kumpandisha " +
            email +
            " kuwa Seller wa ZUNE?"
          );

          if (!confirmed) return;


          // Loading state

          promoteButton.disabled = true;

          promoteButton.style.opacity = ".65";

          promoteButton.textContent =
            "Inachakata...";


          try {

            // Call secure Supabase RPC

            const {
              data,
              error
            } = await client.rpc(
              "admin_promote_customer_to_vendor",
              {
                customer_email: email
              }
            );

            if (error) throw error;


            if (!data || !data.success) {

              throw new Error(
                "Promotion haikukamilika."
              );
            }


            // Success

            resultBox.style.display = "block";

            resultBox.style.background = "#e8f7ed";

            resultBox.style.color = "#15803d";

            resultBox.innerHTML = "";


            const successTitle =
              document.createElement("strong");

            successTitle.textContent =
              "Seller ameongezwa kikamilifu!";


            const successEmail =
              document.createElement("div");

            successEmail.textContent =
              "Email: " + data.email;


            const successRole =
              document.createElement("div");

            successRole.textContent =
              "Role: " + data.role;


            resultBox.append(
              successTitle,
              successEmail,
              successRole
            );


            emailInput.value = "";


            // Refresh seller statistics

            await loadDashboardStatistics();


            console.log(
              "SELLER PROMOTED:",
              data
            );


          } catch (error) {

            console.error(
              "SELLER PROMOTION ERROR:",
              error
            );


            resultBox.style.display = "block";

            resultBox.style.background = "#fff0f0";

            resultBox.style.color = "#b42318";

            resultBox.textContent =
              "Imeshindikana kuongeza Seller: " +
              error.message;


          } finally {

            promoteButton.disabled = false;

            promoteButton.style.opacity = "1";

            promoteButton.textContent =
              "+ Muweke kuwa Seller";

          }

        }
      );

    }


    // Display Seller Management

    createSellerManagement();


    // =====================================================
    // 6. DASHBOARD STATISTICS
    // =====================================================

    async function getCount(
      table,
      column = null,
      value = null
    ) {

      try {

        let query = client
          .from(table)
          .select("*", {
            count: "exact",
            head: true
          });


        if (column && value !== null) {

          query = query.eq(column, value);

        }


        const {
          count,
          error
        } = await query;

        if (error) throw error;


        return {
          table,
          count: count ?? 0,
          error: null
        };


      } catch (error) {

        return {
          table,
          count: null,
          error
        };

      }

    }


    // =====================================================
    // LOAD ALL STATISTICS
    // =====================================================

    async function loadDashboardStatistics() {

      const results = await Promise.all([

        getCount("profiles"),

        getCount(
          "profiles",
          "role",
          "vendor"
        ),

        getCount("products"),

        getCount("orders")

      ]);


      const statIds = [

        "totalUsers",

        "totalSellers",

        "totalProducts",

        "totalOrders"

      ];


      results.forEach((result, index) => {

        updateStat(
          statIds[index],

          result.error
            ? "—"
            : result.count.toLocaleString()

        );

      });


      const failed = results.filter(
        result => result.error
      );


      if (failed.length > 0) {

        showMessage(
          "Some dashboard statistics could not load:\n\n" +

          failed.map(result =>
            result.table +
            ": " +
            result.error.message
          ).join("\n\n")
        );

      }


      console.log(
        "ZUNE DASHBOARD STATISTICS:",
        results
      );


      return results;

    }


    const results = await loadDashboardStatistics();


    // =====================================================
    // 7. ADMIN ANNOUNCEMENTS
    // =====================================================

    async function loadAnnouncements() {

      const container =
        document.getElementById(
          "announcementsList"
        );


      if (!container) {

        console.warn(
          "Announcements container not found."
        );

        return;

      }


      container.textContent =
        "Loading announcements...";


      const {
        data,
        error
      } = await client
        .from("admin_announcements")
        .select(`
          id,
          title,
          message,
          audience,
          display_type,
          priority,
          status,
          created_at,
          expires_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


      if (error) {

        console.error(
          "Announcement loading error:",
          error
        );

        container.textContent =
          "Failed to load announcements: " +
          error.message;

        return;

      }


      if (!data || data.length === 0) {

        container.textContent =
          "No announcements found.";

        return;

      }


      container.innerHTML = "";


      data.forEach(item => {

        const card =
          document.createElement("div");


        card.style.cssText = `
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:16px;
          margin-bottom:12px;
        `;


        const title =
          document.createElement("h3");

        title.textContent =
          item.title || "Untitled announcement";


        const message =
          document.createElement("p");

        message.textContent =
          item.message || "";


        const details =
          document.createElement("p");

        details.textContent =
          "Audience: " + item.audience +
          " | Display: " + item.display_type +
          " | Priority: " + item.priority +
          " | Status: " + item.status;


        details.style.cssText = `
          font-size:12px;
          color:#64748b;
          line-height:1.6;
        `;


        card.append(
          title,
          message,
          details
        );


        container.appendChild(card);

      });

    }


    await loadAnnouncements();


    // =====================================================
    // 8. DASHBOARD SUCCESS MESSAGE
    // =====================================================

    const failed = results.filter(
      result => result.error
    );


    if (failed.length === 0) {

      showMessage(
        "ZUNE Admin Dashboard loaded successfully.",
        false
      );

    }


    // =====================================================
    // 9. AUTH SESSION MONITOR
    // =====================================================

    client.auth.onAuthStateChange(
      (event, session) => {

        if (
          event === "SIGNED_OUT" ||
          !session
        ) {

          window.location.replace(
            "login.html"
          );

        }

      }
    );


    // =====================================================
    // 10. FINAL INITIALIZATION
    // =====================================================

    console.log(
      "ZUNE PREMIUM ADMIN DASHBOARD READY."
    );

    console.log(
      "SELLER MANAGEMENT READY."
    );

    console.log(
      "ANNOUNCEMENTS READY."
    );


  } catch (error) {

    console.error(
      "ZUNE ADMIN ERROR:",
      error
    );


    showMessage(
      "Dashboard error: " +
      (
        error.message ||
        "Unable to load data from Supabase."
      )
    );

  }

});