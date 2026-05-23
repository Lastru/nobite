const DB_NAME = "nobite-db";
const DB_VERSION = 2;
const STORE_NAME = "daily_logs";

const FINGERS = [
  { id: "left_thumb", hand: "left", pos: "thumb" },
  { id: "left_index", hand: "left", pos: "index" },
  { id: "left_middle", hand: "left", pos: "middle" },
  { id: "left_ring", hand: "left", pos: "ring" },
  { id: "left_pinky", hand: "left", pos: "pinky" },
  { id: "right_thumb", hand: "right", pos: "thumb" },
  { id: "right_index", hand: "right", pos: "index" },
  { id: "right_middle", hand: "right", pos: "middle" },
  { id: "right_ring", hand: "right", pos: "ring" },
  { id: "right_pinky", hand: "right", pos: "pinky" }
];

const FINGER_LABELS = {
  left_thumb: "pollice sinistro", left_index: "indice sinistro", left_middle: "medio sinistro",
  left_ring: "anulare sinistro", left_pinky: "mignolo sinistro",
  right_thumb: "pollice destro", right_index: "indice destro", right_middle: "medio destro",
  right_ring: "anulare destro", right_pinky: "mignolo destro"
};
const els = {
  homeScreen: document.getElementById("homeScreen"),
  handsScreen: document.getElementById("handsScreen"),
  openHandsBtn: document.getElementById("openHandsBtn"),
  backHomeBtn: document.getElementById("backHomeBtn"),
  generalStreak: document.getElementById("generalStreak"),
  generalRecord: document.getElementById("generalRecord"),
  monthTitle: document.getElementById("monthTitle"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  calendarGrid: document.getElementById("calendarGrid"),
  handsStatsContainer: document.getElementById("handsStatsContainer"),
  dayModal: document.getElementById("dayModal"),
  modalDateTitle: document.getElementById("modalDateTitle"),
  modalHandsContainer: document.getElementById("modalHandsContainer"),
  submitDayBtn: document.getElementById("submitDayBtn"),
  resetDayBtn: document.getElementById("resetDayBtn")
};

let logsByDate = new Map();
let selectedDateKey = null;
let selectedFingers = new Set();

const now = new Date();
let visibleYear = now.getFullYear();
let visibleMonth = now.getMonth();

function toDateKey(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "date" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Errore apertura IndexedDB."));
  });
}

async function dbGetAll() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Errore lettura dati."));
  });
}

async function dbPut(log) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Errore salvataggio dati."));
  });
}

async function dbDelete(dateKey) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).delete(dateKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Errore cancellazione dati."));
  });
}

async function loadLogs() {
  const logs = await dbGetAll();
  logsByDate = new Map(logs.map(log => [log.date, normalizeLog(log)]));
}

function normalizeLog(log) {
  return {
    date: log.date,
    bittenFingers: Array.isArray(log.bittenFingers) ? log.bittenFingers : [],
    updatedAt: log.updatedAt || new Date().toISOString()
  };
}

