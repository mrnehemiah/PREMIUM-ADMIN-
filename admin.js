document.addEventListener("DOMContentLoaded", async () => {
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // Hakikisha Admin ameingia
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.replace("login.html");
    return;
  }

  const user = sessionData.session.user;

  // Hakikisha role yake ni admin kutoka Supabase
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

  // Mobile sidebar
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
      if (
        window.innerWidth <= 700 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    });
  }

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 700) {
        sidebar?.classList.remove("open");
      }
    });
  });

  // Dashboard statistics placeholders
  const stats = {
    totalUsers: "—",
    totalSellers: "—",
    totalProducts: "—",
    totalOrders: "—"
  };

  Object.entries(stats).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  console.log("ZUNE PREMIUM ADMIN secured and initialized.");
});