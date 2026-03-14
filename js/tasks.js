// Tasks Management
class TasksManager {
    constructor(workspaceManager, calendarManager) {
        this.workspace = workspaceManager;
        this.calendar = calendarManager;
        this.tasks = [];
        this.listeners = [];
    }

    initialize() {
        this.setupEventListeners();
        this.loadTasks();
    }

    setupEventListeners() {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.showTaskModal();
        });

        // Task form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Task linked checkbox
        document.getElementById('task-linked').addEventListener('change', (e) => {
            const eventSelect = document.getElementById('task-event-link');
            eventSelect.classList.toggle('hidden', !e.target.checked);
            
            if (e.target.checked) {
                this.populateEventSelect();
            }
        });
    }

    loadTasks() {
        if (!this.workspace.workspace) return;

        const tasksRef = workspacesCollection
            .doc(this.workspace.workspace.id)
            .collection('tasks');

        const unsubscribe = tasksRef
            .orderBy('deadline', 'desc')
            .onSnapshot((snapshot) => {
                this.tasks = [];
                snapshot.forEach(doc => {
                    this.tasks.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderTasks();
            });

        this.listeners.push(unsubscribe);
    }

    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const currentUser = this.workspace.auth.currentUser.uid;

        if (this.tasks.length === 0) {
            tasksList.innerHTML = '<p class="no-tasks">No tasks yet</p>';
            return;
        }

        let html = '';
        this.tasks.forEach(task => {
            const color = this.workspace.workspace.memberColors[task.createdBy] === 'blue' ? 
                '#2196f3' : '#e91e63';
            
            const deadline = task.deadline ? 
                task.deadline.toDate().toLocaleDateString() : 'No deadline';

            html += `
                <div class="task-item ${task.completed ? 'completed' : ''}" 
                     data-task-id="${task.id}" 
                     style="border-left: 3px solid ${color}">
                    <input type="checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="window.app.tasks.toggleTask('${task.id}', this.checked)">
                    <div class="task-title">${task.title}</div>
                    <div class="task-deadline">${deadline}</div>
                    <button class="delete-task" onclick="window.app.tasks.deleteTask('${task.id}')">×</button>
                </div>
            `;
        });

        tasksList.innerHTML = html;
    }

    showTaskModal(taskId = null) {
        const modal = document.getElementById('task-modal');
        document.getElementById('task-modal-title').textContent = taskId ? 'Edit Task' : 'Add Task';

        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('task-title').value = task.title || '';
                document.getElementById('task-description').value = task.description || '';
                
                if (task.deadline) {
                    const deadline = task.deadline.toDate();
                    document.getElementById('task-deadline').value = 
                        this.calendar.formatDateForInput(deadline);
                }
                
                document.getElementById('task-linked').checked = task.linkedEvent || false;
                if (task.linkedEvent) {
                    document.getElementById('task-event-link').classList.remove('hidden');
                    this.populateEventSelect(task.linkedEvent);
                }
                
                modal.dataset.taskId = taskId;
            }
        } else {
            document.getElementById('task-form').reset();
            document.getElementById('task-event-link').classList.add('hidden');
            delete modal.dataset.taskId;
        }

        modal.classList.remove('hidden');
    }

    populateEventSelect(selectedEventId = null) {
        const select = document.getElementById('task-event-link');
        let options = '<option value="">Select Event</option>';
        
        this.calendar.events.forEach(event => {
            const selected = event.id === selectedEventId ? 'selected' : '';
            options += `<option value="${event.id}" ${selected}>${event.title}</option>`;
        });
        
        select.innerHTML = options;
    }

    async saveTask() {
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            deadline: document.getElementById('task-deadline').value ? 
                firebase.firestore.Timestamp.fromDate(
                    new Date(document.getElementById('task-deadline').value)
                ) : null,
            linkedEvent: document.getElementById('task-linked').checked ?
                document.getElementById('task-event-link').value : null,
            completed: false,
            createdBy: this.workspace.auth.currentUser.uid,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        const tasksRef = workspacesCollection
            .doc(this.workspace.workspace.id)
            .collection('tasks');

        const taskId = document.getElementById('task-modal').dataset.taskId;

        try {
            if (taskId) {
                await tasksRef.doc(taskId).update(taskData);
            } else {
                await tasksRef.add(taskData);
            }
            
            document.getElementById('task-modal').classList.add('hidden');
        } catch (error) {
            alert('Error saving task: ' + error.message);
        }
    }

    async toggleTask(taskId, completed) {
        try {
            await workspacesCollection
                .doc(this.workspace.workspace.id)
                .collection('tasks')
                .doc(taskId)
                .update({
                    completed: completed,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            alert('Error updating task: ' + error.message);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Delete this task?')) return;

        try {
            await workspacesCollection
                .doc(this.workspace.workspace.id)
                .collection('tasks')
                .doc(taskId)
                .delete();
        } catch (error) {
            alert('Error deleting task: ' + error.message);
        }
    }

    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
    }
}