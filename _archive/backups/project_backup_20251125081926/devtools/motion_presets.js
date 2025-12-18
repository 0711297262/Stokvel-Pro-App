/* -------------------------------------------------------
   Motion Presets Library v1 — Stokvel PRO
   GSAP-powered (with built-in fallback) micro-interactions
-------------------------------------------------------- */

window.Motion = (() => {

  // SAFETY WRAPPER
  function withGsap(cb) {
    if (window.gsap) return cb(window.gsap);

    // fallback: apply CSS props instantly
    return cb({
      to: (el, opts) => {
        try {
          const nodes = typeof el === "string" ? document.querySelectorAll(el) : [el];
          nodes.forEach(n => {
            if (!n) return;
            if (opts.css) Object.assign(n.style, opts.css);
            if (opts.opacity !== undefined) n.style.opacity = opts.opacity;
            if (opts.scale !== undefined) n.style.scale = opts.scale;
          });
        } catch (e) {}
      },
      fromTo: () => {},
      timeline: () => ({ to: () => {}, fromTo: () => {} })
    });
  }

  /* ----------------------
     BUTTON ANIMATIONS
  ----------------------- */

  function btnBounce(el) {
    withGsap(gsap => {
      gsap.to(el, {
        duration: 0.22,
        scale: 1.04,
        ease: "power3.out"
      });
      setTimeout(() =>
        gsap.to(el, { duration: 0.22, scale: 1 }), 200);
    });
  }

  function btnPress(el) {
    withGsap(gsap => {
      gsap.to(el, { duration: 0.1, scale: 0.96 });
      setTimeout(() =>
        gsap.to(el, { duration: 0.16, scale: 1 }), 120);
    });
  }

  /* ----------------------
     LIST & CARD MOTION
  ----------------------- */

  function slideFade(selector, delay = 0) {
    withGsap(gsap => {
      gsap.from(selector, {
        duration: 0.45,
        y: 22,
        opacity: 0,
        ease: "power3.out",
        delay
      });
    });
  }

  function staggerList(selector, stagger = 0.06) {
    withGsap(gsap => {
      gsap.from(selector, {
        duration: 0.5,
        y: 14,
        opacity: 0,
        stagger,
        ease: "power3.out"
      });
    });
  }

  /* ----------------------
     NAVIGATION MOTION
  ----------------------- */

  function navPop(selector) {
    withGsap(gsap => {
      gsap.from(selector, {
        duration: 0.5,
        scale: 0.7,
        opacity: 0,
        stagger: 0.07,
        ease: "back.out(1.7)"
      });
    });
  }

  /* ----------------------
     PROGRESS BAR
  ----------------------- */

  function animateProgress(selector, value = 100, duration = 1) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return;

    withGsap(gsap => {
      gsap.to(el, {
        duration,
        width: value + "%",
        ease: "power3.out"
      });
    });
  }

  /* ----------------------
     PAGE SECTIONS (entrance)
  ----------------------- */

  function sectionStagger(selector) {
    withGsap(gsap => {
      gsap.from(selector, {
        duration: 0.6,
        y: 26,
        opacity: 0,
        stagger: 0.08,
        ease: "power3.out"
      });
    });
  }

  /* ----------------------
     TOGGLE SWITCH
  ----------------------- */

  function togglePulse(selector) {
    withGsap(gsap =>
      gsap.fromTo(selector, { scale: 0.88 }, {
        duration: 0.22,
        scale: 1,
        ease: "power2.out"
      })
    );
  }

  /* ------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------ */
  return {
    btnBounce,
    btnPress,
    slideFade,
    staggerList,
    navPop,
    animateProgress,
    sectionStagger,
    togglePulse,
  };

})();
