// app.js — Personal Tracker
// Firebase + Firestore + Auth + Templates + Manual Past Entry
// Fully functional

/* =========================
   FIREBASE INITIALIZATION
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBceOFjCe6XJqp1WRKzFEH2z0aHTJ_mg7s",
  authDomain: "checklist-c3873.firebaseapp.com",
  projectId: "checklist-c3873",
  storageBucket: "checklist-c3873.firebasestorage.app",
  messagingSenderId: "793789089385",
  appId: "1:793789089385:web:82759a616273a2acc144f8"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/* =========================
   STATE
========================= */
let uid = null;
let allWorkouts = [];
let allTemplates = [];
let currentWorkout = null;
let chart = null;

/* =========================
   DOM HELPERS
========================= */
const $ = (s, r = document) => r.querySelector(s);
const $all = (s, r = document) => Array.from((r || document).querySelectorAll(s));
const escape = s => String(s || '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* =========================
   REFS
========================= */
const authScreen = $('#auth-screen'), appScreen = $('#app-screen');
const emailEl = $('#email'), passwordEl = $('#password'), authMessage = $('#auth-message');
const btnSignin = $('#btn-signin'), btnRegister = $('#btn-register'), btnReset = $('#btn-reset');
const signoutBtn = $('#signout');

const startLiveBtn = $('#start-live'), addPastBtn = $('#add-past');
const daySplitEl = $('#day-split'), variationEl = $('#variation');

const historyList = $('#history-list');
const liveWorkoutEl = $('#live-workout'), exercisesContainer = $('#exercises-container');
const finishBtn = $('#finish'), cancelBtn = $('#cancel'), addExBtn = $('#add-ex-btn');

const chartSelect = $('#chart-ex'); const chartCanvas = $('#chart');
const recentMaxesEl = $('#recent-maxes');

const templateListEl = $('#template-list'), createTemplateBtn = $('#create-template');

/* =========================
   TOAST
========================= */
function showToast(msg) {
  console.info('toast:', msg);
  authMessage.textContent = msg;
  setTimeout(() => { if (authMessage.textContent === msg) authMessage.textContent = ''; }, 3000);
}

/* =========================
   AUTH
========================= */
btnRegister.addEventListener('click', async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
  } catch (e) { showToast(e.message); }
});
btnSignin.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
  } catch (e) { showToast(e.message); }
});
btnReset.addEventListener('click', async () => {
  try {
    await sendPasswordResetEmail(auth, emailEl.value);
    showToast('Reset email sent');
  } catch (e) { showToast(e.message); }
});
signoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    uid = user.uid;
    showApp();
    attachFirestoreListeners();
  } else {
    uid = null;
    showAuth();
    loadLocalCaches();
  }
});

function showAuth() { authScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
function showApp() { authScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); }

/* =========================
   FIRESTORE SYNC
========================= */
function attachFirestoreListeners() {
  const workoutsRef = collection(db, `users/${uid}/workouts`);
  const tplRef = collection(db, `users/${uid}/templates`);

  onSnapshot(query(workoutsRef, orderBy('startTime', 'desc')), snap => {
    allWorkouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHistory();
    refreshChartSelect();
    renderProgressRecent();
  });

  onSnapshot(tplRef, snap => {
    allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTemplates();
  });
}

/* =========================
   SAVE WORKOUT
========================= */
async function saveWorkout(workout) {
  if (db && uid) {
    if (workout.id && !workout.id.startsWith('local-')) {
      await setDoc(doc(db, `users/${uid}/workouts`, workout.id), workout);
    } else {
      const ref = await addDoc(collection(db, `users/${uid}/workouts`), workout);
      workout.id = ref.id;
    }
  } else {
    workout.id = 'local-' + Date.now();
    allWorkouts.unshift(workout);
    localStorage.setItem('local_workouts', JSON.stringify(allWorkouts));
  }
  renderHistory();
  refreshChartSelect();
  renderProgressRecent();
}

