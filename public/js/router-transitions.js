// js/router-transitions.js
// Simple router transitions: intercepts clicks with data-link or same-origin links
// and applies a fade-out/fade-in class for a smooth experience.
// Include as: <script type="module" src="js/router-transitions.js"></script>

const FADE_OUT_CLASS = 'route-fade-out';
const FADE_IN_CLASS = 'route-fade-in';
const FADE_DURATION = 220; // ms - tune to match your CSS animations

function isSameOriginLink(a) {
  try {
    const url = new URL(a.href, location.href);
    return url.origin === location.origin;
  } catch {
    return false;
  }
}

function onNavClick(e) {
  // handle anchor clicks
  const a = e.target.closest('a');
  if (!a) return;
  if (!isSameOriginLink(a)) return; // external links allowed
  if (a.target && a.target !== '_self') return;
  // optionally allow data-no-spa to opt-out
  if (a.hasAttribute('data-no-spa')) return;

  const href = a.getAttribute('href');
  if (!href || href.startsWith('#')) return; // anchor/hash link

  e.preventDefault();
  navigate(href);
}

async function navigate(href) {
  // Fade out
  document.documentElement.classList.add(FADE_OUT_CLASS);
  await wait(FADE_DURATION);

  // real navigation: use full href resolution
  const url = new URL(href, location.href);
  // If only hash change, just update location.hash
  if (url.pathname === location.pathname && url.search === location.search && url.hash !== location.hash) {
    history.pushState({}, '', url.href);
    document.documentElement.classList.remove(FADE_OUT_CLASS);
    refreshAfterNav();
    return;
  }

  // Load the new page via fetch and replace <main> (progressive enhancement)
  try {
    const resp = await fetch(url.href, { cache: 'no-store' });
    if (!resp.ok) {
      // fallback to full navigation if fetch fails
      location.href = url.href;
      return;
    }
    const html = await resp.text();
    // Parse and swap out the <main> or .page container
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newMain = doc.querySelector('main') || doc.querySelector('.page') || doc.body;
    const curMain = document.querySelector('main') || document.querySelector('.page') || document.body;

    if (newMain && curMain) {
      curMain.replaceWith(newMain);
      history.pushState({}, '', url.href);
      // run partials refresh (header active links)
      if (window.__refreshPartialsActiveNav) window.__refreshPartialsActiveNav();
      // Execute any page-specific inline scripts from fetched document
      const inlineScripts = Array.from(doc.querySelectorAll('script:not([src])'));
      inlineScripts.forEach(s => {
        try {
          new Function(s.textContent)();
        } catch (err) {
          console.warn('router-transitions: script exec failed', err);
        }
      });
    } else {
      // fallback to full navigation
      location.href = url.href;
      return;
    }
  } catch (err) {
    console.warn('navigate error', err);
    location.href = href; // fallback
    return;
  } finally {
    // Fade in
    document.documentElement.classList.remove(FADE_OUT_CLASS);
    document.documentElement.classList.add(FADE_IN_CLASS);
    setTimeout(() => document.documentElement.classList.remove(FADE_IN_CLASS), FADE_DURATION + 20);
    refreshAfterNav();
  }
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function refreshAfterNav() {
  // helpful hooks: re-run any small in-page init functions you expect
  if (window.onClientNav) {
    try { window.onClientNav(); } catch (e) { console.warn(e); }
  }
  // refresh active nav in header partial if present
  if (window.__refreshPartialsActiveNav) window.__refreshPartialsActiveNav();
}

// popstate support (back/forward)
window.addEventListener('popstate', () => {
  // perform a full reload of the current URL to ensure correct state
  // (could be optimized like navigate(location.href) if needed)
  location.reload();
});

// intercept clicks
document.addEventListener('click', onNavClick, true);

// export a helper to programmatically navigate
export function spaNavigate(href) { navigate(href); }

// auto-init: add minimal CSS to document if not present
(function addTransitionCSS() {
  if (document.getElementById('router-transitions-styles')) return;
  const s = document.createElement('style');
  s.id = 'router-transitions-styles';
  s.textContent = `
    /* minimal transitions used by router-transitions.js */
    .${FADE_OUT_CLASS} {
      transition: opacity ${FADE_DURATION}ms ease;
      opacity: 0.02 !important;
    }
    .${FADE_IN_CLASS} {
      transition: opacity ${FADE_DURATION}ms ease;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(s);
})();