function getSortedLogs() {
  return [...logsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getMostRecentLoggedDate() {
  const logs = getSortedLogs();
  return logs.length ? logs[logs.length - 1].date : null;
}

function getDayClass(dateKey) {
  const log = logsByDate.get(dateKey);
  if (!log) return "unknown";
  const count = log.bittenFingers.length;
  if (count === 0) return "clean";
  if (count === 1) return "one";
  return "many";
}

function getMonthGridDates(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  const firstDayMondayBased = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - firstDayMondayBased);
  const end = new Date(last);
  const lastDayMondayBased = (last.getDay() + 6) % 7;
  end.setDate(last.getDate() + (6 - lastDayMondayBased));
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function renderCalendar() {
  const titleDate = new Date(visibleYear, visibleMonth, 1);
  els.monthTitle.textContent = titleDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  els.calendarGrid.innerHTML = "";
  const dates = getMonthGridDates(visibleYear, visibleMonth);

  dates.forEach(date => {
    const dateKey = toDateKey(date);
    const isCurrentMonth = date.getMonth() === visibleMonth && date.getFullYear() === visibleYear;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.textContent = String(date.getDate());
    if (!isCurrentMonth) {
      cell.className = "day-cell out-month";
      cell.disabled = true;
    } else {
      cell.className = `day-cell ${getDayClass(dateKey)}`;
      cell.addEventListener("click", () => openDayModal(dateKey));
    }
    els.calendarGrid.appendChild(cell);
  });
}

function renderHomeStats() {
  const fingerStats = computeAllFingerStats();
  const currentValues = FINGERS.map(finger => fingerStats[finger.id].current);
  els.generalStreak.textContent = currentValues.length ? Math.min(...currentValues) : 0;
  els.generalRecord.textContent = computeGeneralRecord();
}

function renderHome() {
  renderHomeStats();
  renderCalendar();
}

function showHome() {
  els.handsScreen.classList.remove("active-screen");
  els.homeScreen.classList.add("active-screen");
  renderHome();
}

function showHands() {
  els.homeScreen.classList.remove("active-screen");
  els.handsScreen.classList.add("active-screen");
  renderHandsScreen();
}

function createHandPanel({ hand, mode, stats = {} }) {
  const handLabel = hand === "left" ? "Mano sinistra" : "Mano destra";
  const panel = document.createElement("section");
  panel.className = "hand-panel";
  const title = document.createElement("p");
  title.className = "hand-title";
  title.textContent = handLabel;
  const shape = document.createElement("div");
  shape.className = `hand-shape hand ${hand}`;
  const palm = document.createElement("div");
  palm.className = "palm";
  shape.appendChild(palm);

  FINGERS.filter(finger => finger.hand === hand).forEach(finger => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `finger ${finger.pos}`;

    if (mode === "select") {
      button.classList.add("selectable");
      if (selectedFingers.has(finger.id)) button.classList.add("active");
      button.setAttribute("aria-label", FINGER_LABELS[finger.id]);
      button.addEventListener("click", () => {
        selectedFingers.has(finger.id) ? selectedFingers.delete(finger.id) : selectedFingers.add(finger.id);
        renderModalHands();
      });
    }

    if (mode === "stats") {
      const fingerStat = stats[finger.id] || { current: 0, record: 0 };
      button.classList.add("stat-finger");
      button.disabled = true;
      button.setAttribute("aria-label", `${FINGER_LABELS[finger.id]} streak ${fingerStat.current}, record ${fingerStat.record}`);
      button.innerHTML = `<span>S</span><span class="metric">${fingerStat.current}</span><span>R ${fingerStat.record}</span>`;
    }

    shape.appendChild(button);
  });

  panel.appendChild(title);
  panel.appendChild(shape);
  return panel;
}

function renderModalHands() {
  els.modalHandsContainer.innerHTML = "";
  els.modalHandsContainer.appendChild(createHandPanel({ hand: "left", mode: "select" }));
  els.modalHandsContainer.appendChild(createHandPanel({ hand: "right", mode: "select" }));
}

function openDayModal(dateKey) {
  selectedDateKey = dateKey;
  const existingLog = logsByDate.get(dateKey);
  selectedFingers = new Set(existingLog?.bittenFingers || []);
  els.modalDateTitle.textContent = fromDateKey(dateKey).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  renderModalHands();
  els.dayModal.classList.remove("hidden");
}

function closeDayModal() {
  els.dayModal.classList.add("hidden");
  selectedDateKey = null;
  selectedFingers.clear();
}

async function submitDay() {
  if (!selectedDateKey) return;
  await dbPut({ date: selectedDateKey, bittenFingers: [...selectedFingers], updatedAt: new Date().toISOString() });
  await loadLogs();
  closeDayModal();
  renderHome();
}

async function resetDay() {
  if (!selectedDateKey) return;
  await dbDelete(selectedDateKey);
  await loadLogs();
  closeDayModal();
  renderHome();
}

function computeCurrentFingerStreak(fingerId) {
  const endDate = getMostRecentLoggedDate();
  if (!endDate) return 0;
  let current = endDate;
  let streak = 0;
  while (true) {
    const log = logsByDate.get(current);
    if (!log) break;
    if (log.bittenFingers.includes(fingerId)) break;
    streak++;
    current = addDays(current, -1);
  }
  return streak;
}

function computeFingerRecord(fingerId) {
  const logs = getSortedLogs();
  if (!logs.length) return 0;
  let record = 0;
  let current = 0;
  let previousDate = null;
  logs.forEach(log => {
    const consecutive = previousDate ? addDays(previousDate, 1) === log.date : true;
    if (!consecutive) current = 0;
    if (log.bittenFingers.includes(fingerId)) current = 0;
    else {
      current++;
      record = Math.max(record, current);
    }
    previousDate = log.date;
  });
  return record;
}

function computeAllFingerStats() {
  const result = {};
  FINGERS.forEach(finger => {
    result[finger.id] = { current: computeCurrentFingerStreak(finger.id), record: computeFingerRecord(finger.id) };
  });
  return result;
}

function computeGeneralRecord() {
  const logs = getSortedLogs();
  if (!logs.length) return 0;
  let record = 0;
  let current = 0;
  let previousDate = null;
  logs.forEach(log => {
    const consecutive = previousDate ? addDays(previousDate, 1) === log.date : true;
    if (!consecutive) current = 0;
    if (log.bittenFingers.length === 0) {
      current++;
      record = Math.max(record, current);
    } else current = 0;
    previousDate = log.date;
  });
  return record;
}

function renderHandsScreen() {
  const stats = computeAllFingerStats();
  els.handsStatsContainer.innerHTML = "";
  els.handsStatsContainer.appendChild(createHandPanel({ hand: "left", mode: "stats", stats }));
  els.handsStatsContainer.appendChild(createHandPanel({ hand: "right", mode: "stats", stats }));
}

function goToPreviousMonth() {
  visibleMonth--;
  if (visibleMonth < 0) { visibleMonth = 11; visibleYear--; }
  renderCalendar();
}

function goToNextMonth() {
  visibleMonth++;
  if (visibleMonth > 11) { visibleMonth = 0; visibleYear++; }
  renderCalendar();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try { await navigator.serviceWorker.register("./service-worker.js"); }
  catch (error) { console.warn("Service worker non registrato:", error); }
}

async function start() {
  await loadLogs();
  renderHome();
  await registerServiceWorker();
}

els.prevMonthBtn.addEventListener("click", goToPreviousMonth);
els.nextMonthBtn.addEventListener("click", goToNextMonth);
els.openHandsBtn.addEventListener("click", showHands);
els.backHomeBtn.addEventListener("click", showHome);
els.submitDayBtn.addEventListener("click", submitDay);
els.resetDayBtn.addEventListener("click", resetDay);

start().catch(error => {
  console.error(error);
  alert("Errore avvio NoBite: " + error.message);
});
