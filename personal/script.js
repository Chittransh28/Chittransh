document.addEventListener('DOMContentLoaded', function() {

    // --- !!! IMPORTANT: SET YOUR PIN HERE !!! ---
    // This is NOT secure storage. It's only a simple gatekeeper for personal use.
    const CORRECT_PIN = '1234';

    // --- Element References ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginBox = document.querySelector('.login-box');
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const checklistContainer = document.getElementById('checklist-container');
    const addTaskForm = document.getElementById('add-task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const resetButton = document.getElementById('reset-button');

    // --- Particle.js Background ---
    particlesJS('particles-js-personal', { /* ... Paste your particles.js config from previous files here ... */ });

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
            loginBox.classList.add('error');
            pinInput.value = '';
            setTimeout(() => {
                loginBox.classList.remove('error');
            }, 500);
        }
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

        // If delete button is clicked
        if (e.target.closest('.delete-button')) {
            tasks.splice(index, 1);
        }
        // If checkbox is clicked
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
