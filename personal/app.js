/* app.js — Stronger (ES Module) */
// --- Added by fixer: startup logging and global error overlay ---
console.log('app.js loaded — fixer v1');
(function(){
  function showFatal(msg){
    try {
      var root = document.getElementById('modal-root') || document.body;
      var overlay = document.createElement('div');
      overlay.id = 'fatal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = 0; overlay.style.top = 0; overlay.style.right = 0; overlay.style.bottom = 0;
      overlay.style.background = 'rgba(0,0,0,0.75)';
      overlay.style.zIndex = 99999;
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      var card = document.createElement('div');
      card.style.background = '#111827';
      card.style.color = '#e6eef8';
      card.style.padding = '16px';
      card.style.borderRadius = '10px';
      card.style.maxWidth = '720px';
      card.style.width = '90%';
      card.innerHTML = '<div style="font-weight:700;margin-bottom:8px">Application error</div><div id="fatal-msg" style="white-space:pre-wrap;margin-bottom:12px"></div><div style="text-align:right"><button id="err-close" style="padding:8px;border-radius:8px;border:0;background:#60a5fa;color:#fff">Close</button></div>';
      overlay.appendChild(card);
      root.appendChild(overlay);
      document.getElementById('fatal-msg').textContent = msg;
      document.getElementById('err-close').addEventListener('click', function(){ overlay.remove(); });
    } catch(e){ console.error('failed to show fatal overlay', e); }
  }
  window.addEventListener('error', function(ev){ try{ console.error('window error', ev.error || ev.message); showFatal(String(ev.error || ev.message)); } catch(e){ console.error(e); }});
  window.addEventListener('unhandledrejection', function(ev){ try{ console.error('unhandled rejection', ev.reason); showFatal(String(ev.reason)); } catch(e){ console.error(e); }});
})();
/* --------------------------
   Firebase config - replace
   --------------------------
   Paste your Firebase config object here (client config). This is expected in client JS.
   Example:
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
*/
const firebaseConfig = {
  apiKey: "AIzaSyBceOFjCe6XJqp1WRKzFEH2z0aHTJ_mg7s",
  authDomain: "checklist-c3873.firebaseapp.com",
  projectId: "checklist-c3873",
  storageBucket: "checklist-c3873.firebasestorage.app",
  messagingSenderId: "793789089385",
  appId: "1:793789089385:web:82759a616273a2acc144f8"
};
/* --------------------------
   Imports (Firebase modular SDK)
   -------------------------- */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, addDoc, setDoc, doc, query, orderBy, limit, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

/* --------------------------
   Basic helpers
   -------------------------- */
const $ = (s, r=document) => r.querySelector(s);
const $all = (s, r=document) => Array.from((r||document).querySelectorAll(s));
const escapeHTML = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isPositiveNumber = v => !isNaN(v) && Number(v) >= 0;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const showToast = (msg) => console.log('TOAST:', msg); // replace with a better UI if needed

/* --------------------------
   App state
   -------------------------- */
let firebaseApp = null, auth = null, db = null;
let uid = null;
let pageSize = 25; // pagination
let historyOffset = 0;

/* --------------------------
   UI refs
   -------------------------- */
const authScreen = $('#auth-screen');
const appScreen = $('#app-screen');
const authMessage = $('#auth-message');
const btnSignin = $('#btn-signin');
const btnRegister = $('#btn-register');
const btnReset = $('#btn-reset');
const btnSignout = $('#signout');
const authButtons = $('#auth-buttons');

const startLiveBtn = $('#start-live');
const addPastBtn = $('#add-past');
const daySplitEl = $('#day-split');
const variationEl = $('#variation');

const historyList = $('#history-list');
const loadMoreBtn = $('#load-more');
const searchEx = $('#search-ex');

const liveWorkoutEl = $('#live-workout');
const exercisesContainer = $('#exercises-container');
const finishBtn = $('#finish');
const cancelBtn = $('#cancel');
const addExBtn = $('#add-ex-btn');
const saveNowBtn = $('#save-now');

const chartEl = document.getElementById('chart');
const chartSelect = $('#chart-ex');
const recentMaxesEl = $('#recent-maxes');

const templateListEl = $('#template-list');
const createTemplateBtn = $('#create-template');

let liveWorkout = null;
let timerInterval = null;
let chart = null;

/* --------------------------
   Initialization
   -------------------------- */
