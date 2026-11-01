document.addEventListener("DOMContentLoaded", () => {
console.log("ZUNE LOGIN JS LOADED");

window.addEventListener("error", (event) => {
  const message = document.getElementById("loginMessage");

  if (message) {
    message.style.display = "block";
    message.style.background = "#fff0f0";
    message.style.color = "#b42318";
    message.textContent = "System error: " + event.message;
  }
});
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");

  const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

  function showMessage(text, success = false) {
    message.style.display = "block";
    message.textContent = text;
    message.style.background = success ? "#e8f7ed" : "#fff0f0";
    message.style.color = success ? "#087a43" : "#b42318";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Authenticating...";

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        throw new Error("Unable to verify your account.");
      }

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        await client.auth.signOut();
        throw new Error("Access denied. Administrator account required.");
      }

      showMessage("Login successful. Opening dashboard...", true);

      window.location.replace("index.html");

    } catch (error) {
      showMessage(error.message || "Login failed. Please try again.");

      loginButton.disabled = false;
      loginButton.textContent = "Sign In Securely";
    }
  });
});