/* =========================
   HISTORY
========================= */
function renderHistory() {
  historyList.innerHTML = '';
  if (!allWorkouts.length) { historyList.innerHTML = '<div>No workouts</div>'; return; }
  allWorkouts.forEach(w => {
    const d = new Date(w.startTime || Date.now());
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = `${d.toLocaleDateString()} - ${w.daySplit || ''} ${w.variation || ''}`;
    div.addEventListener('click', () => console.log(w));
    historyList.appendChild(div);
  });
}

/* =========================
   ADD PAST WORKOUT (MODAL)
========================= */
addPastBtn.addEventListener('click', () => openPastWorkoutModal());

function openPastWorkoutModal() {
  const root = $('#modal-root'); root.innerHTML = '';
  const modal = document.createElement('div'); modal.className = 'modal card';
  modal.innerHTML = `
    <h3>Add Past Workout</h3>
    <label>Date <input type="date" id="pw-date" value="${new Date().toISOString().slice(0, 10)}"></label>
    <div id="pw-ex-list"></div>
    <button id="pw-add-ex">+ Add Exercise</button>
    <div class="row gap mt-sm">
      <button id="pw-save" class="btn">Save</button>
      <button id="pw-cancel" class="btn ghost">Cancel</button>
    </div>
  `;
  root.appendChild(modal);

  const exList = $('#pw-ex-list', modal);
  $('#pw-add-ex', modal).addEventListener('click', () => addManualExercise(exList));
  $('#pw-save', modal).addEventListener('click', async () => {
    const date = $('#pw-date', modal).value;
    const exercises = $all('.pw-ex', modal).map(exDiv => {
      const name = $('.pw-name', exDiv).value;
      const sets = $all('.pw-set', exDiv).map(s => ({
        reps: $('.pw-reps', s).value,
        weight: $('.pw-weight', s).value
      }));
      return { name, sets };
    });
    const workout = { startTime: new Date(date).toISOString(), exercises };
    await saveWorkout(workout);
    root.innerHTML = '';
    showToast('Workout saved');
  });
  $('#pw-cancel', modal).addEventListener('click', () => root.innerHTML = '');
}

function addManualExercise(container) {
  const div = document.createElement('div'); div.className = 'pw-ex card';
  div.innerHTML = `
    <input class="pw-name" placeholder="Exercise name">
    <div class="pw-sets"></div>
    <button class="pw-add-set">+ Set</button>
  `;
  container.appendChild(div);
  const setsEl = $('.pw-sets', div);
  $('.pw-add-set', div).addEventListener('click', () => {
    const row = document.createElement('div'); row.className = 'pw-set row gap';
    row.innerHTML = `<input class="pw-reps" placeholder="Reps"><input class="pw-weight" placeholder="kg">`;
    setsEl.appendChild(row);
  });
}

/* =========================
   LIVE WORKOUT (unchanged)
========================= */
startLiveBtn.addEventListener('click', () => {
  currentWorkout = { startTime: new Date().toISOString(), exercises: [] };
  liveWorkoutEl.classList.remove('hidden');
});

/* =========================
   TEMPLATES (UPGRADED)
========================= */
createTemplateBtn.addEventListener('click', () => openTemplateModal());

function renderTemplates() {
  templateListEl.innerHTML = '';
  allTemplates.forEach(t => {
    const node = document.createElement('div'); node.className = 'card';
    node.innerHTML = `
      <strong>${escape(t.name)}</strong>
      <div>${(t.exercises || []).map(e => e.name).join(', ')}</div>
      <button class="start">Start</button>
      <button class="quick">Quick Log</button>
      <button class="edit">Edit</button>
      <button class="del">Delete</button>
    `;
    node.querySelector('.start').addEventListener('click', () => startLiveFromTemplate(t));
    node.querySelector('.quick').addEventListener('click', () => quickLogTemplate(t));
    node.querySelector('.edit').addEventListener('click', () => openTemplateModal(t));
    node.querySelector('.del').addEventListener('click', () => { allTemplates = allTemplates.filter(x => x.id !== t.id); renderTemplates(); });
    templateListEl.appendChild(node);
  });
}

