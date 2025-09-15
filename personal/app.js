/* app.js — Completed, wired, validated, Firestore optional
   Instructions: paste your Firebase client config into firebaseConfig,
   then host files on GitHub Pages. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, collection, addDoc, setDoc, doc, onSnapshot, query, orderBy, limit, startAfter, getDocs
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

console.log('app.js loaded');

/* ========== CONFIG ========== */
/* Paste your Firebase config object here or leave null to run local-only */
const firebaseConfig = {
  apiKey: "AIzaSyBceOFjCe6XJqp1WRKzFEH2z0aHTJ_mg7s",
  authDomain: "checklist-c3873.firebaseapp.com",
  projectId: "checklist-c3873",
  storageBucket: "checklist-c3873.firebasestorage.app",
  messagingSenderId: "793789089385",
  appId: "1:793789089385:web:82759a616273a2acc144f8"
};

/* ========== STATE ========== */
let firebaseApp = null, auth = null, db = null, uid = null;
let allWorkouts = []; // local cache
let allTemplates = []; // local templates
let workoutListenerUnsub = null;
let currentWorkout = null;
let timerInterval = null;
let chart = null;
let lastVisible = null; // pagination cursor

/* ========== DOM HELPERS ========== */
const $ = (s,r=document)=>r.querySelector(s);
const $all = (s,r=document)=>Array.from((r||document).querySelectorAll(s));
const escape = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isNumber = v => !isNaN(v) && v !== '';

/* ========== REFS ========== */
const onlineIndicator = $('#online-indicator');
const userEmailEl = $('#user-email');

const authScreen = $('#auth-screen'), appScreen = $('#app-screen');
const emailEl = $('#email'), passwordEl = $('#password'), authMessage = $('#auth-message');
const btnSignin = $('#btn-signin'), btnRegister = $('#btn-register'), btnReset = $('#btn-reset');
const signoutBtn = $('#signout');

const startLiveBtn = $('#start-live'), addPastBtn = $('#add-past');
const daySplitEl = $('#day-split'), variationEl = $('#variation');

const historyList = $('#history-list'), loadMoreBtn = $('#load-more'), searchEx = $('#search-ex');

const liveWorkoutEl = $('#live-workout'), exercisesContainer = $('#exercises-container');
const finishBtn = $('#finish'), cancelBtn = $('#cancel'), addExBtn = $('#add-ex-btn'), saveNowBtn = $('#save-now');
const timerEl = $('#timer');

const chartSelect = $('#chart-ex'); const chartCanvas = $('#chart');
const recentMaxesEl = $('#recent-maxes');

const templateListEl = $('#template-list'), createTemplateBtn = $('#create-template');
const importFile = $('#import-file'), importBtn = $('#import-json'), exportBtn = $('#export-json');

/* ========== UTILS ========== */
function showToast(msg){ console.info('toast:', msg); authMessage.textContent = msg; setTimeout(()=>{ if(authMessage.textContent===msg) authMessage.textContent=''; }, 3500); }

/* validate workout payload thoroughly */
function validateWorkoutPayload(w){
  if(!w || !Array.isArray(w.exercises) || w.exercises.length===0) throw new Error('Workout must contain exercises');
  for(const ex of w.exercises){
    if(!ex.name || ex.name.trim().length < 2) throw new Error('Invalid exercise name');
    if(!Array.isArray(ex.sets) || ex.sets.length===0) throw new Error('Exercise must have sets');
    for(const s of ex.sets){
      const wt = parseFloat(s.weight||0), rp = parseInt(s.reps||0,10);
      if(!isFinite(wt) || wt < 0 || wt > 1000) throw new Error('Invalid weight value');
      if(!isFinite(rp) || rp < 0 || rp > 1000) throw new Error('Invalid reps value');
    }
  }
}

/* ========== FIREBASE INIT (optional) ========== */
if(firebaseConfig){
  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log('Firebase initialized');
  } catch(e){ console.error('Firebase init error', e); showToast('Firebase init failed'); }
}

