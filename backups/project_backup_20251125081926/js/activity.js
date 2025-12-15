// js/activity.js
import { db } from "./firebase-config.js";
import { collection, query, orderBy, limit, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

export function bindActivityFeed(gid, containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  const q = query(collection(db, "groups", gid, "activities"), orderBy("timestamp", "desc"), limit(50));
  onSnapshot(q, snap => {
    container.innerHTML = "";
    snap.forEach(doc => {
      const a = doc.data();
      const row = document.createElement('div');
      row.className = 'card';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.innerHTML = `
        <div style="font-weight:800">${a.title || 'Activity'}</div>
        <div class="small" style="color:var(--muted);margin-top:6px">${a.description || ''}</div>
        <div class="small" style="color:var(--muted);margin-top:8px">${new Date(a.timestamp?.toMillis ? a.timestamp.toMillis() : a.timestamp || Date.now()).toLocaleString()}</div>
      `;
      container.appendChild(row);
    });
  });
}

export async function pushActivity(gid, payload){
  try {
    await addDoc(collection(db, "groups", gid, "activities"), {
      ...payload,
      timestamp: new Date()
    });
  } catch(e){
    console.error("pushActivity error", e);
  }
}
