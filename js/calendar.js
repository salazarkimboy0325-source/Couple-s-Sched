// Calendar and Events Management
class CalendarManager {
    constructor(workspaceManager) {
        this.workspace = workspaceManager;
        this.currentDate = new Date();
        this.events = [];
        this.listeners = [];
    }

    initialize() {
        this.setupEventListeners();
        this.loadEvents();
        this.renderMiniCalendar();
        this.renderMainCalendar();
    }

    setupEventListeners() {
        // Mini calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderMiniCalendar();
            this.renderMainCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderMiniCalendar();
            this.renderMainCalendar();
        });

        // Add event button
        document.getElementById('add-event-btn').addEventListener('click', () => {
            this.showEventModal();
        });

        // Event form submission
        document.getElementById('event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Today button
        document.getElementById('today-btn').addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderMiniCalendar();
            this.renderMainCalendar();
        });

        // Repeat checkbox
        document.getElementById('event-repeat').addEventListener('change', (e) => {
            document.getElementById('event-repeat-type').classList.toggle('hidden', !e.target.checked);
        });
    }

    loadEvents() {
        if (!this.workspace.workspace) return;

        const eventsRef = workspacesCollection
            .doc(this.workspace.workspace.id)
            .collection('events');

        const unsubscribe = eventsRef
            .orderBy('start')
            .onSnapshot((snapshot) => {
                this.events = [];
                snapshot.forEach(doc => {
                    this.events.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderMainCalendar();
                this.renderMiniCalendar();
            });

        this.listeners.push(unsubscribe);
    }

    renderMiniCalendar() {
        const grid = document.getElementById('mini-calendar-grid');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        let html = '';
        
        // Day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            html += `<div class="day-header">${day}</div>`;
        });

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay.getDay(); i++) {
            html += '<div></div>';
        }

        // Days of month
        const today = new Date();
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), d);
            const hasEvent = this.events.some(event => {
                const eventDate = event.start.toDate ? event.start.toDate() : new Date(event.start);
                return eventDate.toDateString() === date.toDateString();
            });

            const isToday = date.toDateString() === today.toDateString();
            
            html += `<div class="${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${d}</div>`;
        }

        grid.innerHTML = html;
    }

    renderMainCalendar() {
        const grid = document.getElementById('calendar-grid');
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        let html = '';
        
        // Day headers
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => {
            html += `<div class="day-header">${day}</div>`;
        });

        // Empty cells
        for (let i = 0; i < firstDay.getDay(); i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days
        const today = new Date();
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), d);
            const isToday = date.toDateString() === today.toDateString();
            
            // Get events for this day
            const dayEvents = this.events.filter(event => {
                const eventDate = event.start.toDate ? event.start.toDate() : new Date(event.start);
                return eventDate.toDateString() === date.toDateString();
            });

            html += `<div class="calendar-day ${isToday ? 'today' : ''}">`;
            html += `<div class="day-number">${d}</div>`;
            
            dayEvents.forEach(event => {
                const color = this.workspace.workspace.memberColors[event.createdBy] === 'blue' ? 
                    '#2196f3' : '#e91e63';
                html += `<div class="event-indicator" style="background: ${color}" 
                            onclick="window.app.calendar.editEvent('${event.id}')">
                            ${event.title}
                         </div>`;
            });
            
            html += '</div>';
        }

        grid.innerHTML = html;
    }

    showEventModal(eventId = null) {
        const modal = document.getElementById('event-modal');
        document.getElementById('modal-title').textContent = eventId ? 'Edit Event' : 'Add Event';
        
        if (eventId) {
            const event = this.events.find(e => e.id === eventId);
            if (event) {
                document.getElementById('event-title').value = event.title || '';
                document.getElementById('event-description').value = event.description || '';
                
                // Format dates for input
                const start = event.start.toDate ? event.start.toDate() : new Date(event.start);
                const end = event.end.toDate ? event.end.toDate() : new Date(event.end);
                
                document.getElementById('event-start').value = 
                    this.formatDateForInput(start);
                document.getElementById('event-end').value = 
                    this.formatDateForInput(end);
                
                document.getElementById('event-repeat').checked = event.repeat || false;
                if (event.repeat) {
                    document.getElementById('event-repeat-type').value = event.repeatType || 'daily';
                    document.getElementById('event-repeat-type').classList.remove('hidden');
                }
                
                // Store event ID for update
                modal.dataset.eventId = eventId;
            }
        } else {
            // Reset form
            document.getElementById('event-form').reset();
            delete modal.dataset.eventId;
            
            // Set default times
            const now = new Date();
            const end = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
            
            document.getElementById('event-start').value = this.formatDateForInput(now);
            document.getElementById('event-end').value = this.formatDateForInput(end);
        }

        modal.classList.remove('hidden');
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async saveEvent() {
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            start: firebase.firestore.Timestamp.fromDate(
                new Date(document.getElementById('event-start').value)
            ),
            end: firebase.firestore.Timestamp.fromDate(
                new Date(document.getElementById('event-end').value)
            ),
            repeat: document.getElementById('event-repeat').checked,
            repeatType: document.getElementById('event-repeat-type').value,
            createdBy: this.workspace.auth.currentUser.uid,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        const eventsRef = workspacesCollection
            .doc(this.workspace.workspace.id)
            .collection('events');

        const eventId = document.getElementById('event-modal').dataset.eventId;

        try {
            if (eventId) {
                await eventsRef.doc(eventId).update(eventData);
            } else {
                await eventsRef.add(eventData);
            }
            
            document.getElementById('event-modal').classList.add('hidden');
        } catch (error) {
            alert('Error saving event: ' + error.message);
        }
    }

    editEvent(eventId) {
        this.showEventModal(eventId);
    }

    async deleteEvent(eventId) {
        if (!confirm('Delete this event?')) return;

        try {
            await workspacesCollection
                .doc(this.workspace.workspace.id)
                .collection('events')
                .doc(eventId)
                .delete();
        } catch (error) {
            alert('Error deleting event: ' + error.message);
        }
    }

    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
    }
}