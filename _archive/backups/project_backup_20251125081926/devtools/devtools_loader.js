// Auto-inject devtools header into every devtools page
(async function () {
  const container = document.createElement("div");
  container.id = "devtools-header-container";

  const header = await fetch("/devtools/devtools_header.html").then(r => r.text());
  container.innerHTML = header;

  document.body.prepend(container);
})();
