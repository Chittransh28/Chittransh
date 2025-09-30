// app.js — Personal Tracker
// Firebase + Firestore + Auth + Templates + Manual Past Entry
// Fully functional - CORRECTED VERSION (v3)

/* =========================
   FIREBASE INITIALIZATION
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, onSnapshot, query, orderBy, deleteDoc
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
   STATE (Global)
========================= */
let uid = null;
let allWorkouts = [];
let allTemplates = [];
let chart = null;

// =========================================================================================================
// === FIX: WRAP ALL SCRIPT LOGIC IN DOMCONTENTLOADED TO PREVENT RACE CONDITIONS ===
// =========================================================================================================
document.addEventListener('DOMContentLoaded', () => {

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
    const emailEl = $('#email'), passwordEl = $('#password');
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
    const modalRoot = $('#modal-root');


    /* =========================
       TOAST
    ========================= */
    function showToast(msg, isError = false) {
      console.info('toast:', msg);
      const toastEl = document.createElement('div');
      toastEl.className = 'card';
      toastEl.style.cssText = `
        position: fixed; top: 1rem; right: 1rem; z-index: 100;
        background: ${isError ? '#fef2f2' : '#eff6ff'};
        color: ${isError ? '#991b1b' : '#1e40af'};
        border: 1px solid ${isError ? '#fecaca' : '#bfdbfe'};
      `;
      toastEl.textContent = msg;
      document.body.appendChild(toastEl);
      setTimeout(() => toastEl.remove(), 3000);
    }

    /* =========================
       CORE APP LOGIC & FUNCTIONS
    ========================= */
    function showAuth() { authScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
    function showApp() { authScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); }

    function attachFirestoreListeners() {
      const workoutsRef = collection(db, `users/${uid}/workouts`);
      const tplRef = collection(db, `users/${uid}/templates`);

      onSnapshot(query(workoutsRef, orderBy('startTime', 'desc')), snap => {
        allWorkouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderHistory();
        refreshChartSelect();
        renderProgressRecent();
      });

      onSnapshot(query(tplRef, orderBy('name')), snap => {
        allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTemplates();
      });
    }

    async function saveWorkout(workout) {
      if (!uid) { showToast('You must be signed in to save workouts.', true); return; }
      try {
        if (workout.id) {
          await setDoc(doc(db, `users/${uid}/workouts`, workout.id), workout);
        } else {
          await addDoc(collection(db, `users/${uid}/workouts`), workout);
        }
        showToast('Workout saved!');
      } catch(e) { showToast(e.message, true); }
    }

    function renderHistory() {
      historyList.innerHTML = '';
      if (!allWorkouts.length) { historyList.innerHTML = '<div>No workouts yet.</div>'; return; }
      allWorkouts.forEach(w => {
        const d = new Date(w.startTime || Date.now());
        const div = document.createElement('div');
        div.className = 'card';
        div.style.cursor = 'pointer';
        div.innerHTML = `
          <div class="row space-between">
            <strong>${w.daySplit || d.toLocaleDateString()}</strong>
            <span class="muted">${d.toLocaleDateString()}</span>
          </div>
          <div class="muted">${(w.exercises || []).map(e => e.name).join(', ')}</div>
        `;
        div.addEventListener('click', () => openWorkoutDetailModal(w));
        historyList.appendChild(div);
      });
    }
    
    function openWorkoutDetailModal(workout) {
      modalRoot.innerHTML = '';
      const modal = document.createElement('div');
      modal.className = 'modal card';

      const exerciseHTML = (workout.exercises || []).map(ex => `
        <div class="detail-exercise">
          <strong>${escape(ex.name)}</strong>
          ${(ex.sets || []).map(set => `<div>${set.reps} reps @ ${set.weight} kg</div>`).join('')}
        </div>
      `).join('');

      modal.innerHTML = `
        <h3>Workout Details</h3>
        <p class="muted">Completed on: ${new Date(workout.startTime).toLocaleString()}</p>
        <div class="mt">${exerciseHTML}</div>
        <div class="row gap mt-sm">
          <button id="close-modal" class="btn ghost">Close</button>
        </div>
      `;
      modalRoot.appendChild(modal);
      $('#close-modal', modal).addEventListener('click', () => modalRoot.innerHTML = '');
    }

    function openPastWorkoutModal(workout = null) {
      modalRoot.innerHTML = '';
      const modal = document.createElement('div'); modal.className = 'modal card';
      modal.innerHTML = `
        <h3>Add Past Workout</h3>
        <label>Date <input type="datetime-local" id="pw-date" value="${new Date().toISOString().slice(0, 16)}"></label>
        <div id="pw-ex-list"></div>
        <button id="pw-add-ex" class="btn ghost mt-sm">+ Exercise</button>
        <div class="row gap mt">
          <button id="pw-save" class="btn">Save</button>
          <button id="pw-cancel" class="btn ghost">Cancel</button>
        </div>
      `;
      modalRoot.appendChild(modal);

      const exList = $('#pw-ex-list', modal);
      $('#pw-add-ex', modal).addEventListener('click', () => addManualExercise(exList));
      $('#pw-save', modal).addEventListener('click', async () => {
        const date = $('#pw-date', modal).value;
        const exercises = $all('.pw-ex', modal).map(exDiv => {
          const name = $('.pw-name', exDiv).value;
          const sets = $all('.pw-set', exDiv).map(s => ({
            reps: parseInt($('.pw-reps', s).value) || 0,
            weight: parseFloat($('.pw-weight', s).value) || 0
          }));
          return { name, sets };
        }).filter(e => e.name);
        const newWorkout = { startTime: new Date(date).toISOString(), exercises };
        await saveWorkout(newWorkout);
        modalRoot.innerHTML = '';
      });
      $('#pw-cancel', modal).addEventListener('click', () => modalRoot.innerHTML = '');
    }

    function addManualExercise(container) {
      const div = document.createElement('div'); div.className = 'pw-ex card mt-sm';
      div.innerHTML = `
        <input class="pw-name" placeholder="Exercise name">
        <div class="pw-sets stack mt-sm"></div>
        <button class="pw-add-set btn ghost">+ Set</button>
      `;
      container.appendChild(div);
      const setsEl = $('.pw-sets', div);
      const addSetRow = () => {
        const row = document.createElement('div'); row.className = 'pw-set row gap';
        row.innerHTML = `<input class="pw-reps" type="number" placeholder="Reps"><input class="pw-weight" type="number" placeholder="kg">`;
        setsEl.appendChild(row);
      };
      $('.pw-add-set', div).addEventListener('click', addSetRow);
      addSetRow();
      return div;
    }

    function renderTemplates() {
      templateListEl.innerHTML = '';
      if (!allTemplates.length) { templateListEl.innerHTML = '<div>No templates yet.</div>'; return; }
      allTemplates.forEach(t => {
        const node = document.createElement('div'); node.className = 'card';
        node.innerHTML = `
          <div class="row space-between">
            <strong>${escape(t.name)}</strong>
            <div class="row gap">
                <button class="start btn">Start</button>
                <button class="edit btn ghost">Edit</button>
                <button class="del btn danger">Del</button>
            </div>
          </div>
          <div class="muted mt-sm">${(t.exercises || []).map(e => e.name).join(', ')}</div>
        `;
        node.querySelector('.start').addEventListener('click', () => startLiveFromTemplate(t));
        node.querySelector('.edit').addEventListener('click', () => openTemplateModal(t));
        node.querySelector('.del').addEventListener('click', async () => {
          if (confirm(`Are you sure you want to delete the "${t.name}" template?`)) {
            try {
              await deleteDoc(doc(db, `users/${uid}/templates`, t.id));
              showToast('Template deleted');
            } catch(e) { showToast(e.message, true); }
          }
        });
        templateListEl.appendChild(node);
      });
    }

    function startLiveFromTemplate(template) {
      liveWorkoutEl.classList.remove('hidden');
      exercisesContainer.innerHTML = '';
      (template.exercises || []).forEach(ex => {
        const exDiv = addManualExercise(exercisesContainer);
        $('.pw-name', exDiv).value = ex.name;
        const setsContainer = $('.pw-sets', exDiv);
        setsContainer.innerHTML = '';
        (ex.sets || []).forEach(set => {
           const row = document.createElement('div'); row.className = 'pw-set row gap';
           row.innerHTML = `<input class="pw-reps" type="number" placeholder="Reps" value="${set.reps || ''}"><input class="pw-weight" type="number" placeholder="kg" value="${set.weight || ''}">`;
           setsContainer.appendChild(row);
        });
      });
    }

    function openTemplateModal(template = null) {
      modalRoot.innerHTML = '';
      const modal = document.createElement('div'); modal.className = 'modal card';
      modal.innerHTML = `
        <h3>${template ? 'Edit' : 'New'} Template</h3>
        <input id="tpl-name" placeholder="Template name" value="${template ? escape(template.name) : ''}">
        <div id="tpl-ex-list"></div>
        <button id="tpl-add-ex" class="btn ghost mt-sm">+ Add Exercise</button>
        <div class="row gap mt">
          <button id="tpl-save" class="btn">Save</button>
          <button id="tpl-cancel" class="btn ghost">Cancel</button>
        </div>
      `;
      modalRoot.appendChild(modal);
      const exList = $('#tpl-ex-list', modal);
      if (template && template.exercises) {
        template.exercises.forEach(ex => {
          const exDiv = addManualExercise(exList);
          $('.pw-name', exDiv).value = ex.name;
          const setsContainer = $('.pw-sets', exDiv);
          setsContainer.innerHTML = '';
          ex.sets.forEach(s => {
            const row = document.createElement('div'); row.className = 'pw-set row gap';
            row.innerHTML = `<input class="pw-reps" value="${s.reps || ''}"><input class="pw-weight" value="${s.weight || ''}">`;
            $('.pw-sets', exDiv).appendChild(row);
          });
        });
      }
      $('#tpl-add-ex', modal).addEventListener('click', () => addManualExercise(exList));
      $('#tpl-save', modal).addEventListener('click', async () => {
        const name = $('#tpl-name', modal).value;
        if (!name) { showToast('Template name cannot be empty.', true); return; }
        const exercises = $all('.pw-ex', modal).map(exDiv => {
          const exName = $('.pw-name', exDiv).value;
          const sets = $all('.pw-set', exDiv).map(s => ({
            reps: parseInt($('.pw-reps', s).value) || 0,
            weight: parseFloat($('.pw-weight', s).value) || 0
          }));
          return { name: exName, sets };
        }).filter(e => e.name);
        const tplData = { name, exercises };
        try {
          if (template && template.id) { await setDoc(doc(db, `users/${uid}/templates`, template.id), tplData); }
          else { await addDoc(collection(db, `users/${uid}/templates`), tplData); }
          showToast('Template saved!');
          modalRoot.innerHTML = '';
        } catch(e) { showToast(e.message, true); }
      });
      $('#tpl-cancel', modal).addEventListener('click', () => modalRoot.innerHTML = '');
    }

    function refreshChartSelect() {
      const names = [...new Set(allWorkouts.flatMap(w => (w.exercises || []).map(e => e.name)))];
      chartSelect.innerHTML = '<option value="">-- Select exercise to chart --</option>' + names.map(n => `<option value="${escape(n)}">${escape(n)}</option>`).join('');
    }

    function renderChart(exerciseName) {
      if (chart) { chart.destroy(); }
      if (!exerciseName) return;
      const dataPoints = allWorkouts
        .map(w => {
          const ex = (w.exercises || []).find(e => e.name === exerciseName);
          if (!ex) return null;
          const maxWeight = Math.max(0, ...(ex.sets || []).map(s => parseFloat(s.weight) || 0));
          return { time: new Date(w.startTime), weight: maxWeight };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);
      chart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: dataPoints.map(d => d.time.toLocaleDateString()),
          datasets: [{
            label: `Max Weight for ${escape(exerciseName)} (kg)`,
            data: dataPoints.map(d => d.weight),
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88, 166, 255, 0.1)',
            fill: true,
            tension: 0.1
          }]
        }
      });
    }

    function renderProgressRecent() {
      const recent = {};
      allWorkouts.forEach(w => (w.exercises || []).forEach(e => {
        const maxW = Math.max(0, ...(e.sets || []).map(s => parseFloat(s.weight) || 0));
        if (!recent[e.name] || maxW > recent[e.name].weight) {
          recent[e.name] = { weight: maxW };
        }
      }));
      recentMaxesEl.innerHTML = '<h4>Personal Bests (Max Weight)</h4>' + Object.entries(recent).map(([n, v]) => `<div><strong>${escape(n)}:</strong> ${v.weight} kg</div>`).join('');
    }

    /* =========================
       EVENT LISTENERS
    ========================= */
    btnRegister.addEventListener('click', async () => { try { await createUserWithEmailAndPassword(auth, emailEl.value, passwordEl.value); } catch (e) { showToast(e.message, true); } });
    btnSignin.addEventListener('click', async () => { try { await signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value); } catch (e) { showToast(e.message, true); } });
    btnReset.addEventListener('click', async () => { try { await sendPasswordResetEmail(auth, emailEl.value); showToast('Reset email sent'); } catch (e) { showToast(e.message, true); } });
    signoutBtn.addEventListener('click', () => signOut(auth));
    addPastBtn.addEventListener('click', () => openPastWorkoutModal());
    startLiveBtn.addEventListener('click', () => { liveWorkoutEl.classList.remove('hidden'); exercisesContainer.innerHTML = ''; addManualExercise(exercisesContainer); });
    addExBtn.addEventListener('click', () => addManualExercise(exercisesContainer));
    finishBtn.addEventListener('click', async () => {
        const exercises = $all('.pw-ex', exercisesContainer).map(exDiv => ({ name: $('.pw-name', exDiv).value, sets: $all('.pw-set', exDiv).map(s => ({ reps: parseInt($('.pw-reps', s).value) || 0, weight: parseFloat($('.pw-weight', s).value) || 0 })) })).filter(e => e.name);
        if (exercises.length === 0) { showToast('Add at least one exercise.', true); return; }
        await saveWorkout({ startTime: new Date().toISOString(), exercises, daySplit: daySplitEl.value, variation: variationEl.value });
        liveWorkoutEl.classList.add('hidden');
        exercisesContainer.innerHTML = '';
    });
    cancelBtn.addEventListener('click', () => { if (confirm('Are you sure you want to cancel? Progress will be lost.')) { liveWorkoutEl.classList.add('hidden'); exercisesContainer.innerHTML = ''; } });
    createTemplateBtn.addEventListener('click', () => openTemplateModal());
    chartSelect.addEventListener('change', () => { renderChart(chartSelect.value); });
    
    /* =========================
       INITIALIZATION
    ========================= */
    onAuthStateChanged(auth, user => {
      if (user) {
        uid = user.uid;
        showApp();
        attachFirestoreListeners();
      } else {
        uid = null;
        showAuth();
      }
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered.', reg))
          .catch(err => console.error('SW registration failed:', err));
      });
    }

    particlesJS('particles-js', {
        "particles": { "number": { "value": 60, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#8b949e" }, "shape": { "type": "circle" }, "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#30363d", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false }, "resize": true }, "modes": { "grab": { "distance": 140, "line_opacity": 1 } } }, "retina_detect": true
    });
});
