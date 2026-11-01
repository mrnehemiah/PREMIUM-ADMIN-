document.addEventListener("DOMContentLoaded", async () => {
  console.log("ZUNE PREMIUM ADMIN INITIALIZING...");

  const showError = (message) => {
    const box = document.getElementById("globalMessage");

    if (box) {
      box.hidden = false;
      box.textContent = message;
    }
  };

  try {
    // Check Supabase configuration
    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      throw new Error("Supabase configuration is missing.");
    }

    // Initialize Supabase
    const supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    // Check authenticated session
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      window.location.replace("login.html");
      return;
    }

    const user = sessionData.session.user;

    // Verify administrator role from database
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
      await supabaseClient.auth.signOut();
      window.location.replace("login.html");
      return;
    }

    // Load dashboard statistics
    const stats = {
      totalUsers: "—",
      totalSellers: "—",
      totalProducts: "—",
      totalOrders: "—"
    };

    Object.entries(stats).forEach(([id, value]) => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    });

    console.log("ZUNE PREMIUM ADMIN SECURED.");

  } catch (error) {
    console.error("Admin initialization error:", error);

    showError(
      error.message || "Unable to initialize administrator dashboard."
    );
  }
});