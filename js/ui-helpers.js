// ui-helpers.js — clean version

export function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

export function hideModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}
