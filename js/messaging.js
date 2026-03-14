// Messaging System
class MessagingManager {
    constructor(workspaceManager) {
        this.workspace = workspaceManager;
        this.messages = [];
        this.listeners = [];
    }

    initialize() {
        this.setupEventListeners();
        this.setupRealtimeListeners();
    }

    setupEventListeners() {
        // Send message
        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send
        document.getElementById('message-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    setupRealtimeListeners() {
        if (!this.workspace.workspace) return;

        const messagesRef = rtdb.ref(`messages/${this.workspace.workspace.id}`);
        
        // Load last 50 messages
        messagesRef.limitToLast(50).on('child_added', (snapshot) => {
            const message = {
                id: snapshot.key,
                ...snapshot.val()
            };
            this.messages.push(message);
            this.renderMessage(message);
            this.scrollToBottom();
        });

        // Listen for new messages
        messagesRef.limitToLast(1).on('child_added', (snapshot) => {
            // This will trigger for new messages, but we already handle child_added
            // We could add notification here
            const message = snapshot.val();
            if (message.createdBy !== this.workspace.auth.currentUser.uid) {
                this.showNotification('New Message', message.text);
            }
        });
    }

    async sendMessage() {
        const text = document.getElementById('message-text').value.trim();
        if (!text) return;

        const message = {
            text: text,
            createdBy: this.workspace.auth.currentUser.uid,
            createdByName: this.workspace.auth.currentUser.displayName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        try {
            await rtdb.ref(`messages/${this.workspace.workspace.id}`).push(message);
            document.getElementById('message-text').value = '';
        } catch (error) {
            alert('Error sending message: ' + error.message);
        }
    }

    renderMessage(message) {
        const messagesList = document.getElementById('messages-list');
        const isOwn = message.createdBy === this.workspace.auth.currentUser.uid;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.dataset.messageId = message.id;
        
        const time = message.timestamp ? 
            new Date(message.timestamp).toLocaleTimeString() : 'Just now';
        
        messageDiv.innerHTML = `
            <div class="message-sender">${isOwn ? 'You' : message.createdByName}</div>
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesList.appendChild(messageDiv);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const messagesList = document.getElementById('messages-list');
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    clearMessages() {
        document.getElementById('messages-list').innerHTML = '';
        this.messages = [];
    }

    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    async sendTaskMessage(taskId, taskTitle) {
        const message = {
            text: `🔔 Task updated: ${taskTitle}`,
            createdBy: 'system',
            createdByName: 'System',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            taskId: taskId
        };

        await rtdb.ref(`messages/${this.workspace.workspace.id}`).push(message);
    }

    async sendEventMessage(eventId, eventTitle) {
        const message = {
            text: `📅 Event: ${eventTitle}`,
            createdBy: 'system',
            createdByName: 'System',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            eventId: eventId
        };

        await rtdb.ref(`messages/${this.workspace.workspace.id}`).push(message);
    }

    cleanup() {
        // Remove realtime listeners
        if (this.workspace.workspace) {
            rtdb.ref(`messages/${this.workspace.workspace.id}`).off();
        }
        this.listeners.forEach(unsubscribe => unsubscribe());
    }
}
