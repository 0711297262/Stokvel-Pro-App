// js/pwa-install.js
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // show your custom install button if present
  const installBtn = document.getElementById('installAppBtn');
  if(installBtn) installBtn.style.display = 'inline-block';
});

export async function promptInstall(){
  if(!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return (choice.outcome === 'accepted');
}
<button id="installAppBtn" style="display:none" onclick="import('/js/pwa-install.js').then(m=>m.promptInstall())">Install App</button>
