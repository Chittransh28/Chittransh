// --- Step 1: Imports ---
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, collection, doc, getDoc, setDoc, onSnapshot, 
    query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, 
    where, getDocs, writeBatch, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Step 2: Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Element References ---
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
const dynamicMetricsContainer = document.getElementById('dynamic-metrics-container');
const addMetricForm = document.getElementById('add-metric-form');
const newMetricNameInput = document.getElementById('new-metric-name');
const managedMetricsList = document.getElementById('managed-metrics-list');

let userRef, tasksCollection, historyCollection;
let unsubscribeTasks, unsubscribeUser;
let userMetrics = [];

// --- Authentication Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        userRef = doc(db, 'users', user.uid);
        tasksCollection = collection(userRef, 'tasks');
        historyCollection = collection(userRef, 'history');
        
        loginOverlay.style.display = 'none';
        dashboardContainer.style.display = 'block';
        
        listenToUserDocument();
        loadTasks();
    } else {
        loginOverlay.style.display = 'flex';
        dashboardContainer.style.display = 'none';
        if (unsubscribeTasks) unsubscribeTasks();
        if (unsubscribeUser) unsubscribeUser();
    }
});

function listenToUserDocument() {
    if (unsubscribeUser) unsubscribeUser();
    unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
        const userData = docSnap.data();
        userMetrics = userData?.metrics || [];
        renderManagedMetrics();
        renderMetricInputs();
        await handleDailyReset(userData?.lastChecklistReset);
        loadTodaysMetrics();
    });
}

async function handleDailyReset(lastResetDate) {
    const todayStr = new Date().toISOString().split('T')[0];
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

function renderManagedMetrics() {
    managedMetricsList.innerHTML = '';
    userMetrics.forEach(metric => {
        const item = document.createElement('li');
        item.className = 'managed-metric-item';
        item.innerHTML = `
            <span>${metric}</span>
            <button class="delete-metric-button" data-metric="${metric}"><i class="fa-solid fa-times"></i></button>
        `;
        managedMetricsList.appendChild(item);
    });
}

function renderMetricInputs() {
    dynamicMetricsContainer.innerHTML = '';
    userMetrics.forEach(metric => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        const inputId = `metric-${metric.replace(/\s+/g, '-')}`;
        formGroup.innerHTML = `
            <label for="${inputId}">${metric}</label>
            <input type="number" step="0.1" id="${inputId}" data-metric-name="${metric}" placeholder="0">
        `;
        dynamicMetricsContainer.appendChild(formGroup);
    });
}

async function loadTodaysMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];
    const historyDocRef = doc(historyCollection, todayStr);
    const historyDocSnap = await getDoc(historyDocRef);
    const metricsData = historyDocSnap.exists() ? historyDocSnap.data().metrics || {} : {};
    
    userMetrics.forEach(metric => {
        const inputId = `metric-${metric.replace(/\s+/g, '-')}`;
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.value = metricsData[metric] || '';
        }
    });
}

// --- Event Listeners ---
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .catch(error => errorMessage.textContent = error.message);
});

signOutButton.addEventListener('click', () => signOut(auth));

addMetricForm.addEventListener('submit', e => {
    e.preventDefault();
    const newMetric = newMetricNameInput.value.trim();
    if (newMetric && !userMetrics.includes(newMetric)) {
        updateDoc(userRef, {
            metrics: arrayUnion(newMetric)
        });
    }
    newMetricNameInput.value = '';
});

managedMetricsList.addEventListener('click', e => {
    const deleteButton = e.target.closest('.delete-metric-button');
    if (deleteButton) {
        const metricToDelete = deleteButton.dataset.metric;
        updateDoc(userRef, {
            metrics: arrayRemove(metricToDelete)
        });
    }
});

metricsForm.addEventListener('submit', e => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const historyDocRef = doc(historyCollection, todayStr);
    
    const metricsToSave = {};
    const inputs = dynamicMetricsContainer.querySelectorAll('input[data-metric-name]');
    inputs.forEach(input => {
        const metricName = input.dataset.metricName;
        const value = parseFloat(input.value);
        if (input.value.trim() !== '' && !isNaN(value)) {
            metricsToSave[metricName] = value;
        }
    });

    if (Object.keys(metricsToSave).length > 0) {
        setDoc(historyDocRef, {
            metrics: metricsToSave,
            date: new Date()
        }, { merge: true });
    }
});

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
    "particles": {
        "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
        "color": { "value": "#8b949e" },
        "shape": { "type": "circle" },
        "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
        "size": { "value": 3, "random": true },
        "line_linked": { "enable": true, "distance": 150, "color": "#30363d", "opacity": 0.4, "width": 1 },
        "move": { "enable": true, "speed": 2, "direction": "none", "out_mode": "out" }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": { "onhover": { "enable": true, "mode": "grab" }, "resize": true },
        "modes": { "grab": { "distance": 140, "line_opacity": 1 } }
    },
    "retina_detect": true
});