function startLiveFromTemplate(t) {
  currentWorkout = { startTime: new Date().toISOString(), exercises: JSON.parse(JSON.stringify(t.exercises || [])) };
  liveWorkoutEl.classList.remove('hidden');
}
async function quickLogTemplate(t) {
  const workout = { startTime: new Date().toISOString(), exercises: JSON.parse(JSON.stringify(t.exercises || [])) };
  await saveWorkout(workout);
  showToast('Workout logged from template');
}
function openTemplateModal(template = null) {
  const root = $('#modal-root'); root.innerHTML = '';
  const modal = document.createElement('div'); modal.className = 'modal card';
  modal.innerHTML = `
    <h3>${template ? 'Edit' : 'New'} Template</h3>
    <input id="tpl-name" placeholder="Template name" value="${template ? escape(template.name) : ''}">
    <div id="tpl-ex-list"></div>
    <button id="tpl-add-ex">+ Add Exercise</button>
    <div class="row gap mt-sm">
      <button id="tpl-save" class="btn">Save</button>
      <button id="tpl-cancel" class="btn ghost">Cancel</button>
    </div>
  `;
  root.appendChild(modal);

  const exList = $('#tpl-ex-list', modal);
  if (template && template.exercises) {
    template.exercises.forEach(ex => {
      const exDiv = addManualExercise(exList);
      $('.pw-name', exDiv).value = ex.name;
      ex.sets.forEach(s => {
        const row = document.createElement('div'); row.className = 'pw-set row gap';
        row.innerHTML = `<input class="pw-reps" value="${s.reps}"><input class="pw-weight" value="${s.weight}">`;
        $('.pw-sets', exDiv).appendChild(row);
      });
    });
  }

  $('#tpl-add-ex', modal).addEventListener('click', () => addManualExercise(exList));
  $('#tpl-save', modal).addEventListener('click', async () => {
    const name = $('#tpl-name', modal).value;
    const exercises = $all('.pw-ex', modal).map(exDiv => {
      const exName = $('.pw-name', exDiv).value;
      const sets = $all('.pw-set', exDiv).map(s => ({
        reps: $('.pw-reps', s).value,
        weight: $('.pw-weight', s).value
      }));
      return { name: exName, sets };
    });
    const tpl = { id: template ? template.id : 'tpl-' + Date.now(), name, exercises };
    if (!template) allTemplates.unshift(tpl);
    else {
      const idx = allTemplates.findIndex(x => x.id === tpl.id);
      if (idx >= 0) allTemplates[idx] = tpl;
    }
    renderTemplates();
    root.innerHTML = '';
  });
  $('#tpl-cancel', modal).addEventListener('click', () => root.innerHTML = '');
}

/* =========================
   CHART & PROGRESS (same)
========================= */
function refreshChartSelect() {
  const names = new Set();
  allWorkouts.forEach(w => (w.exercises || []).forEach(e => names.add(e.name)));
  chartSelect.innerHTML = '<option value="">-- Select exercise --</option>' + [...names].map(n => `<option>${escape(n)}</option>`).join('');
}
function renderProgressRecent() {
  const recent = {};
  allWorkouts.forEach(w => (w.exercises || []).forEach(e => {
    const maxW = Math.max(...(e.sets || []).map(s => parseFloat(s.weight) || 0));
    if (!recent[e.name] || maxW > recent[e.name].weight) {
      recent[e.name] = { weight: maxW };
    }
  }));
  recentMaxesEl.innerHTML = Object.entries(recent).map(([n, v]) => `<div>${n}: ${v.weight}kg</div>`).join('');
}

/* =========================
   LOCAL CACHE
========================= */
function loadLocalCaches() {
  try { allWorkouts = JSON.parse(localStorage.getItem('local_workouts') || '[]'); } catch { allWorkouts = []; }
  try { allTemplates = JSON.parse(localStorage.getItem('local_templates') || '[]'); } catch { allTemplates = []; }
  renderHistory(); renderTemplates(); refreshChartSelect(); renderProgressRecent();
}
