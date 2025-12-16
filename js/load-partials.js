async function fetchPartial(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function mountPartial(selectors, html) {
  if (!html) return;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.innerHTML = html;
      return;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const base = "/public/partials";

  mountPartial(
    ["#headerContainer", "#header"],
    await fetchPartial(base + "/header.html")
  );

  mountPartial(
    ["#footerContainer", "#footer"],
    await fetchPartial(base + "/footer.html")
  );

  mountPartial(
    ["#bottomNavContainer", "#bottom-nav"],
    await fetchPartial(base + "/bottom-nav.html")
  );
});
