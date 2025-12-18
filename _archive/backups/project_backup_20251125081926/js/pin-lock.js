// js/pin-lock.js
// PIN lock v1 (Soft Glass Keypad) - uses Web Crypto SHA-256 + salt
// Exposes: initPinLock(options), requirePin(options) -> Promise<boolean>, setPinFlow()

const STORAGE_KEY = "stokvel_pin_hash";
const SALT_KEY = "stokvel_pin_salt";
const AUTLOCK_KEY = "stokvel_autolock_minutes";

function bytesToHex(buffer){
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(text){
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(hash);
}

function randSalt(len=12){
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => (b%36).toString(36)).join('').toUpperCase();
}

async function computeHash(salt, pin){
  // combine salt + pin then hash
  return await sha256Hex(salt + '|' + pin);
}

async function setPin(pin){
  const salt = randSalt(12);
  const hash = await computeHash(salt, pin);
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(STORAGE_KEY, hash);
  return true;
}

async function verifyPin(pin){
  const salt = localStorage.getItem(SALT_KEY);
  const stored = localStorage.getItem(STORAGE_KEY);
  if(!salt || !stored) return false;
  const h = await computeHash(salt, pin);
  return h === stored;
}

// small UI helpers (works with security/pin_lock.html)
function updateDots(len){
  for(let i=0;i<4;i++){
    const d = document.getElementById('dot'+i);
    if(!d) continue;
    d.classList.toggle('filled', i < len);
  }
}

function showError(msg){
  const el = document.getElementById('errorMsg');
  if(el) el.textContent = msg;
  setTimeout(()=>{ if(el) el.textContent = ''; }, 2600);
}

let inputPin = '';
let isSetupMode = false;
let setupConfirm = null;
let autoLockTimer = null;
let autoLockDelayMs = 3 * 60 * 1000; // default 3 min

export function initPinLock({ autoLockMinutes = 3, onUnlocked = null } = {}){
  // setup auto-lock preference
  autoLockDelayMs = (localStorage.getItem(AUTLOCK_KEY) ? parseInt(localStorage.getItem(AUTLOCK_KEY),10) : autoLockMinutes) * 60 * 1000;
  document.getElementById('autoLockText').textContent = `${autoLockMinutes} min`;

  // check if pin exists
  const pinExists = !!localStorage.getItem(STORAGE_KEY);
  if(!pinExists){
    isSetupMode = true;
    document.getElementById('lockTitle').textContent = 'Create a PIN';
    document.getElementById('lockSubtitle').textContent = 'Choose a secure 4-digit PIN';
    document.getElementById('setupNote').style.display = 'block';
  }

  // wire keypad buttons
  document.querySelectorAll('[data-key]').forEach(k=>{
    k.addEventListener('click', async (ev)=>{
      const key = k.getAttribute('data-key');
      if(!key) return;
      if(inputPin.length >= 4) return;
      inputPin += key;
      updateDots(inputPin.length);
      if(inputPin.length === 4){
        // small delay for UX
        setTimeout(async ()=>{
          if(isSetupMode){
            if(!setupConfirm){
              setupConfirm = inputPin;
              inputPin = ''; updateDots(0);
              document.getElementById('lockTitle').textContent = 'Confirm PIN';
              document.getElementById('lockSubtitle').textContent = 'Re-enter your PIN to confirm';
              return;
            } else {
              if(setupConfirm !== inputPin){
                showError('PINs do not match. Try again.');
                setupConfirm = null;
                inputPin = ''; updateDots(0);
                document.getElementById('lockTitle').textContent = 'Create a PIN';
                document.getElementById('lockSubtitle').textContent = 'Choose a secure 4-digit PIN';
                return;
              } else {
                // save pin
                await setPin(inputPin);
                isSetupMode = false;
                setupConfirm = null;
                inputPin = ''; updateDots(0);
                document.getElementById('lockTitle').textContent = 'PIN set';
                document.getElementById('lockSubtitle').textContent = 'PIN saved. You may now unlock.';
                // call unlocked action if passed
                if(typeof onUnlocked === 'function') onUnlocked();
                return;
              }
            }
          } else {
            // verify
            const ok = await verifyPin(inputPin);
            if(ok){
              inputPin = ''; updateDots(0);
              document.getElementById('lockTitle').textContent = 'Unlocked';
              document.getElementById('lockSubtitle').textContent = 'Welcome back';
              startAutoLockTimer(); // start inactivity locking
              if(typeof onUnlocked === 'function') onUnlocked();
            } else {
              showError('Incorrect PIN');
              inputPin = ''; updateDots(0);
            }
          }
        }, 220);
      }
    });
  });

  // backspace
  document.getElementById('key-back').addEventListener('click', ()=>{
    inputPin = inputPin.slice(0,-1); updateDots(inputPin.length);
  });

  // allow keyboard numeric input
  document.addEventListener('keydown', (e)=>{
    if(e.key >= '0' && e.key <= '9'){
      const k = document.querySelector(`[data-key="${e.key}"]`);
      if(k) k.click();
    }
    if(e.key === 'Backspace') document.getElementById('key-back').click();
  });

  // expose a global requirePin helper for other pages (use requirePin() to ask user to re-enter their pin)
  window.requirePin = createRequirePin();

  // start auto-lock timer when page is visible (if unlocked)
  startAutoLockTimer();
  attachActivityReset();
}

