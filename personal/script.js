document.addEventListener('DOMContentLoaded', () => {
    // Select DOM elements
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const clearCheckedBtn = document.getElementById('clear-checked-btn');
    const resetBtn = document.getElementById('reset-btn');
    const dateElement = document.getElementById('date');

    // Set the current date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('en-US', options);

    // Load tasks from localStorage when the page loads
    loadTasks();

    // --- Event Listeners ---

    // Add task when 'Add' button is clicked
    addTaskBtn.addEventListener('click', addTask);

    // Add task when 'Enter' key is pressed in the input field
    taskInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // Handle clicking on a task (for completing or deleting)
    taskList.addEventListener('click', handleTaskClick);

    // Clear all checked tasks
    clearCheckedBtn.addEventListener('click', () => {
        const completedTasks = document.querySelectorAll('#task-list li.completed');
        completedTasks.forEach(task => task.remove());
        saveTasks();
    });

    // Reset the entire list for a new day
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all tasks? This cannot be undone.')) {
            taskList.innerHTML = '';
            localStorage.removeItem('tasks');
        }
    });

    // --- Functions ---

    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') {
            alert('Please enter a task.');
            return;
        }

        createTaskElement({ text: taskText, completed: false });
        taskInput.value = '';
        saveTasks();
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        if (task.completed) {
            li.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;

        const span = document.createElement('span');
        span.textContent = task.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
    }

    function handleTaskClick(event) {
        const target = event.target;

        // If a checkbox is clicked
        if (target.type === 'checkbox') {
            target.parentElement.classList.toggle('completed');
        }

        // If the delete button is clicked
        if (target.classList.contains('delete-btn')) {
            target.parentElement.remove();
        }
        
        saveTasks();
    }

    function saveTasks() {
        const tasks = [];
        const taskItems = document.querySelectorAll('#task-list li');
        taskItems.forEach(item => {
            tasks.push({
                text: item.querySelector('span').textContent,
                completed: item.classList.contains('completed')
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        if (tasks) {
            tasks.forEach(task => createTaskElement(task));
        }
    }
});