function init() {
  attachEventHandlers();
  setOnlineIndicator();
  window.addEventListener('online', setOnlineIndicator);
  window.addEventListener('offline', setOnlineIndicator);
  window.addEventListener('unhandledrejection', e => { console.error('Unhandled rejection', e.reason); showToast('Unexpected error'); });

  if (firebaseConfig) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp);
      onAuthStateChanged(auth, user => {
        if (user) {
          uid = user.uid;
          showApp();
        } else {
          showAuth();
        }
      });
    } catch (err) {
      console.error('Firebase init error', err);
      showToast('Firebase init failed — check console.');
      showAuth();
    }
  } else {
    // Local-only mode
    showAuth();
  }

  // Setup chart
  chart = new Chart(chartEl.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Weight', data: [] }, { label: 'Reps', data: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/* --------------------------
   Online indicator
   -------------------------- */
function setOnlineIndicator(){
  const el = $('#online-indicator');
  if (navigator.onLine) { el.className = 'online'; el.textContent = 'Online'; }
  else { el.className = 'offline'; el.textContent = 'Offline'; }
}

/* --------------------------
   Auth flows
   -------------------------- */
btnRegister.addEventListener('click', async () => {
  const email = $('#email').value.trim();
  const pw = $('#password').value;
  if (!email || !pw) return authMessage.textContent = 'Enter email and password';
  try {
    if (!auth) throw new Error('Firebase not configured');
    await createUserWithEmailAndPassword(auth, email, pw);
    authMessage.textContent = 'Registered and signed in';
  } catch (err) {
    console.error(err);
    authMessage.textContent = err.message || 'Registration failed';
  }
});

btnSignin.addEventListener('click', async () => {
  const email = $('#email').value.trim();
  const pw = $('#password').value;
  if (!email || !pw) return authMessage.textContent = 'Enter email and password';
  try {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, pw);
    authMessage.textContent = '';
  } catch (err) {
    console.error(err);
    authMessage.textContent = err.message || 'Sign-in failed';
  }
});

btnReset.addEventListener('click', async () => {
  const email = $('#email').value.trim();
  if (!email) return authMessage.textContent = 'Enter email to reset';
  try {
    if (!auth) throw new Error('Firebase not configured');
    await sendPasswordResetEmail(auth, email);
    authMessage.textContent = 'Reset email sent';
  } catch (err) {
    console.error(err);
    authMessage.textContent = err.message || 'Reset failed';
  }
});

btnSignout.addEventListener('click', async ()=> {
  if (!auth) return showAuth();
  await signOut(auth);
  uid = null;
  showAuth();
});

/* --------------------------
   UI control helpers
   -------------------------- */
function showAuth(){ authScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
function showApp(){ authScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); loadInitialData(); }

/* --------------------------
   Data validation + sanitation
   -------------------------- */
function validateWorkoutPayload(workout) {
  if (!workout || !Array.isArray(workout.exercises) || workout.exercises.length === 0) throw new Error('Workout must contain exercises');
  for (const ex of workout.exercises) {
    if (!ex.name || typeof ex.name !== 'string' || ex.name.trim().length < 2) throw new Error('Bad exercise name');
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) throw new Error('Exercise must have sets');
    for (const s of ex.sets) {
      const weight = parseFloat(s.weight || 0);
      const reps = parseInt(s.reps || 0, 10);
      if (!isFinite(weight) || weight < 0 || weight > 1000) throw new Error('Invalid weight');
      if (!isFinite(reps) || reps < 0 || reps > 1000) throw new Error('Invalid reps');
    }
  }
}

/* --------------------------
   Persistence: Firestore paths & local fallback
   -------------------------- */
function userWorkoutsCollection() {
  if (!db || !uid) return null;
  return collection(db, `users/${uid}/workouts`);
}

/* Save workout (Firestore if configured, else localStorage) */
async function saveWorkout(workout) {
  try {
    validateWorkoutPayload(workout);
  } catch (err) { throw err; }

  if (db && uid) {
    const ref = await addDoc(userWorkoutsCollection(), workout);
    return ref.id;
  } else {
    // local fallback
    const data = JSON.parse(localStorage.getItem('local_workouts') || '[]');
    const id = 'local-' + Date.now();
    data.unshift({ id, ...workout, createdAt: new Date().toISOString() });
    localStorage.setItem('local_workouts', JSON.stringify(data));
    return id;
  }
}

/* Load history (paginated) */
async function loadHistory(reset = false) {
  if (reset) historyOffset = 0;
  historyList.innerHTML = 'Loading...';
  try {
    let docs = [];
    if (db && uid) {
      // Firestore: get last pageSize ordered by createdAt
      const q = query(userWorkoutsCollection(), orderBy('startTime','desc'), limit(pageSize + historyOffset));
      const snap = await getDocs(q);
      docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const local = JSON.parse(localStorage.getItem('local_workouts') || '[]');
      docs = local.slice(historyOffset, historyOffset + pageSize);
    }
    renderHistory(docs);
  } catch (err) {
    console.error(err);
    showToast('Failed to load history');
    historyList.innerHTML = '<div class="muted small">Failed to load</div>';
  }
}

