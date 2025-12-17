// Detect preference
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme");

// Set initial theme
document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");

// Toggle button
const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);

    toggleBtn.textContent = next === "dark" ? "🌙" : "☀️";
  });

  // Set icon on load
  toggleBtn.textContent =
    document.documentElement.dataset.theme === "dark" ? "🌙" : "☀️";
}
