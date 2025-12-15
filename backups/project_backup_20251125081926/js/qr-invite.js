// js/qr-invite.js
export function generateInviteQR(containerId, text, size=220) {
  const container = document.getElementById(containerId);
  if(!container) return;
  // simple hashing -> create pseudo QR grid (visual QR)
  function hashToBits(s, n){
    const bits = [];
    let h = 2166136261; // FNV-1a
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    for(let i=0;i<n;i++){
      h = (h * 1664525 + 1013904223) >>> 0;
      bits.push((h >>> (i%24)) & 1);
    }
    return bits;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-0') || '#061226';
  ctx.fillRect(0,0,size,size);
  const grid = 21; // 21x21 visual
  const cell = size / grid;
  const bits = hashToBits(text, grid*grid);
  for(let y=0;y<grid;y++){
    for(let x=0;x<grid;x++){
      const i = y*grid + x;
      const v = bits[i];
      if(v){
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-2') || '#2b78c9';
        ctx.fillRect(x*cell, y*cell, cell, cell);
      } else {
        // leave as background
      }
    }
  }
  container.innerHTML = "";
  container.appendChild(canvas);
  return canvas;
}
