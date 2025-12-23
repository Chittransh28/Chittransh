// Import the specific Firebase products we need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// Replace the values below with the ones from your Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyBCn2vp8AeN7dtRyuLk6LPtMkmB_teb2rc",
  authDomain: "lifeos-c53d4.firebaseapp.com",
  projectId: "lifeos-c53d4",
  storageBucket: "lifeos-c53d4.firebasestorage.app",
  messagingSenderId: "587429424338",
  appId: "1:587429424338:web:1df9bb2f104e5b9f71910b",
  measurementId: "G-FYP5YVBCC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const lifeScoreEl = document.getElementById("life-score");
const sleepInput = document.getElementById("sleep-input");
const habitGrid = document.getElementById("habit-grid");
const addHabitBtn = document.getElementById("add-habit-btn");
let currentUser = null;

// 1. LOGIN LOGIC
function login() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Logged in as:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Login failed:", error);
            alert("Login failed. Check console for details.");
        });
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // User is signed in, load their data
        loadHabits();
        setupSleepTracker();
        addHabitBtn.onclick = addNewHabit;
    } else {
        // User is signed out, show login button
        habitGrid.innerHTML = '<button onclick="login()" style="padding:10px 20px; font-size:18px; cursor:pointer;">Login with Google to Start</button>';
        lifeScoreEl.innerText = "--";
    }
    // Make login function available globally
    window.login = login; 
});

// 2. HABIT LOGIC
function loadHabits() {
    // Look for habits belonging to this user
    const q = query(
        collection(db, "habits"), 
        where("userId", "==", currentUser.uid),
        orderBy("createdAt")
    );

    // Listen for real-time updates
    onSnapshot(q, (snapshot) => {
        habitGrid.innerHTML = ""; // Clear current list
        let totalScore = 0;
        let totalMaxScore = 0;

        snapshot.forEach((docSnap) => {
            const habit = docSnap.data();
            const habitId = docSnap.id;
            
            // Calculate Score (Simple version: 10 pts for High, 5 for Med, 1 for Low)
            const pts = habit.priority === "High" ? 10 : habit.priority === "Medium" ? 5 : 1;
            totalMaxScore += pts;
            if (habit.completed) totalScore += pts;

            renderHabit(habitId, habit);
        });

        // Update Life Score Display
        const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
        lifeScoreEl.innerText = `${percentage}`;
    });
}

function renderHabit(id, habit) {
    const div = document.createElement("div");
    div.className = "habit-item";
    // Green border if done
    div.style.borderLeft = habit.completed ? "5px solid var(--success)" : "5px solid transparent";
    
    div.innerHTML = `
        <div>
            <strong>${habit.name}</strong>
            <div style="font-size: 0.8rem; color: #888;">${habit.category} • ${habit.priority}</div>
        </div>
        <input type="checkbox" ${habit.completed ? "checked" : ""} class="habit-check">
    `;

    // Handle clicking the checkbox
    const checkbox = div.querySelector(".habit-check");
    checkbox.addEventListener("change", () => toggleHabit(id, checkbox.checked));

    habitGrid.appendChild(div);
}

// 3. ACTIONS
async function toggleHabit(id, isDone) {
    const habitRef = doc(db, "habits", id);
    await updateDoc(habitRef, {
        completed: isDone
    });
}

async function addNewHabit() {
    const name = prompt("Enter habit name:");
    if (!name) return;
    
    const priority = prompt("Priority (High, Medium, Low):") || "Medium";
    const category = prompt("Category (Health, Work, Learning):") || "General";

    await addDoc(collection(db, "habits"), {
        userId: currentUser.uid,
        name: name,
        priority: priority,
        category: category,
        completed: false,
        createdAt: Date.now()
    });
}

function setupSleepTracker() {
    // In a full app, we would save this to the database too.
    // For now, it just looks pretty!
    sleepInput.addEventListener("change", (e) => {
        console.log("Sleep recorded:", e.target.value);
    });
}
