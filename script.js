class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { id: 'work', name: 'Work', color: '#4f46e5', icon: 'fas fa-briefcase' },
            { id: 'personal', name: 'Personal', color: '#059669', icon: 'fas fa-user' },
            { id: 'shopping', name: 'Shopping', color: '#d97706', icon: 'fas fa-shopping-cart' }
        ];
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.currentCategory = 'all';
        this.isLoading = false;
        this.searchQuery = '';
        this.init();
    }

    init() {
        // DOM Elements
        this.taskInput = document.getElementById('taskInput');
        this.addTaskBtn = document.getElementById('addTask');
        this.taskList = document.getElementById('taskList');
        this.taskCount = document.getElementById('taskCount');
        this.clearAllBtn = document.getElementById('clearAll');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.themeToggle = document.querySelector('.theme-toggle');
        this.taskDueDate = document.getElementById('taskDueDate');
        this.taskPriority = document.getElementById('taskPriority');
        this.taskCategory = document.getElementById('taskCategory');
        this.sortSelect = document.getElementById('sortTasks');
        this.categoryBtns = document.querySelectorAll('.category-btn');
        this.addCategoryBtn = document.querySelector('.add-category-btn');
        this.categoryModal = document.getElementById('categoryModal');
        this.saveCategoryBtn = document.getElementById('saveCategory');
        this.progressBar = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-percentage');
        this.searchInput = document.getElementById('searchInput');

        // Event Listeners
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        this.clearAllBtn.addEventListener('click', () => this.clearAllTasks());
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterTasks(e));
        });
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.sortSelect.addEventListener('change', () => {
            this.currentSort = this.sortSelect.value;
            this.renderTasks();
        });
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e));
        });
        this.addCategoryBtn.addEventListener('click', () => this.openCategoryModal());
        this.saveCategoryBtn.addEventListener('click', () => this.saveCategory());
        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput.value.toLowerCase();
            this.renderTasks();
        });

        // Update modal close handlers
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    // Reset form when closing
                    if (modal.id === 'categoryModal') {
                        document.getElementById('categoryName').value = '';
                        document.getElementById('categoryColor').value = '#4f46e5';
                        document.getElementById('categoryIcon').value = 'fas fa-folder';
                        const preview = document.querySelector('.color-preview');
                        if (preview) preview.remove();
                    }
                }
            });
        });

        // Add click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    // Reset form when closing
                    if (modal.id === 'categoryModal') {
                        document.getElementById('categoryName').value = '';
                        document.getElementById('categoryColor').value = '#4f46e5';
                        document.getElementById('categoryIcon').value = 'fas fa-folder';
                        const preview = document.querySelector('.color-preview');
                        if (preview) preview.remove();
                    }
                }
            });
        });

        // Initialize
        this.renderCategories();
        this.renderTasks();
        this.updateProgress();
        this.taskInput.focus();

        // Load saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        }

        this.initializeNewFeatures();

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    initializeNewFeatures() {
        // New DOM elements
        this.editModal = document.getElementById('editModal');
        this.editTaskText = document.getElementById('editTaskText');
        this.editTaskDueDate = document.getElementById('editTaskDueDate');
        this.editTaskPriority = document.getElementById('editTaskPriority');
        this.editTaskNotes = document.getElementById('editTaskNotes');
        this.saveEditBtn = document.getElementById('saveEdit');

        // Event listeners for new features
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Set minimum date and time for due dates
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        this.taskDueDate.min = minDateTime;
        this.editTaskDueDate.min = minDateTime;

        // Add this new event listener for the save button
        this.saveEditBtn.addEventListener('click', () => this.saveEdit());
    }

    addTask() {
        const taskText = this.taskInput.value.trim();
        if (taskText === '') {
            alert('Please enter a task');
            return;
        }

        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date(),
            dueDate: this.taskDueDate.value || null,
            priority: this.taskPriority.value,
            category: this.taskCategory.value,
            notes: ''
        };

        // Fix: Add validation for due date
        if (task.dueDate && new Date(task.dueDate) < new Date()) {
            alert('Due date cannot be in the past');
            return;
        }

        this.tasks.unshift(task);
        this.saveTasks();
        this.updateProgress();
        this.renderTasks();
        this.resetForm();
    }

    resetForm() {
        this.taskInput.value = '';
        this.taskDueDate.value = '';
        this.taskPriority.value = 'low';
        this.taskCategory.value = 'none';
        this.taskInput.focus();
    }

    toggleTask(id) {
        this.tasks = this.tasks.map(task => 
            task.id === id ? {...task, completed: !task.completed} : task
        );
        this.saveTasks();
        this.renderTasks();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    clearAllTasks() {
        if (confirm('Are you sure you want to clear all tasks?')) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
        }
    }

    filterTasks(e) {
        if (e) {
            this.filterBtns.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            this.currentFilter = e.target.dataset.filter;
        }
        this.renderTasks();
    }

    filterByCategory(e) {
        if (e.target.classList.contains('delete-category')) return;
        
        const categoryBtn = e.target.closest('.category-btn');
        if (!categoryBtn) return;

        this.categoryBtns.forEach(btn => btn.classList.remove('active'));
        categoryBtn.classList.add('active');
        this.currentCategory = categoryBtn.dataset.category;
        this.renderTasks();
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task => {
                const textMatch = task.text.toLowerCase().includes(this.searchQuery);
                const notesMatch = task.notes && task.notes.toLowerCase().includes(this.searchQuery);
                const categoryMatch = this.getCategoryName(task.category).toLowerCase().includes(this.searchQuery);
                const priorityMatch = task.priority.toLowerCase().includes(this.searchQuery);
                return textMatch || notesMatch || categoryMatch || priorityMatch;
            });
        }

        // Category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }

        // Status filter
        switch(this.currentFilter) {
            case 'completed':
                return filtered.filter(task => task.completed);
            case 'pending':
                return filtered.filter(task => !task.completed);
            default:
                return filtered;
        }
    }

    async renderTasks() {
        try {
            this.isLoading = true;
            this.taskList.innerHTML = '<div class="loading">Loading tasks...</div>';

            // Fix: Add delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 100));

            const filteredTasks = this.getFilteredTasks();
            const sortedTasks = this.sortTasks(filteredTasks);
            
            this.taskList.innerHTML = '';
            
            if (sortedTasks.length === 0) {
                this.taskList.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-clipboard-list"></i>
                        <p>${this.getEmptyMessage()}</p>
                    </div>`;
            } else {
                sortedTasks.forEach(task => {
                    const taskElement = this.createTaskElement(task);
                    this.taskList.appendChild(taskElement);
                });
            }

            this.updateTaskCount();
        } catch (error) {
            console.error('Error rendering tasks:', error);
            this.taskList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading tasks. Please try again.</p>
                </div>`;
        } finally {
            this.isLoading = false;
        }
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        const formatDateTime = (dateStr) => {
            const date = new Date(dateStr);
            const isToday = new Date().toDateString() === date.toDateString();
            const formatOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            
            if (isToday) {
                return `Today at ${date.toLocaleTimeString([], formatOptions)}`;
            }
            return date.toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...formatOptions
            });
        };

        const dueDate = task.dueDate ? formatDateTime(task.dueDate) : '';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        
        const category = this.categories.find(c => c.id === task.category);
        const categoryHtml = category ? `
            <span class="category-badge" style="background-color: ${category.color}20; color: ${category.color}">
                ${category.name}
            </span>
        ` : '';
        
        taskElement.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-meta">
                    ${dueDate ? `
                        <span class="due-date ${isOverdue ? 'overdue' : ''}">
                            <i class="far fa-clock"></i> ${dueDate}
                        </span>
                    ` : ''}
                    <span class="priority-badge priority-${task.priority}">
                        ${task.priority}
                    </span>
                    ${categoryHtml}
                </div>
                ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Event listeners
        taskElement.querySelector('.task-checkbox').addEventListener('change', () => {
            this.toggleTask(task.id);
        });

        taskElement.querySelector('.edit-btn').addEventListener('click', () => {
            this.editTask(task.id);
        });

        taskElement.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteTask(task.id);
        });

        return taskElement;
    }

    updateTaskCount() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        this.taskCount.textContent = `${totalTasks} tasks • ${completedTasks} completed`;
    }

    toggleTheme() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        this.editTaskText.value = task.text;
        // Format the date-time for the input
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            // Format date to YYYY-MM-DDThh:mm
            const formattedDate = date.toISOString().slice(0, 16);
            this.editTaskDueDate.value = formattedDate;
        } else {
            this.editTaskDueDate.value = '';
        }
        this.editTaskPriority.value = task.priority;
        this.editTaskNotes.value = task.notes || '';
        this.editModal.dataset.taskId = id;
        this.openModal();
    }

    saveEdit() {
        const id = Number(this.editModal.dataset.taskId);
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        // Add validation
        if (!this.editTaskText.value.trim()) {
            alert('Task text cannot be empty');
            return;
        }

        task.text = this.editTaskText.value.trim();
        task.dueDate = this.editTaskDueDate.value;
        task.priority = this.editTaskPriority.value;
        task.notes = this.editTaskNotes.value.trim();

        this.saveTasks();
        this.updateProgress();
        this.renderTasks();
        this.closeModal();
    }

    openModal() {
        this.editModal.classList.add('active');
    }

    closeModal() {
        const editModal = document.getElementById('editModal');
        const categoryModal = document.getElementById('categoryModal');
        
        // Fix: Reset all form fields
        if (editModal.classList.contains('active')) {
            this.editTaskText.value = '';
            this.editTaskDueDate.value = '';
            this.editTaskPriority.value = 'low';
            this.editTaskNotes.value = '';
        }

        const nameInput = document.getElementById('categoryName');
        if (nameInput) {
            nameInput.value = '';
            nameInput.classList.remove('invalid-input');
        }

        editModal.classList.remove('active');
        categoryModal.classList.remove('active');
    }

    sortTasks(tasks) {
        return tasks.sort((a, b) => {
            switch(this.currentSort) {
                case 'due':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'name':
                    return a.text.localeCompare(b.text);
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
    }

    updateProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
    }

    openCategoryModal() {
        this.categoryModal.classList.add('active');
    }

    saveCategory() {
        const nameInput = document.getElementById('categoryName');
        const name = nameInput.value.trim();

        // Validate
        const error = this.validateCategoryName(name);
        if (error) {
            alert(error);
            nameInput.classList.add('invalid-input');
            return;
        }

        // Generate a random color from a predefined set of colors
        const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#2563eb'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const category = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            color: randomColor,
            icon: 'fas fa-folder' // Default icon
        };

        this.categories.push(category);
        this.saveCategories();
        this.renderCategories();
        this.closeModal();
    }

    renderCategories() {
        const categoriesBar = document.querySelector('.categories-bar');
        const addCategoryBtn = categoriesBar.querySelector('.add-category-btn');
        categoriesBar.innerHTML = `
            <button class="category-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                All Categories
            </button>
            ${this.categories.map(cat => `
                <button class="category-btn ${this.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                    ${cat.name}
                    <span class="delete-category" data-category-id="${cat.id}">&times;</span>
                </button>
            `).join('')}
        `;
        categoriesBar.appendChild(addCategoryBtn);

        // Update category select
        this.taskCategory.innerHTML = `
            <option value="none">No Category</option>
            ${this.categories.map(cat => `
                <option value="${cat.id}" ${this.currentCategory === cat.id ? 'selected' : ''}>
                    ${cat.name}
                </option>
            `).join('')}
        `;

        // Reattach event listeners
        this.categoryBtns = document.querySelectorAll('.category-btn');
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-category')) {
                    this.filterByCategory(e);
                }
            });
        });

        // Add delete category listeners
        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = e.target.dataset.categoryId;
                this.deleteCategory(categoryId);
            });
        });
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    deleteCategory(categoryId) {
        if (categoryId === 'all') return;
        
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        // Fix: Check if category has tasks before deletion
        const hasActiveTasks = this.tasks.some(task => 
            task.category === categoryId && !task.completed
        );

        let message = `Are you sure you want to delete the "${category.name}" category?`;
        if (hasActiveTasks) {
            message += '\nThis category contains active tasks that will be moved to "No Category".';
        }

        if (confirm(message)) {
            // Remove category
            this.categories = this.categories.filter(c => c.id !== categoryId);
            
            // Update tasks that had this category
            this.tasks = this.tasks.map(task => {
                if (task.category === categoryId) {
                    return { ...task, category: 'none' };
                }
                return task;
            });

            // Save changes
            this.saveCategories();
            this.saveTasks();
            
            // Reset category filter if we're viewing the deleted category
            if (this.currentCategory === categoryId) {
                this.currentCategory = 'all';
            }
            
            // Refresh UI
            this.renderCategories();
            this.renderTasks();
        }
    }

    validateCategoryName(name) {
        if (!name) return 'Category name is required';
        if (name.length < 2) return 'Category name must be at least 2 characters';
        if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            return 'Category with this name already exists';
        }
        return null;
    }

    getCategoryName(categoryId) {
        if (categoryId === 'none') return 'No Category';
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'No Category';
    }

    // Add helper method for empty messages
    getEmptyMessage() {
        if (this.searchQuery) {
            return `No tasks found matching "${this.searchQuery}"`;
        } else if (this.currentFilter === 'completed') {
            return 'No completed tasks yet';
        } else if (this.currentFilter === 'pending') {
            return 'No pending tasks';
        } else if (this.currentCategory !== 'all') {
            const category = this.categories.find(c => c.id === this.currentCategory);
            return `No tasks in ${category ? category.name : ''} category`;
        }
        return 'No tasks yet! Add a task to get started.';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
}); 