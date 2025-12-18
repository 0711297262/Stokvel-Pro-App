// js/presence.js
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

let presenceDocRef = null;

export async function startPresence(gid){
  if(!window.currentUser) return;
  const uid = window.currentUser.uid;
  presenceDocRef = doc(db, "groups", gid, "presence", uid);
  try {
    await setDoc(presenceDocRef, {
      uid,
      lastSeen: serverTimestamp(),
      displayName: window.currentUser.displayName || window.currentUser.phoneNumber || uid
    });
    // remove when leaving
    const remove = async ()=> {
      try { await deleteDoc(presenceDocRef); } catch(e) {}
    };
    window.addEventListener('beforeunload', remove);
    window.addEventListener('pagehide', remove);
  } catch(e){
    console.error("presence error", e);
  }
}

export async function stopPresence(){
  if(!presenceDocRef) return;
  try { await deleteDoc(presenceDocRef); } catch(e){/*ignore*/ }
}
