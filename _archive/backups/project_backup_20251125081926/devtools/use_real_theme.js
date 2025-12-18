// Toggle real app theme ON/OFF
(function () {
  const KEY = "devtools_use_real_theme";

  function applyTheme(enabled) {
    if (enabled) {
      // Load real CSS
      loadCSS("/css/layout.css");
      loadCSS("/css/theme-toggle.css");
      loadCSS("/css/onboarding/onboarding.css");
    } else {
      // Remove all injected CSS
      document.querySelectorAll("[data-real-theme]").forEach(el => el.remove());
    }
  }

  function loadCSS(url) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.realTheme = "1";
    document.head.appendChild(link);
  }

  // Restore state from localStorage
  const saved = localStorage.getItem(KEY) === "true";
  applyTheme(saved);

  // Wait for header to load
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector("#realThemeToggle");
    if (!toggle) return;

    toggle.checked = saved;

    toggle.addEventListener("change", () => {
      const isOn = toggle.checked;
      localStorage.setItem(KEY, isOn);
      applyTheme(isOn);
    });
  });
})();