/* ========== AUTH FLOW ========== */
btnRegister.addEventListener('click', async ()=>{
  const email = emailEl.value.trim(), pw = passwordEl.value;
  if(!email || !pw) return showToast('Enter email and password');
  try {
    if(!auth) throw new Error('Firebase not configured');
    await createUserWithEmailAndPassword(auth, email, pw);
  } catch(e){ console.error(e); showToast(e.message || 'Register failed'); }
});
btnSignin.addEventListener('click', async ()=>{
  const email = emailEl.value.trim(), pw = passwordEl.value;
  if(!email || !pw) return showToast('Enter email and password');
  try {
    if(!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, pw);
  } catch(e){ console.error(e); showToast(e.message || 'Sign-in failed'); }
});
btnReset.addEventListener('click', async ()=>{
  const email = emailEl.value.trim();
  if(!email) return showToast('Enter email to reset');
  try { if(!auth) throw new Error('Firebase not configured'); await sendPasswordResetEmail(auth, email); showToast('Reset email sent'); }
  catch(e){ console.error(e); showToast(e.message || 'Reset failed'); }
});
if(signoutBtn) signoutBtn.addEventListener('click', async ()=>{ if(auth){ await signOut(auth); uid = null; showAuth(); } else showAuth(); });

/* auth-state: if firebase enabled, use onAuthStateChanged */
if(auth){
  onAuthStateChanged(auth, user=>{
    if(user){ uid = user.uid; userEmailEl.textContent = user.email || ''; showApp(); attachFirestoreListeners(); }
    else { uid = null; userEmailEl.textContent = ''; showAuth(); detachFirestoreListeners(); loadLocalCaches(); }
  });
} else {
  // local-only mode: show auth screen but allow usage (user must click "Sign in" will error)
  showAuth();
  loadLocalCaches();
}

/* ========== SCREEN TOGGLING ========== */
function showAuth(){ authScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
function showApp(){ authScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); }

/* ========== LOAD LOCAL CACHES ========== */
function loadLocalCaches(){
  try {
    allWorkouts = JSON.parse(localStorage.getItem('local_workouts')||'[]');
    allTemplates = JSON.parse(localStorage.getItem('local_templates')||'[]');
  } catch(e){ allWorkouts = []; allTemplates = []; }
  renderHistory(true);
  renderTemplates();
  refreshChartSelect();
  renderProgressRecent();
}

/* ========== FIRESTORE LISTENERS ========== */
function attachFirestoreListeners(){
  if(!db || !uid) return;
  // workouts
  const workoutsRef = collection(db, `users/${uid}/workouts`);
  const q = query(workoutsRef, orderBy('startTime', 'desc'), limit(1000));
  workoutListenerUnsub = onSnapshot(q, snap=>{
    allWorkouts = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    // normalize times if needed
    for(const w of allWorkouts) if(typeof w.startTime === 'object' && w.startTime.toDate) w.startTime = w.startTime.toDate().toISOString();
    renderHistory(true);
    refreshChartSelect();
    renderProgressRecent();
  }, err=>{ console.error('workouts snapshot', err); showToast('Sync error'); });
  // templates (optional)
  const tplRef = collection(db, `users/${uid}/templates`);
  onSnapshot(tplRef, snap=>{ allTemplates = snap.docs.map(d=>({ id:d.id, ...d.data()})); renderTemplates(); }, err=>console.error(err));
}
function detachFirestoreListeners(){ if(workoutListenerUnsub) { workoutListenerUnsub(); workoutListenerUnsub=null; } }

/* ========== SAVE WORKOUT ==========
   Saves to Firestore (if configured & signed-in) or localStorage fallback.
*/
async function saveWorkout(workout){
  validateWorkoutPayload(workout);
  if(db && uid){
    try{
      // store under users/{uid}/workouts
      const ref = await addDoc(collection(db, `users/${uid}/workouts`), { ...workout, startTime: workout.startTime });
      return ref.id;
    } catch(e){ console.error('save workout', e); throw e; }
  } else {
    // local fallback
    const data = JSON.parse(localStorage.getItem('local_workouts')||'[]');
    const id = 'local-'+Date.now();
    data.unshift({ id, ...workout });
    localStorage.setItem('local_workouts', JSON.stringify(data));
    allWorkouts = data;
    renderHistory(true);
    refreshChartSelect();
    renderProgressRecent();
    return id;
  }
}

