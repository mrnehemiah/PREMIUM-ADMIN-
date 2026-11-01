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
    // 1. Check Supabase configuration
    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      throw new Error("Supabase configuration is missing.");
    }

    // 2. Connect to Supabase
    const client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    // 3. Check login session
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      window.location.replace("login.html");
      return;
    }

    // 4. Verify administrator
    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      console.error("Admin verification failed:", profileError);
      await client.auth.signOut();
      window.location.replace("login.html");
      return;
    }

    // 5. Read each table independently
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

        if (error) {
          return {
            table,
            count: null,
            error
          };
        }

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

    // 6. Update successful statistics
    const statIds = [
      "totalUsers",
      "totalSellers",
      "totalProducts",
      "totalOrders"
    ];

    results.forEach((result, index) => {
      if (result.error) {
        updateStat(statIds[index], "—");
      } else {
        updateStat(
          statIds[index],
          result.count.toLocaleString()
        );
      }
    });

    // 7. Display exact errors
    const failed = results.filter(result => result.error);

    if (failed.length > 0) {
      const details = failed.map(result => {
        const error = result.error;

        return (
          result.table +
          ": " +
          (error.message || "Unknown error") +
          (error.code ? " | Code: " + error.code : "") +
          (error.hint ? " | Hint: " + error.hint : "")
        );
      });

      console.error("Supabase table errors:", failed);

      showMessage(
        "Some dashboard statistics could not load:\n\n" +
        details.join("\n\n")
      );

    } else {
      showMessage(
        "All dashboard statistics loaded successfully.",
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