/* Render history items with safe rendering */
function renderHistory(items) {
  historyList.innerHTML = '';
  if (!items || items.length === 0) {
    historyList.innerHTML = '<div class="muted small">No workouts yet</div>';
    return;
  }
  for (const w of items) {
    const d = new Date(w.startTime || w.createdAt || Date.now());
    const node = document.createElement('div');
    node.className = 'card';
    const exPreview = (w.exercises || []).slice(0,3).map(e => escapeHTML(e.name)).join(', ');
    node.innerHTML = `<div class="row space-between"><div><strong>${d.toLocaleDateString()}</strong><div class="muted small">${escapeHTML(w.daySplit||'—')} · ${escapeHTML(w.variation||'—')}</div></div><div class="muted small">${(w.duration) ? Math.floor(w.duration/60) + 'm' : ''}</div></div><div class="muted small mt-sm">${exPreview}</div>`;
    node.addEventListener('click', () => openWorkoutDetail(w));
    historyList.appendChild(node);
  }
}

/* Open workout detail (simple modal) */
function openWorkoutDetail(workout) {
  // Minimal inline modal - create DOM in modal-root
  const modalRoot = $('#modal-root');
  modalRoot.innerHTML = '';
  const modal = document.createElement('div');
  modal.className = 'card';
  modal.style.position = 'fixed';
  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%,-50%)';
  modal.style.zIndex = 999;
  modal.innerHTML = `<div class="row space-between"><strong>Workout</strong><button class="btn ghost close">Close</button></div><div class="mt-sm"></div>`;
  const body = modal.querySelector('div.mt-sm');
  body.innerHTML = `<div><strong>${new Date(workout.startTime||workout.createdAt).toLocaleString()}</strong></div><div class="mt-sm"></div>`;
  const exList = body.querySelector('div.mt-sm');
  for (const e of (workout.exercises||[])) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<strong>${escapeHTML(e.name)}</strong><div class="muted small">${(e.sets||[]).map(s=>`${escapeHTML(String(s.reps))} × ${escapeHTML(String(s.weight))}kg`).join(' · ')}</div>`;
    exList.appendChild(el);
  }
  modal.querySelector('.close').addEventListener('click', ()=> modalRoot.innerHTML = '');
  modalRoot.appendChild(modal);
}

/* --------------------------
   Live workout UI and actions
   -------------------------- */
function startLiveSession() {
  liveWorkout = { startTime: new Date().toISOString(), exercises: [], daySplit: daySplitEl.value, variation: variationEl.value };
  liveWorkoutEl.classList.remove('hidden');
  renderLiveWorkout();
  switchTo('live');
  startTimer();
}

function renderLiveWorkout() {
  exercisesContainer.innerHTML = '';
  if (!liveWorkout) return;
  for (let i=0;i<liveWorkout.exercises.length;i++){
    const ex = liveWorkout.exercises[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="row space-between"><strong>${escapeHTML(ex.name)}</strong><button class="btn ghost remove">Remove</button></div><div class="stack mt-sm"></div><div class="row gap mt-sm"><button class="btn ghost add-set">+ Set</button></div>`;
    const setsEl = card.querySelector('.stack');
    ex.sets.forEach((s, idx)=> {
      const sRow = document.createElement('div');
      sRow.className = 'row gap';
      sRow.innerHTML = `<input class="input small" data-ex="${i}" data-set="${idx}" placeholder="Reps" value="${s.reps}"><input class="input small" data-ex="${i}" data-set="${idx}" placeholder="kg" value="${s.weight}"><button class="btn ghost remove-set">×</button>`;
      setsEl.appendChild(sRow);
    });
    // handlers
    card.querySelector('.remove').addEventListener('click', ()=>{ if(confirm('Remove exercise?')){ liveWorkout.exercises.splice(i,1); renderLiveWorkout(); }});
    card.querySelector('.add-set').addEventListener('click', ()=>{ ex.sets.push({ reps:'', weight:'' }); renderLiveWorkout(); });
    exercisesContainer.appendChild(card);
  }
  // footer add exercise button shows prompt
}

