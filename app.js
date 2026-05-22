const DB_NAME = "nobite-db";
const DB_VERSION = 1;
const STORE_NAME = "app_data";
const COUNTER_KEY = "counter";

const counterElement = document.getElementById("counter");
const statusElement = document.getElementById("status");
const plusButton = document.getElementById("plus");
const resetButton = document.getElementById("reset");

function setStatus(message) {
  statusElement.textContent = message;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB non disponibile in questo browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Errore apertura database."));
  });
}

async function dbGet(key, fallbackValue) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ?? fallbackValue);
    request.onerror = () => reject(request.error || new Error("Errore lettura database."));
  });
}

async function dbSet(key, value) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Errore scrittura database."));
  });
}

async function readCounter() {
  const value = Number(await dbGet(COUNTER_KEY, 0));
  counterElement.textContent = String(value);
  return value;
}

async function writeCounter(value) {
  await dbSet(COUNTER_KEY, Number(value));
  counterElement.textContent = String(value);
}

plusButton.addEventListener("click", async () => {
  try {
    const currentValue = await readCounter();
    await writeCounter(currentValue + 1);
    setStatus("Salvato in IndexedDB ✅");
  } catch (error) {
    console.error(error);
    setStatus("Errore salvataggio: " + error.message);
  }
});

resetButton.addEventListener("click", async () => {
  try {
    await writeCounter(0);
    setStatus("Contatore azzerato ✅");
  } catch (error) {
    console.error(error);
    setStatus("Errore reset: " + error.message);
  }
});

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setStatus("Service worker non supportato su questo browser.");
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
    setStatus("App pronta: IndexedDB + modalità installabile ✅");
  } catch (error) {
    console.warn(error);
    setStatus("Database ok, ma service worker non registrato.");
  }
}

async function startApp() {
  try {
    await readCounter();
    setStatus("Database locale pronto.");
    await registerServiceWorker();
  } catch (error) {
    console.error(error);
    setStatus("Errore: apri l'app dal link GitHub Pages HTTPS.");
  }
}

startApp();
