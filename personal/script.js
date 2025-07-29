document.addEventListener('DOMContentLoaded', function() {

    // --- !!! IMPORTANT: SET YOUR PIN HERE !!! ---
    const CORRECT_PIN = '596811';

    // --- Element References ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginBox = document.querySelector('.login-box');
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const errorMessage = document.getElementById('error-message');
    const checklistContainer = document.getElementById('checklist-container');
    const addTaskForm = document.getElementById('add-task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const resetButton = document.getElementById('reset-button');

    // --- Particle.js Background --- THIS IS THE MISSING CODE
    particlesJS('particles-js-personal', {
        "particles": { "number": { "value": 60, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#8b949e" }, "shape": { "type": "circle" }, "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#30363d", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 2, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" }, "resize": true }, "modes": { "grab": { "distance": 140, "line_opacity": 1 } } }, "retina_detect": true
    });

    // --- Authentication Logic ---
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (pinInput.value === CORRECT_PIN) {
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
            }, 500);
            checklistContainer.style.display = 'flex';
            loadTasks();
        } else {
            // Show "Access Denied" message
            errorMessage.textContent = 'Access Denied';
            loginBox.classList.add('error');
            pinInput.value = '';
            setTimeout(() => {
                loginBox.classList.remove('error');
            }, 500);
        }
    });
    
    // Clear error message when user starts typing again
    pinInput.addEventListener('focus', function() {
        errorMessage.textContent = '';
    });

    // --- Checklist Logic ---
    let tasks = [];

    // Load tasks from localStorage
    function loadTasks() {
        const storedTasks = localStorage.getItem('personalTasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        renderTasks();
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('personalTasks', JSON.stringify(tasks));
    }

    // Render tasks on the page
    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            if (task.completed) {
                taskItem.classList.add('completed');
            }
            taskItem.dataset.index = index;
            taskItem.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-button"><i class="fa-solid fa-trash-can"></i></button>
            `;
            taskList.appendChild(taskItem);
        });
    }

    // Add a new task
    addTaskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        if (taskText) {
            tasks.push({ text: taskText, completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    });

    // Handle clicks on task items (check/delete)
    taskList.addEventListener('click', function(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const index = parseInt(taskItem.dataset.index);

        if (e.target.closest('.delete-button')) {
            tasks.splice(index, 1);
        }
        else if (e.target.matches('input[type="checkbox"]')) {
            tasks[index].completed = !tasks[index].completed;
        }
        
        saveTasks();
        renderTasks();
    });

    // Reset button
    resetButton.addEventListener('click', function() {
        if(confirm('Are you sure you want to clear all tasks for the new day?')) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    });

});