function createRequirePin(){
  // returns a function that opens the modal or redirects to pin screen and resolves when verified
  return async function requirePin({ prompt = 'Confirm PIN to continue' } = {}){
    return new Promise((resolve)=>{
      // Simple UX: open separate pin_lock.html as modal navigated route OR use inline modal.
      // We'll open a small popup window that returns result via postMessage (simpler than inline modal for generic pages).
      const w = window.open('/security/pin_lock.html?reauth=1', 'pin_reauth', 'width=420,height=620');
      if(!w){ alert('Please allow popups to re-authenticate'); resolve(false); return; }

      function listener(e){
        if(e.source !== w) return;
        if(!e.data || e.data.type !== 'pin-reauth-result') return;
        window.removeEventListener('message', listener);
        try { w.close(); } catch(e){}
        resolve(Boolean(e.data.ok));
      }
      window.addEventListener('message', listener);
    });
  };
}

// Auto-lock logic
function startAutoLockTimer(){
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(()=> {
    // lock the app: navigate to pin screen
    try {
      // navigate to lock screen (you may want a modal instead)
      location.href = '/security/pin_lock.html';
    } catch(e){}
  }, autoLockDelayMs);
}

function resetAutoLockTimer(){
  clearTimeout(autoLockTimer);
  startAutoLockTimer();
}

// activity listeners to reset timer
function attachActivityReset(){
  ['click','mousemove','keydown','touchstart'].forEach(ev=>{
    window.addEventListener(ev, resetAutoLockTimer, { passive:true });
  });
}

// For the reauth popup: detect query param and run inline verify (so reauth popup can postMessage result)
if(location.pathname.endsWith('/security/pin_lock.html') && new URLSearchParams(location.search).get('reauth') === '1'){
  (async ()=>{
    // init UI without redirect on success; on success postMessage { type:'pin-reauth-result', ok:true }
    // Wait for pin-lock init to be ready
    await new Promise(res => {
      const t = setInterval(()=>{ if(window.initPinLock) { clearInterval(t); res(); } }, 80);
      setTimeout(res, 1200);
    });
    // ensure onUnlocked posts result
    initPinLock({
      autoLockMinutes: parseInt(localStorage.getItem(AUTLOCK_KEY)||3,10),
      onUnlocked: ()=> {
        try { window.opener && window.opener.postMessage({ type:'pin-reauth-result', ok:true }, '*'); } catch(e){}
      }
    });
    // if user closes window or fails, user will just remain on popup
    // Note: the opener listens for message and resolves the requirePin promise
  })();
}

// small helper to allow programmatic PIN reset (you may want admin flow)
export async function resetPin(){
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SALT_KEY);
}