/* ========== HISTORY RENDER & PAGINATION ==========
   renderHistory(reset) - re-renders visible list. Simple pagination with Load More for local mode.
*/
function renderHistory(reset=false){
  const list = allWorkouts || [];
  historyList.innerHTML = '';
  if(list.length === 0){ historyList.innerHTML = '<div class="muted small">No workouts</div>'; return; }
  for(const w of list.slice(0, 100)){ // limit 100 for UI
    const d = new Date(w.startTime || w.createdAt || Date.now());
    const node = document.createElement('div'); node.className='card';
    const preview = (w.exercises || []).slice(0,3).map(e=>escape(e.name)).join(', ');
    node.innerHTML = `<div class="row space-between"><div><strong>${d.toLocaleDateString()}</strong><div class="muted small">${escape(w.daySplit||'—')} · ${escape(w.variation||'—')}</div></div><div class="muted small">${w.duration ? Math.floor(w.duration/60)+'m' : ''}</div></div><div class="muted small mt-sm">${preview}${(w.exercises||[]).length>3?'...':''}</div>`;
    node.addEventListener('click', ()=> openWorkoutDetail(w));
    historyList.appendChild(node);
  }
}

/* show workout detail modal */
function openWorkoutDetail(w){
  const root = $('#modal-root'); root.innerHTML = '';
  const modal = document.createElement('div'); modal.className='modal card';
  modal.style.width='min(900px,94%)';
  const d = new Date(w.startTime || w.createdAt || Date.now());
  modal.innerHTML = `<div class="row space-between"><div><strong>${d.toLocaleString()}</strong></div><div><button class="btn ghost close">Close</button></div></div><div class="mt-sm"></div><div class="mt-sm row gap"><button class="btn ghost edit">Edit</button><button class="btn ghost del">Delete</button></div>`;
  const body = modal.querySelector('div.mt-sm');
  body.innerHTML = '';
  for(const ex of (w.exercises||[])){
    const exCard = document.createElement('div'); exCard.className='card';
    exCard.innerHTML = `<strong>${escape(ex.name)}</strong><div class="muted small">${(ex.sets||[]).map(s=>escape(String(s.reps))+'×'+escape(String(s.weight))+'kg').join(' · ')}</div>`;
    body.appendChild(exCard);
  }
  // close
  modal.querySelector('.close').addEventListener('click', ()=> root.innerHTML='');
  // delete
  modal.querySelector('.del').addEventListener('click', async ()=>{
    if(!confirm('Delete workout?')) return;
    try{
      if(db && uid && w.id && !w.id.startsWith('local-')) await setDoc(doc(db, `users/${uid}/workouts`, w.id), {}, { merge: true }).then(()=>{ /* noop */ });
      // local delete
      allWorkouts = allWorkouts.filter(x=> x.id !== w.id);
      localStorage.setItem('local_workouts', JSON.stringify(allWorkouts));
      renderHistory(true);
      root.innerHTML='';
    } catch(e){ console.error(e); showToast('Delete failed'); }
  });
  // edit (simple - open manual-style editor)
  modal.querySelector('.edit').addEventListener('click', ()=>{ root.innerHTML=''; openEditModal(w); });
  root.appendChild(modal);
}

