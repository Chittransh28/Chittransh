// --- Step 1: Import everything we need ---

// Import Firebase config from your secret file
import { firebaseConfig } from './firebase-config.js';

// Import Firebase services using the new modular syntax
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp, 
    where, 
    getDocs, 
    writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// --- Step 2: Initialize Firebase and services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Element References (remains the same) ---
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const errorMessage = document.getElementById('error-message');
const dashboardContainer = document.getElementById('dashboard-container');
const signOutButton = document.getElementById('sign-out-button');
const addTaskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const resetButton = document.getElementById('reset-button');
const metricsForm = document.getElementById('metrics-form');
const weightInput = document.getElementById('weight-input');

let userRef, tasksCollection, historyCollection;
let unsubscribeTasks;


// --- Step 3: Rewritten Logic using new Firebase syntax ---

// Authentication listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        userRef = doc(db, 'users', user.uid);
        tasksCollection = collection(userRef, 'tasks');
        historyCollection = collection(userRef, 'history');
        
        await handleDailyReset();
        
        loginOverlay.style.display = 'none';
        dashboardContainer.style.display = 'block';
        loadTasks();
        loadTodaysMetrics();
    } else {
        // User is signed out
        loginOverlay.style.display = 'flex';
        dashboardContainer.style.display = 'none';
        if (unsubscribeTasks) unsubscribeTasks();
    }
});

// Daily Reset Logic
async function handleDailyReset() {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocSnap = await getDoc(userRef);
    const lastResetDate = userDocSnap.data()?.lastChecklistReset;

    if (lastResetDate !== todayStr) {
        const completedTasksQuery = query(tasksCollection, where('completed', '==', true));
        const tasksSnapshot = await getDocs(completedTasksQuery);
        const completedCount = tasksSnapshot.size;

        if (completedCount > 0 && lastResetDate) {
            const historyDocRef = doc(historyCollection, lastResetDate);
            await setDoc(historyDocRef, {
                completedTasks: completedCount,
                date: new Date(lastResetDate)
            }, { merge: true });
        }

        const allTasksSnapshot = await getDocs(tasksCollection);
        const batch = writeBatch(db);
        allTasksSnapshot.forEach(doc => {
            batch.update(doc.ref, { completed: false });
        });
        await batch.commit();
        
        await setDoc(userRef, { lastChecklistReset: todayStr }, { merge: true });
    }
}

// Load Tasks with real-time listener
function loadTasks() {
    if (unsubscribeTasks) unsubscribeTasks();
    const tasksQuery = query(tasksCollection, orderBy('createdAt', 'asc'));
    unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        taskList.innerHTML = '';
        snapshot.forEach(doc => {
            const task = doc.data();
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.dataset.id = doc.id;
            if (task.completed) taskItem.classList.add('completed');
            taskItem.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-button"><i class="fa-solid fa-trash-can"></i></button>
            `;
            taskList.appendChild(taskItem);
        });
    });
}

// Load Metrics
async function loadTodaysMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];
    const historyDocRef = doc(historyCollection, todayStr);
    const historyDocSnap = await getDoc(historyDocRef);
    if (historyDocSnap.exists()) {
        weightInput.value = historyDocSnap.data().weight || '';
    } else {
        weightInput.value = '';
    }
}

// --- Event Listeners ---

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .catch(error => errorMessage.textContent = error.message);
});

signOutButton.addEventListener('click', () => signOut(auth));

addTaskForm.addEventListener('submit', e => {
    e.preventDefault();
    const taskText = taskInput.value.trim();
    if (taskText) {
        addDoc(tasksCollection, {
            text: taskText,
            completed: false,
            createdAt: serverTimestamp()
        });
        taskInput.value = '';
    }
});

taskList.addEventListener('click', e => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    const docId = taskItem.dataset.id;
    const taskDocRef = doc(tasksCollection, docId);
    if (e.target.closest('.delete-button')) {
        deleteDoc(taskDocRef);
    } else if (e.target.matches('input[type="checkbox"]')) {
        updateDoc(taskDocRef, { completed: e.target.checked });
    }
});

metricsForm.addEventListener('submit', e => {
    e.preventDefault();
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight)) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const historyDocRef = doc(historyCollection, todayStr);
    setDoc(historyDocRef, {
        weight: weight,
        date: new Date()
    }, { merge: true });
});

resetButton.addEventListener('click', async () => {
    if (confirm('This will permanently delete all tasks. Are you sure?')) {
        const allTasksSnapshot = await getDocs(tasksCollection);
        const batch = writeBatch(db);
        allTasksSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
});

// --- Particle.js Background Code ---
particlesJS('particles-js-personal', {
    "particles": { "number": { "value": 60, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#8b949e" }, "shape": { "type": "circle" }, "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#30363d", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 2, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" }, "resize": true }, "modes": { "grab": { "distance": 140, "line_opacity": 1 } } }, "retina_detect": true
});
