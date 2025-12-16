/* ============================================================
   MOTION ENGINE — Stokvel PRO 2025
   Premium Web Animations API micro-engine
   Auto-animates elements with data-motion="" or motion-* classes
   ============================================================ */

console.log("%cMotion Engine Loaded", "color:#4a8dff; font-weight:700;");

/* ------------------------------------------------------------
   GLOBAL SETTINGS
------------------------------------------------------------ */
const MotionDefaults = {
  duration: 500,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  distance: 24,
};

/* ------------------------------------------------------------
   PRESET ANIMATIONS
------------------------------------------------------------ */
const MotionPresets = {
  "fade-in": (el) =>
    el.animate(
      [
        { opacity: 0 },
        { opacity: 1 },
      ],
      { duration: MotionDefaults.duration, easing: MotionDefaults.easing }
    ),

  "rise-in": (el) =>
    el.animate(
      [
        { opacity: 0, transform: "translateY(20px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: MotionDefaults.duration, easing: MotionDefaults.easing }
    ),

  "scale-in": (el) =>
    el.animate(
      [
        { opacity: 0, transform: "scale(0.95)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: MotionDefaults.duration, easing: MotionDefaults.easing }
    ),

  "slide-left-in": (el) =>
    el.animate(
      [
        { opacity: 0, transform: "translateX(20px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: MotionDefaults.duration, easing: MotionDefaults.easing }
    ),

  "slide-right-in": (el) =>
    el.animate(
      [
        { opacity: 0, transform: "translateX(-20px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: MotionDefaults.duration, easing: MotionDefaults.easing }
    ),

  "pop-in": (el) =>
    el.animate(
      [
        { opacity: 0, transform: "scale(0.8)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 450, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    ),
};

/* ------------------------------------------------------------
   STAGGER SYSTEM
------------------------------------------------------------ */
function applyStagger(container) {
  const items = [...container.querySelectorAll("[data-stagger], .stagger-item")];

  items.forEach((el, i) => {
    setTimeout(() => {
      MotionEngine.animate(el, el.dataset.motion || "fade-in");
    }, i * 120);
  });
}

/* ------------------------------------------------------------
   CORE ANIMATE FUNCTION
------------------------------------------------------------ */
const MotionEngine = {
  animate(el, presetName = "fade-in") {
    if (!el || !MotionPresets[presetName]) return;

    try {
      MotionPresets[presetName](el);
    } catch (err) {
      console.warn("Motion preset failed:", presetName, err);
    }
  },

  animateAll(root = document) {
    /* Auto-run motion-* classes */
    root.querySelectorAll("[class*='motion-']").forEach((el) => {
      const match = [...el.classList].find((c) => c.startsWith("motion-"));
      if (match) {
        const preset = match.replace("motion-", "");
        MotionEngine.animate(el, preset);
      }
    });

    /* Auto-run data-motion="preset" */
    root.querySelectorAll("[data-motion]").forEach((el) => {
      MotionEngine.animate(el, el.dataset.motion);
    });

    /* Stagger groups */
    root.querySelectorAll("[data-stagger-group]").forEach((group) =>
      applyStagger(group)
    );
  },
};

/* ------------------------------------------------------------
   PAGE-LOAD TRIGGER
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  MotionEngine.animateAll();
});

/* Export globally */
window.MotionEngine = MotionEngine;
