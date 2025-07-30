document.addEventListener('DOMContentLoaded', function() {
    // --- Step 1: Paste your Firebase Configuration here ---

   const firebaseConfig = {
    apiKey: "AIzaSyBceOFjCe6XJqp1WRKzFEH2z0aHTJ_mg7s",
    authDomain: "checklist-c3873.firebaseapp.com",
    projectId: "checklist-c3873",
    storageBucket: "checklist-c3873.firebasestorage.app",
    messagingSenderId: "793789089385",
    appId: "1:793789089385:web:82759a616273a2acc144f8"
  };

    // --- Step 2: Initialize Firebase and services ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Element References ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');
    const checklistContainer = document.getElementById('checklist-container');
    const signOutButton = document.getElementById('sign-out-button');
    const addTaskForm = document.getElementById('add-task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const resetButton = document.getElementById('reset-button');
    
    let tasksCollection; // This will hold the reference to the user's tasks
    let unsubscribe; // This will hold the real-time listener function

    // --- Step 3: Authentication Logic ---
    
    // This listener runs whenever the user's login state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            loginOverlay.style.display = 'none';
            checklistContainer.style.display = 'flex';
            
            // Set up the database reference for this specific user
            tasksCollection = db.collection('users').doc(user.uid).collection('tasks');
            loadTasks();
        } else {
            // User is signed out
            loginOverlay.style.display = 'flex';
            checklistContainer.style.display = 'none';
            
            // Stop listening for task updates if the user logs out
            if(unsubscribe) unsubscribe();
        }
    });

    // Handle login form submission
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                errorMessage.textContent = error.message;
            });
    });

    // Handle sign out
    signOutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // --- Step 4: Firestore (Checklist) Logic ---

    function loadTasks() {
        // Use onSnapshot for REAL-TIME updates. This is the magic!
        unsubscribe = tasksCollection.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
            taskList.innerHTML = ''; // Clear the list before re-rendering
            snapshot.forEach(doc => {
                const task = doc.data();
                const taskItem = document.createElement('li');
                taskItem.className = 'task-item';
                taskItem.dataset.id = doc.id; // Use Firestore doc ID
                if(task.completed) taskItem.classList.add('completed');

                taskItem.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text">${task.text}</span>
                    <button class="delete-button"><i class="fa-solid fa-trash-can"></i></button>
                `;
                taskList.appendChild(taskItem);
            });
        });
    }

    // Add a new task
    addTaskForm.addEventListener('submit', e => {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        if (taskText) {
            tasksCollection.add({
                text: taskText,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            taskInput.value = '';
        }
    });

    // Handle checking/deleting tasks
    taskList.addEventListener('click', e => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const docId = taskItem.dataset.id;
        const taskRef = tasksCollection.doc(docId);

        if (e.target.closest('.delete-button')) {
            taskRef.delete();
        } else if (e.target.matches('input[type="checkbox"]')) {
            const isCompleted = e.target.checked;
            taskRef.update({ completed: isCompleted });
        }
    });

    // Reset button
    resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks?')) {
            tasksCollection.get().then(snapshot => {
                snapshot.forEach(doc => {
                    doc.ref.delete();
                });
            });
        }
    });
    
    // --- Don't forget the particle background ---
   particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 60, // Number of particles
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#8b949e" // Particle color
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                }
            },
            "opacity": {
                "value": 0.4,
                "random": true,
                "anim": {
                    "enable": true,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 3,
                "random": true,
                "anim": {
                    "enable": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#30363d", // Line color
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab" // 'grab' or 'repulse'
                },
                "onclick": {
                    "enable": false,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 140,
                    "line_opacity": 1
                },
                "repulse": {
                    "distance": 200,
                    "duration": 0.4
                }
            }
        },
        "retina_detect": true
    });

});