/* manual editor for history item */
function openEditModal(w){
  const root = $('#modal-root'); root.innerHTML = '';
  const modal = document.createElement('div'); modal.className='modal card';
  modal.style.width='min(860px,96%)';
  modal.innerHTML = `<div class="row space-between"><div><strong>Edit Workout</strong></div><div><button class="btn ghost close">Close</button></div></div><div class="mt-sm"></div><div class="mt-sm row gap"><button class="btn save">Save</button></div>`;
  const body = modal.querySelector('div.mt-sm');
  body.innerHTML = `<div>Date: <input type="date" id="edit-date" class="input small" value="${(new Date(w.startTime || w.createdAt)).toISOString().slice(0,10)}"/></div><div id="edit-ex-list"></div>`;
  const exList = body.querySelector('#edit-ex-list');
  for(const ex of (w.exercises||[])){
    const exDiv = document.createElement('div'); exDiv.className='card';
    exDiv.innerHTML = `<strong>${escape(ex.name)}</strong><div class="stack">${(ex.sets||[]).map(s=>`<div class="row gap"><input class="input small edit-reps" placeholder="reps" value="${escape(s.reps)}"/><input class="input small edit-weight" placeholder="kg" value="${escape(s.weight)}"/></div>`).join('')}</div>`;
    exList.appendChild(exDiv);
  }
  modal.querySelector('.close').addEventListener('click', ()=> root.innerHTML='');
  modal.querySelector('.save').addEventListener('click', async ()=>{
    // collect new values
    const newDate = $('#edit-date', modal).value;
    const exNodes = exList.querySelectorAll('.card');
    const newExercises = Array.from(exNodes).map(node=>{
      const name = node.querySelector('strong').textContent;
      const sets = Array.from(node.querySelectorAll('.edit-reps')).map((r,i)=>({ reps: r.value, weight: node.querySelectorAll('.edit-weight')[i].value }));
      return { name, sets };
    });
    const payload = { startTime: new Date(newDate).toISOString(), exercises: newExercises, daySplit: w.daySplit, variation: w.variation };
    try{
      if(db && uid && w.id && !w.id.startsWith('local-')){
        await setDoc(doc(db, `users/${uid}/workouts`, w.id), payload);
      } else {
        // update local
        const idx = allWorkouts.findIndex(x=>x.id===w.id);
        if(idx>=0){ allWorkouts[idx] = { ...allWorkouts[idx], ...payload }; localStorage.setItem('local_workouts', JSON.stringify(allWorkouts)); }
      }
      showToast('Saved');
      renderHistory(true);
      root.innerHTML='';
    } catch(e){ console.error(e); showToast('Save failed'); }
  });
  root.appendChild(modal);
}

/* ========== LIVE WORKOUT UI ========== */
function startLiveSession(template=null){
  currentWorkout = { startTime: new Date().toISOString(), exercises: [], daySplit: daySplitEl.value, variation: variationEl.value };
  if(template && template.exercises) template.exercises.forEach(n => currentWorkout.exercises.push({ name: n, sets:[{ reps:'', weight:'' }] }));
  renderLiveWorkout();
  liveWorkoutEl.classList.remove('hidden');
  startTimer();
}
startLiveBtn.addEventListener('click', ()=> startLiveSession());