/* small switch helper */
function switchTo(which) {
  if (which === 'live') {
    liveWorkoutEl.classList.remove('hidden');
    $('#history').classList.add('hidden');
    $('#progress').classList.add('hidden');
    $('#templates').classList.add('hidden');
  } else {
    liveWorkoutEl.classList.add('hidden');
    $('#history').classList.remove('hidden');
    $('#progress').classList.remove('hidden');
    $('#templates').classList.remove('hidden');
  }
}

/* simple timer */
function startTimer(){
  const tEl = $('#timer');
  let start = Date.now();
  timerInterval = setInterval(()=> {
    const diff = Math.floor((Date.now() - start)/1000);
    tEl.textContent = Math.floor(diff/60).toString().padStart(2,'0') + ':' + (diff%60).toString().padStart(2,'0');
    liveWorkout.duration = diff;
  }, 1000);
}
function stopTimer(){ clearInterval(timerInterval); timerInterval = null; }

/* Add exercise to live workout (quick prompt) */
addExBtn.addEventListener('click', ()=> {
  const name = prompt('Exercise name (e.g. Bench Press)');
  if (!name) return;
  liveWorkout.exercises.push({ name: name.trim(), sets: [{ reps:'', weight:'' }] });
  renderLiveWorkout();
});

/* remove / finish actions */
finishBtn.addEventListener('click', async ()=> {
  if (!liveWorkout || !liveWorkout.exercises.length) return alert('Add at least one exercise');
  try {
    // sanitize and validate
    validateWorkoutPayload(liveWorkout);
    // persist
    await saveWorkout(liveWorkout);
    stopTimer();
    liveWorkout = null;
    alert('Saved');
    switchTo('history');
    loadInitialData();
  } catch (err) {
    console.error(err); alert(err.message || 'Save failed');
  }
});
cancelBtn.addEventListener('click', ()=> {
  if (confirm('Cancel workout?')) { stopTimer(); liveWorkout = null; switchTo('history'); }
});

/* --------------------------
   Load initial data, templates, chart population
   -------------------------- */
async function loadInitialData(){
  await loadHistory(true);
  // if Firestore is configured, we could set a real-time listener here; for simplicity we reload
  populateChartSelect();
  renderTemplates();
}

/* Populate chart exercise dropdown */
function populateChartSelect(){
  const names = new Set();
  const sources = db && uid ? [] : JSON.parse(localStorage.getItem('local_workouts')||'[]');
  // combine loaded workouts
  // quick approach: read displayed history nodes to extract names
  const items = $all('#history-list .card');
  // fallback: use local storage
  const local = JSON.parse(localStorage.getItem('local_workouts')||'[]');
  local.forEach(w => (w.exercises||[]).forEach(e=>names.add(e.name)));
  chartSelect.innerHTML = '<option value="">Select exercise</option>' + [...names].map(n => `<option>${escapeHTML(n)}</option>`).join('');
}

/* templates rendering (local-only simple) */
function renderTemplates(){
  const tpl = JSON.parse(localStorage.getItem('local_templates')||'[]');
  templateListEl.innerHTML = '';
  tpl.forEach(t => {
    const node = document.createElement('div');
    node.className = 'card';
    node.innerHTML = `<div class="row space-between"><div><strong>${escapeHTML(t.name)}</strong><div class="muted small">${(t.exercises||[]).join(', ')}</div></div><div class="row gap"><button class="btn ghost">Start</button><button class="btn ghost">Edit</button></div></div>`;
    templateListEl.appendChild(node);
  });
}

/* --------------------------
   Event handlers & bindings
   -------------------------- */
function attachEventHandlers(){
  startLiveBtn.addEventListener('click', startLiveSession);
  addPastBtn.addEventListener('click', ()=> alert('Use "Add Past" modal (TBD)'));
  loadMoreBtn.addEventListener('click', ()=> loadHistory(false));
  searchEx.addEventListener('input', ()=> {
    // naive client-side filter: reload history and filter displayed nodes
    const q = searchEx.value.trim().toLowerCase();
    if (!q) { loadHistory(true); return; }
    const local = JSON.parse(localStorage.getItem('local_workouts')||'[]');
    const filtered = local.filter(w => (w.exercises||[]).some(e=> e.name.toLowerCase().includes(q)));
    renderHistory(filtered);
  });
}

/* --------------------------
   Service worker registration (PWA offline cache)
   -------------------------- */
if ('serviceWorker' in navigator) {
  try { navigator.serviceWorker.register('./sw.js'); console.log('sw registered'); } catch (err) { console.warn('sw failed', err); }
}

/* --------------------------
   Startup
   -------------------------- */
try{ init(); } catch(e){ console.error("init failed", e); throw e; }
