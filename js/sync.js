// Liga a página ao Firebase: login com Google e banco Firestore.
// Os dados ficam em trips/<TRIP_ID>/<coleção>/<documento>.
// Coleções usadas pela página: checks, calendar, hotels, hotelCustom.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, TRIP_ID } from "./firebase-config.js";

const syncEl = document.getElementById("sync");
const authBtn = document.getElementById("authbtn");
const say = (text) => { if (syncEl) syncEl.textContent = text; };

// Entrega o banco para a página (o script principal espera por isso).
function handOver(adapter) {
  if (typeof window.__setTripDB === "function") window.__setTripDB(adapter);
  else window.__pendingTripDB = adapter;
}

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("COLE")) {
  say("Falta configurar o Firebase: veja o passo 4 do README.");
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Cache local: a página continua funcionando sem internet e envia as mudanças quando a conexão volta.
  let fs;
  try {
    fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    fs = initializeFirestore(app, {});
  }

  const base = ["trips", TRIP_ID];
  const adapter = {
    collection(name) {
      const colRef = collection(fs, ...base, name);
      return {
        doc(id) {
          const ref = doc(fs, ...base, name, id);
          return {
            set: (data) => setDoc(ref, data),
            delete: () => deleteDoc(ref)
          };
        },
        onSnapshot(next, onError) {
          return onSnapshot(colRef, (qs) => next({ docs: qs.docs }), onError);
        }
      };
    }
  };

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  getRedirectResult(auth).catch(() => {});

  let handed = false;
  onAuthStateChanged(auth, (user) => {
    authBtn.hidden = false;
    if (user) {
      authBtn.textContent = "Sair";
      authBtn.title = user.email || "";
      say(`Sincronizado com o casal · ${user.email || ""}`);
      window.__tripUser = { email: user.email || "", name: (user.displayName || user.email || "").split(" ")[0] };
      if (!handed) { handed = true; handOver(adapter); }
    } else {
      authBtn.textContent = "Entrar com Google";
      authBtn.title = "";
      say("Entrem com a conta Google para ver e salvar as marcações do casal.");
    }
  });

  authBtn.addEventListener("click", async () => {
    if (auth.currentUser) {
      await signOut(auth);
      location.reload();
      return;
    }
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = err && err.code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
      } else if (code === "auth/unauthorized-domain") {
        say("Este endereço não está autorizado no Firebase: veja o passo 3 do README.");
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        say("Não foi possível entrar. Tentem de novo.");
      }
    }
  });
}