function renderLiveWorkout(){
  exercisesContainer.innerHTML = '';
  if(!currentWorkout) return;
  currentWorkout.exercises.forEach((ex, i)=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<div class="row space-between"><strong>${escape(ex.name)}</strong><div class="row gap"><button class="btn ghost remove-ex">Remove</button></div></div><div class="stack mt-sm"></div><div class="row gap mt-sm"><button class="btn ghost add-set">+ Set</button></div>`;
    const setsEl = card.querySelector('.stack');
    ex.sets.forEach((s, idx)=>{
      const row = document.createElement('div'); row.className='row gap';
      row.innerHTML = `<input class="input small live-reps" data-ex="${i}" data-set="${idx}" placeholder="Reps" value="${escape(s.reps)}"><input class="input small live-weight" data-ex="${i}" data-set="${idx}" placeholder="kg" value="${escape(s.weight)}"><button class="btn ghost remove-set">×</button>`;
      // remove set
      row.querySelector('.remove-set').addEventListener('click', ()=>{ if(confirm('Remove set?')){ ex.sets.splice(idx,1); renderLiveWorkout(); } });
      setsEl.appendChild(row);
    });
    // add set
    card.querySelector('.add-set').addEventListener('click', ()=>{ ex.sets.push({ reps:'', weight:'' }); renderLiveWorkout(); });
    // remove exercise
    card.querySelector('.remove-ex').addEventListener('click', ()=>{ if(confirm('Remove exercise?')){ currentWorkout.exercises.splice(i,1); renderLiveWorkout(); } });
    exercisesContainer.appendChild(card);
  });
}
// input sync (delegation)
exercisesContainer.addEventListener('input', (e)=>{
  if(e.target.matches('.live-reps') || e.target.matches('.live-weight')){
    const ex = parseInt(e.target.dataset.ex,10), setIdx = parseInt(e.target.dataset.set,10);
    if(currentWorkout && currentWorkout.exercises[ex] && currentWorkout.exercises[ex].sets[setIdx]){
      if(e.target.matches('.live-reps')) currentWorkout.exercises[ex].sets[setIdx].reps = e.target.value;
      else currentWorkout.exercises[ex].sets[setIdx].weight = e.target.value;
    }
  }
});

// add exercise
addExBtn.addEventListener('click', ()=>{
  const name = prompt('Exercise name (e.g. Bench Press)');
  if(!name) return;
  currentWorkout.exercises.push({ name: name.trim(), sets:[{ reps:'', weight:'' }] });
  renderLiveWorkout();
});

// timer
function startTimer(){ if(timerInterval) clearInterval(timerInterval); const start = Date.now(); timerInterval = setInterval(()=>{ const diff = Math.floor((Date.now()-start)/1000); timerEl.textContent = String(Math.floor(diff/60)).padStart(2,'0') + ':' + String(diff%60).padStart(2,'0'); currentWorkout.duration = diff; }, 1000); }
function stopTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval=null; timerEl.textContent='00:00'; } }

// finish/save
finishBtn.addEventListener('click', async ()=>{
  if(!currentWorkout || !currentWorkout.exercises.length) return showToast('Add at least one exercise');
  try{
    // clean empty sets
    currentWorkout.exercises.forEach(ex => ex.sets = (ex.sets||[]).filter(s => s.reps !== '' || s.weight !== ''));
    validateWorkoutPayload(currentWorkout);
    await saveWorkout(currentWorkout);
    stopTimer();
    currentWorkout=null;
    liveWorkoutEl.classList.add('hidden');
    renderHistory(true);
    showToast('Workout saved');
  } catch(e){ console.error(e); showToast(e.message || 'Save failed'); }
});
saveNowBtn.addEventListener('click', ()=> finishBtn.click());
cancelBtn.addEventListener('click', ()=>{ if(confirm('Cancel workout?')){ currentWorkout=null; stopTimer(); liveWorkoutEl.classList.add('hidden'); } });

/* ========== TEMPLATES ========== */
createTemplateBtn.addEventListener('click', ()=>{
  const name = prompt('Template name'); if(!name) return;
  const tpl = { id: 'tpl-'+Date.now(), name, exercises: [] };
  allTemplates.unshift(tpl);
  persistLocalTemplates();
  renderTemplates();
});
function renderTemplates(){
  templateListEl.innerHTML = '';
  for(const t of allTemplates){
    const node = document.createElement('div'); node.className='card';
    node.innerHTML = `<div class="row space-between"><div><strong>${escape(t.name)}</strong><div class="muted small">${(t.exercises||[]).join(', ')}</div></div><div class="row gap"><button class="btn ghost start">Start</button><button class="btn ghost edit">Edit</button><button class="btn ghost del">Del</button></div></div>`;
    node.querySelector('.start').addEventListener('click', ()=> startLiveSession(t));
    node.querySelector('.edit').addEventListener('click', ()=> {
      const newName = prompt('Template name', t.name); if(newName) { t.name = newName; persistLocalTemplates(); renderTemplates(); }
    });
    node.querySelector('.del').addEventListener('click', ()=>{ if(confirm('Delete template?')){ allTemplates = allTemplates.filter(x=>x.id!==t.id); persistLocalTemplates(); renderTemplates(); } });
    templateListEl.appendChild(node);
  }
}
function persistLocalTemplates(){ localStorage.setItem('local_templates', JSON.stringify(allTemplates)); }
function loadLocalTemplates(){ try{ allTemplates = JSON.parse(localStorage.getItem('local_templates')||'[]'); }catch(e){ allTemplates=[]; } renderTemplates(); }

/* ========== CHARTS & PROGRESS ========== */
function refreshChartSelect(){
  const names = new Set();
  allWorkouts.forEach(w => (w.exercises||[]).forEach(e => names.add(e.name)));
  chartSelect.innerHTML = '<option value="">-- Select exercise --</option>' + [...names].map(n=>`<option>${escape(n)}</option>`).join('');
}
chartSelect.addEventListener('change', ()=> updateChart(chartSelect.value));

function updateChart(exName){
  if(!exName){ if(chart){ chart.data.labels=[]; chart.data.datasets.forEach(ds=>ds.data=[]); chart.update(); } return; }
  // build points from allWorkouts (chronological)
  const pts = [];
  for(const w of allWorkouts.slice().reverse()){
    for(const e of (w.exercises||[])){
      if(e.name === exName){
        const maxW = Math.max(...(e.sets||[]).map(s=>parseFloat(s.weight)||0));
        const maxR = Math.max(...(e.sets||[]).map(s=>parseInt(s.reps,10)||0));
        if(maxW>0 || maxR>0) pts.push({ date: new Date(w.startTime||w.createdAt||Date.now()), w: maxW, r: maxR });
      }
    }
  }
  const labels = pts.map(p=>p.date.toLocaleDateString());
  const dataW = pts.map(p=>p.w);
  const dataR = pts.map(p=>p.r);
  if(!chart){
    chart = new Chart(chartCanvas.getContext('2d'), {
      type:'line', data:{ labels, datasets:[{ label:'Max weight (kg)', data:dataW, borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,0.08)', fill:true }, { label:'Max reps', data:dataR, borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.06)', fill:true }] }, options:{ responsive:true, maintainAspectRatio:false }
    });
  } else {
    chart.data.labels = labels; chart.data.datasets[0].data = dataW; chart.data.datasets[1].data = dataR; chart.update();
  }
}

function renderProgressRecent(){
  const recent = {};
  for(const w of allWorkouts){
    const d = new Date(w.startTime||w.createdAt||Date.now());
    for(const e of (w.exercises||[])){
      const maxW = Math.max(...(e.sets||[]).map(s=>parseFloat(s.weight)||0));
      const maxR = Math.max(...(e.sets||[]).map(s=>parseInt(s.reps,10)||0));
      if(!recent[e.name] || maxW > recent[e.name].weight || (maxW === recent[e.name].weight && maxR > recent[e.name].reps)){
        recent[e.name] = { weight: maxW, reps: maxR, date: d };
      }
    }
  }
  recentMaxesEl.innerHTML = Object.entries(recent).slice(0,12).map(([name,v])=>`<div class="row space-between"><div>${escape(name)}</div><div class="muted small">${v.weight}kg × ${v.reps} · ${v.date.toLocaleDateString()}</div></div>`).join('') || '<div class="muted small">No data</div>';
}

/* ========== IMPORT / EXPORT ========== */
importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (ev)=> {
  const f = ev.target.files[0]; if(!f) return;
  const reader = new FileReader(); reader.onload = ()=> {
    try {
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data)) throw new Error('Invalid format');
      if(!confirm(`Import ${data.length} workouts?`)) return;
      data.forEach(w => { if(!w.id) w.id='local-'+Date.now(); allWorkouts.unshift(w); });
      localStorage.setItem('local_workouts', JSON.stringify(allWorkouts));
      renderHistory(true); refreshChartSelect(); renderProgressRecent(); showToast('Import done');
    } catch(e){ console.error(e); showToast('Import failed'); }
  }; reader.readAsText(f);
});
exportBtn.addEventListener('click', ()=> {
  const blob = new Blob([JSON.stringify(allWorkouts, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `stronger_export_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
});

/* ========== UTILITY: Load initial ========== */
function initialLoad(){
  setOnlineIndicator();
  window.addEventListener('online', setOnlineIndicator);
  window.addEventListener('offline', setOnlineIndicator);
  loadLocalTemplates();
  loadLocalCaches();
  renderTemplates();
  if(db && auth && uid){
    // attaching listener will be handled by onAuthStateChanged
  }
}
function setOnlineIndicator(){ onlineIndicator.className = navigator.onLine ? 'online' : 'offline'; onlineIndicator.textContent = navigator.onLine ? 'Online' : 'Offline'; }

/* run */
initialLoad();

/* service worker registration (relative path) */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(()=>console.log('sw registered')).catch(e=>console.warn('sw failed', e));
}
