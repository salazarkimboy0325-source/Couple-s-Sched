// Timer, Alarm, and Stopwatch Management
class TimerManager {
    constructor(workspaceManager) {
        this.workspace = workspaceManager;
        this.timerInterval = null;
        this.stopwatchInterval = null;
        this.timerTime = 0;
        this.stopwatchTime = 0;
        this.stopwatchLaps = [];
        this.alarms = [];
        this.listeners = [];
    }

    initialize() {
        this.setupEventListeners();
        this.setupRealtimeListeners();
        this.loadAlarms();
    }

    setupEventListeners() {
        // Tool tabs
        document.querySelectorAll('.tool-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.tool}-section`).classList.add('active');
            });
        });

        // Timer controls
        document.getElementById('timer-start').addEventListener('click', () => this.startTimer());
        document.getElementById('timer-pause').addEventListener('click', () => this.pauseTimer());
        document.getElementById('timer-reset').addEventListener('click', () => this.resetTimer());

        // Stopwatch controls
        document.getElementById('stopwatch-start').addEventListener('click', () => this.startStopwatch());
        document.getElementById('stopwatch-pause').addEventListener('click', () => this.pauseStopwatch());
        document.getElementById('stopwatch-reset').addEventListener('click', () => this.resetStopwatch());
        document.getElementById('stopwatch-lap').addEventListener('click', () => this.recordLap());

        // Alarm
        document.getElementById('set-alarm').addEventListener('click', () => this.setAlarm());
    }

    setupRealtimeListeners() {
        if (!this.workspace.workspace) return;

        // Listen to timer updates
        const timerRef = rtdb.ref(`timers/${this.workspace.workspace.id}`);
        timerRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.timer) {
                    this.timerTime = data.timer.time || 0;
                    if (data.timer.isRunning) {
                        this.startTimer(true);
                    } else {
                        this.updateTimerDisplay();
                    }
                }
                if (data.stopwatch) {
                    this.stopwatchTime = data.stopwatch.time || 0;
                    this.stopwatchLaps = data.stopwatch.laps || [];
                    if (data.stopwatch.isRunning) {
                        this.startStopwatch(true);
                    } else {
                        this.updateStopwatchDisplay();
                    }
                    this.renderLaps();
                }
            }
        });

        // Listen to alarms
        const alarmsRef = rtdb.ref(`alarms/${this.workspace.workspace.id}`);
        alarmsRef.on('child_added', (snapshot) => {
            this.alarms.push({
                id: snapshot.key,
                ...snapshot.val()
            });
            this.renderAlarms();
        });

        alarmsRef.on('child_changed', (snapshot) => {
            const index = this.alarms.findIndex(a => a.id === snapshot.key);
            if (index !== -1) {
                this.alarms[index] = { id: snapshot.key, ...snapshot.val() };
                this.renderAlarms();
            }
        });

        alarmsRef.on('child_removed', (snapshot) => {
            this.alarms = this.alarms.filter(a => a.id !== snapshot.key);
            this.renderAlarms();
        });
    }

    loadAlarms() {
        if (!this.workspace.workspace) return;
        
        const alarmsRef = rtdb.ref(`alarms/${this.workspace.workspace.id}`);
        alarmsRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.alarms = Object.entries(data).map(([id, alarm]) => ({
                    id,
                    ...alarm
                }));
                this.renderAlarms();
            }
        });
    }

    // Timer Methods
    startTimer(sync = false) {
        if (!sync) {
            // Broadcast to other user
            rtdb.ref(`timers/${this.workspace.workspace.id}/timer`).update({
                isRunning: true,
                time: this.timerTime,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
        }

        if (this.timerInterval) return;

        this.timerInterval = setInterval(() => {
            if (this.timerTime > 0) {
                this.timerTime--;
                this.updateTimerDisplay();

                if (this.timerTime === 0) {
                    this.timerComplete();
                }
            }
        }, 1000);
    }

    pauseTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        rtdb.ref(`timers/${this.workspace.workspace.id}/timer`).update({
            isRunning: false,
            time: this.timerTime,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        const minutes = parseInt(document.getElementById('timer-minutes').value) || 5;
        this.timerTime = minutes * 60;
        this.updateTimerDisplay();

        rtdb.ref(`timers/${this.workspace.workspace.id}/timer`).set({
            isRunning: false,
            time: this.timerTime,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timerTime / 60);
        const seconds = this.timerTime % 60;
        document.getElementById('timer-display').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    timerComplete() {
        this.pauseTimer();
        this.showNotification('Timer Complete!', 'Your timer has finished.');
    }

    // Stopwatch Methods
    startStopwatch(sync = false) {
        if (!sync) {
            rtdb.ref(`timers/${this.workspace.workspace.id}/stopwatch`).update({
                isRunning: true,
                time: this.stopwatchTime,
                laps: this.stopwatchLaps,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
        }

        if (this.stopwatchInterval) return;

        const startTime = Date.now() - (this.stopwatchTime * 1000);

        this.stopwatchInterval = setInterval(() => {
            this.stopwatchTime = Math.floor((Date.now() - startTime) / 1000);
            this.updateStopwatchDisplay();
        }, 100);
    }

    pauseStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;

        rtdb.ref(`timers/${this.workspace.workspace.id}/stopwatch`).update({
            isRunning: false,
            time: this.stopwatchTime,
            laps: this.stopwatchLaps,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
    }

    resetStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
        this.stopwatchTime = 0;
        this.stopwatchLaps = [];
        this.updateStopwatchDisplay();
        this.renderLaps();

        rtdb.ref(`timers/${this.workspace.workspace.id}/stopwatch`).set({
            isRunning: false,
            time: 0,
            laps: [],
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
    }

    recordLap() {
        this.stopwatchLaps.push(this.stopwatchTime);
        this.renderLaps();

        rtdb.ref(`timers/${this.workspace.workspace.id}/stopwatch/laps`).set(this.stopwatchLaps);
    }

    updateStopwatchDisplay() {
        const hours = Math.floor(this.stopwatchTime / 3600);
        const minutes = Math.floor((this.stopwatchTime % 3600) / 60);
        const seconds = this.stopwatchTime % 60;
        document.getElementById('stopwatch-display').textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    renderLaps() {
        const lapsList = document.getElementById('laps-list');
        if (this.stopwatchLaps.length === 0) {
            lapsList.innerHTML = '';
            return;
        }

        let html = '<h4>Laps</h4>';
        this.stopwatchLaps.forEach((lap, index) => {
            const minutes = Math.floor(lap / 60);
            const seconds = lap % 60;
            html += `<div class="lap-item">Lap ${index + 1}: ${minutes}:${String(seconds).padStart(2, '0')}</div>`;
        });

        lapsList.innerHTML = html;
    }

    // Alarm Methods
    async setAlarm() {
        const time = document.getElementById('alarm-time').value;
        if (!time) return;

        const alarm = {
            time: time,
            label: document.getElementById('alarm-label').value || 'Alarm',
            repeat: document.getElementById('alarm-repeat').value,
            createdBy: this.workspace.auth.currentUser.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            active: true
        };

        try {
            const alarmRef = rtdb.ref(`alarms/${this.workspace.workspace.id}`).push();
            await alarmRef.set(alarm);

            // Schedule notification
            this.scheduleAlarm(alarmRef.key, alarm);

            // Clear form
            document.getElementById('alarm-time').value = '';
            document.getElementById('alarm-label').value = '';
        } catch (error) {
            alert('Error setting alarm: ' + error.message);
        }
    }

    scheduleAlarm(alarmId, alarm) {
        const [hours, minutes] = alarm.time.split(':');
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (alarmTime < now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
        }

        const timeUntilAlarm = alarmTime - now;

        setTimeout(() => {
            this.triggerAlarm(alarmId, alarm);
        }, timeUntilAlarm);
    }

    triggerAlarm(alarmId, alarm) {
        this.showNotification(alarm.label, 'Alarm is ringing!');
        
        // Handle repeat
        if (alarm.repeat !== 'none') {
            this.scheduleAlarm(alarmId, alarm);
        }
    }

    async toggleAlarm(alarmId, active) {
        await rtdb.ref(`alarms/${this.workspace.workspace.id}/${alarmId}`).update({
            active: active
        });
    }

    async deleteAlarm(alarmId) {
        await rtdb.ref(`alarms/${this.workspace.workspace.id}/${alarmId}`).remove();
    }

    renderAlarms() {
        const alarmsList = document.getElementById('alarms-list');
        
        if (this.alarms.length === 0) {
            alarmsList.innerHTML = '<p>No alarms set</p>';
            return;
        }

        let html = '';
        this.alarms.forEach(alarm => {
            const color = this.workspace.workspace.memberColors[alarm.createdBy] === 'blue' ? 
                '#2196f3' : '#e91e63';
            
            html += `
                <div class="alarm-item ${alarm.active ? 'active' : ''}" style="border-left: 3px solid ${color}">
                    <div>
                        <strong>${alarm.label}</strong><br>
                        <small>${alarm.time} (${alarm.repeat})</small>
                    </div>
                    <div>
                        <button onclick="window.app.timer.toggleAlarm('${alarm.id}', ${!alarm.active})">
                            ${alarm.active ? '🔔' : '🔕'}
                        </button>
                        <button onclick="window.app.timer.deleteAlarm('${alarm.id}')">🗑️</button>
                    </div>
                </div>
            `;
        });

        alarmsList.innerHTML = html;
    }

    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    }

    cleanup() {
        clearInterval(this.timerInterval);
        clearInterval(this.stopwatchInterval);
    }
}