// js/calendar.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

export async function renderContributionCalendar(gid, containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  // build month grid for current month
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0..6
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const grid = document.createElement('div');
  grid.style.display='grid';
  grid.style.gridTemplateColumns='repeat(7,1fr)';
  grid.style.gap='6px';

  // day headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    const dh = document.createElement('div'); dh.style.fontSize='12px'; dh.style.color='var(--muted)'; dh.style.textAlign='center'; dh.textContent = d;
    grid.appendChild(dh);
  });

  // placeholders before first day
  for(let i=0;i<startDay;i++){
    const p = document.createElement('div'); p.innerHTML='&nbsp;'; p.style.minHeight='44px'; grid.appendChild(p);
  }
  // days
  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('div');
    cell.style.minHeight='44px';
    cell.style.padding='6px';
    cell.style.borderRadius='8px';
    cell.style.background='transparent';
    cell.style.border='1px solid rgba(255,255,255,0.03)';
    cell.style.textAlign='center';
    cell.innerHTML = `<div style="font-weight:700">${d}</div>`;
    grid.appendChild(cell);
  }

  container.appendChild(grid);

  // fetch any contribution events for this group for month (assumes contributions collection has timestamp)
  try {
    const q = query(collection(db, "groups", gid, "contributions")); // lightweight fetch; optimize later
    const snap = await getDocs(q);
    snap.forEach(doc=>{
      const c = doc.data();
      const ts = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp || Date.now());
      if(ts.getMonth() === month && ts.getFullYear() === year){
        const day = ts.getDate();
        // find cell nth (headers + startDay + day-1)
        const idx = 7 + startDay + (day - 1);
        const cell = grid.children[idx];
        if(cell){
          const dot = document.createElement('div');
          dot.style.width='8px'; dot.style.height='8px'; dot.style.borderRadius='50%';
          dot.style.background='var(--accent-2)'; dot.style.margin='6px auto 0';
          cell.appendChild(dot);
        }
      }
    });
  } catch(e){
    console.error('calendar fetch', e);
  }
}
