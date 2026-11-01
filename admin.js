
document.addEventListener("DOMContentLoaded", async () => {
  console.log("ZUNE PREMIUM ADMIN INITIALIZING...");

  const messageBox = () => {
    let box = document.getElementById("globalMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "globalMessage";

      box.style.cssText = `
        margin:15px;
        padding:14px;
        border-radius:10px;
        background:#fff5df;
        color:#805500;
        font-size:14px;
        white-space:pre-wrap;
        border-radius:12px;
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
    box.style.background = isError ? "#fff0f0" : "#e8f7ed";
    box.style.color = isError ? "#b42318" : "#15803d";
  };

  const updateStat = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  try {
    // 1. Supabase configuration
    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      throw new Error("Supabase configuration is missing.");
    }

    // 2. Connect
    const client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    // 3. Check session
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      window.location.replace("login.html");
      return;
    }

    const user = sessionData.session.user;

    // 4. Verify admin
    const { data: profile, error: profileError } =
      await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
      await client.auth.signOut();
      window.location.replace("login.html");
      return;
    }

    // 5. Statistics
    async function getCount(table, column = null, value = null) {
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

        const { count, error } = await query;

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

    const results = await Promise.all([
      getCount("profiles"),
      getCount("profiles", "role", "seller"),
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
        result.error ? "—" : result.count.toLocaleString()
      );
    });

    // 6. Load announcements from correct table
    async function loadAnnouncements() {
      const container =
        document.getElementById("announcementsList");

      if (!container) {
        console.warn(
          "Announcements container not found: announcementsList"
        );
        return;
      }

      container.innerHTML = "Loading announcements...";

      const { data, error } = await client
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Announcement loading error:", error);

        container.textContent =
          "Failed to load announcements: " + error.message;

        return;
      }

      if (!data || data.length === 0) {
        container.textContent = "No announcements found.";
        return;
      }

      container.innerHTML = "";

      data.forEach(item => {
        const card = document.createElement("div");

        card.style.cssText = `
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:16px;
          margin-bottom:12px;
        `;

        const title = document.createElement("h3");
        title.textContent = item.title;

        const message = document.createElement("p");
        message.textContent = item.message;

        const details = document.createElement("p");
        details.textContent =
          "Audience: " + item.audience +
          " | Display: " + item.display_type +
          " | Priority: " + item.priority +
          " | Status: " + item.status;

        details.style.cssText = `
          font-size:12px;
          color:#64748b;
        `;

        card.append(title, message, details);
        container.appendChild(card);
      });
    }

    await loadAnnouncements();

    // 7. Dashboard messages
    const failed = results.filter(result => result.error);

    if (failed.length > 0) {
      showMessage(
        "Some dashboard statistics could not load:\n\n" +
        failed.map(result =>
          result.table + ": " + result.error.message
        ).join("\n\n")
      );
    } else {
      showMessage(
        "Dashboard statistics and announcement records loaded successfully.",
        false
      );
    }

    console.log("ZUNE ADMIN DASHBOARD:", results);

  } catch (error) {
    console.error("ZUNE ADMIN ERROR:", error);

    showMessage(
      "Dashboard error: " +
      (error.message || "Unable to load data from Supabase.")
    );
  }
});
