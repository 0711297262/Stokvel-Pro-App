// js/load-partials.js
//
// UNIVERSAL PARTIAL LOADER
// Works on:
//  - Live Server (127.0.0.1:5500)
//  - Local file paths
//  - Netlify production deployment
//

async function loadPartial(targetSelector, filePath) {
    const container = document.querySelector(targetSelector);
    if (!container) return;

    try {
        // Auto-detect root: local dev vs Netlify
        let base = "";

        if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
            // Live Server mode
            base = "";
        } else {
            // Netlify / production
            base = "/"; 
        }

        const response = await fetch(base + filePath);
        if (!response.ok) {
            console.error("Failed to load partial:", filePath, response.status);
            container.innerHTML = `<!-- Failed to load ${filePath} -->`;
            return;
        }

        container.innerHTML = await response.text();
    } catch (err) {
        console.error("Partial load error:", err);
    }
}

// Load all partials
export async function loadPartials() {

    // Paths updated to match your REAL folder structure:
    await loadPartial("#header", "css/public/partials/header.html");
    await loadPartial("#footer", "css/public/partials/footer.html");
}

// Auto-run on DOM ready
document.addEventListener("DOMContentLoaded", loadPartials);
