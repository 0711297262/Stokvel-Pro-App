// js/pdf-export.js
export async function exportGroupReport(groupDataHtml){
  // simple approach: open a new window with print-ready HTML
  const win = window.open("", "_blank", "width=900,height=700");
  if(!win) {
    alert("Popup blocked. Allow popups to export report.");
    return;
  }
  const css = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l=>`<link rel="stylesheet" href="${l.getAttribute('href')}">`).join("\n");
  const html = `
  <html>
  <head><meta charset="utf-8" /><title>Group Report</title>${css}</head>
  <body style="padding:20px">${groupDataHtml}</body>
  </html>
  `;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // give browser a moment then print
  setTimeout(()=>{ win.print(); }, 600);
}
