// Main Application Controller
class App {
    constructor() {
        this.auth = new AuthManager();
        this.workspace = new WorkspaceManager(this.auth);
        this.calendar = new CalendarManager(this.workspace);
        this.tasks = new TasksManager(this.workspace, this.calendar);
        this.timer = new TimerManager(this.workspace);
        this.messaging = new MessagingManager(this.workspace);
        
        this.init();
    }

    init() {
        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Initialize all managers after auth
        // This will be called from AuthManager when workspace is loaded
    }

    initializeWorkspace(workspace) {
        this.workspace.initialize(workspace);
        this.calendar.initialize();
        this.tasks.initialize();
        this.timer.initialize();
        this.messaging.initialize();
    }

    // Clean up on page unload
    cleanup() {
        this.calendar.cleanup();
        this.tasks.cleanup();
        this.timer.cleanup();
        this.messaging.cleanup();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});