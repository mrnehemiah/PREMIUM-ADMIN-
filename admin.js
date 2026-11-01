document.addEventListener("DOMContentLoaded", async () => {
  console.log("ZUNE PREMIUM ADMIN INITIALIZING...");

  const showError = (message) => {
    const box = document.getElementById("globalMessage");

    if (box) {
      box.hidden = false;
      box.textContent = message;
    }
  };

  const updateStat = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  try {
    // 1. Check configuration
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

    // 3. Verify login session
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      window.location.replace("login.html");
      return;
    }

    // 4. Verify administrator role
    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role")
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

    // 5. Load real statistics
    async function getCount(table, column, value) {
      let query = client
        .from(table)
        .select("*", { count: "exact", head: true });

      if (column && value) {
        query = query.eq(column, value);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count ?? 0;
    }

    const results = await Promise.all([
      getCount("profiles"),
      getCount("profiles", "role", "seller"),
      getCount("products"),
      getCount("orders")
    ]);

    updateStat("totalUsers", results[0].toLocaleString());
    updateStat("totalSellers", results[1].toLocaleString());
    updateStat("totalProducts", results[2].toLocaleString());
    updateStat("totalOrders", results[3].toLocaleString());

    console.log("Dashboard statistics loaded successfully.");

  } catch (error) {
    console.error("ZUNE ADMIN ERROR:", error);

    showError(
      "Dashboard error: " +
      (error.message || "Unable to load data from Supabase.")
    );
  }
});