
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  // Mobile sidebar
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

  // Close sidebar after selecting a page
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 700) {
        sidebar?.classList.remove("open");
      }
    });
  });

  // Dashboard initialization
  console.log("ZUNE PREMIUM ADMIN initialized.");

  // Placeholder values until Supabase is connected
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
});
