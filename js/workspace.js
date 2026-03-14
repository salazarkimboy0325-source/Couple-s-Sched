// Workspace Management
class WorkspaceManager {
    constructor(authManager) {
        this.auth = authManager;
        this.workspace = null;
        this.listeners = [];
    }

    initialize(workspace) {
        this.workspace = workspace;
        this.setupRealtimeListeners();
        this.updateUI();
    }

    setupRealtimeListeners() {
        // Listen to workspace changes
        const unsubscribe = workspacesCollection.doc(this.workspace.id)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.workspace = { id: doc.id, ...doc.data() };
                    this.handleWorkspaceUpdate();
                }
            });
        this.listeners.push(unsubscribe);

        // Listen to pairing code visibility
        document.getElementById('show-pairing-code').addEventListener('click', () => {
            if (this.workspace.status === 'pending') {
                document.getElementById('pairing-code-display').textContent = 
                    this.workspace.pairingCode;
                document.getElementById('pairing-modal').classList.remove('hidden');
            }
        });

        // Profile dropdown
        document.getElementById('profile-circle').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelector('.profile-dropdown').classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            document.querySelector('.profile-dropdown').classList.add('hidden');
        });

        // Unpair request
        document.getElementById('unpair-request').addEventListener('click', () => {
            this.auth.requestUnpair();
        });

        // Delete account
        document.getElementById('delete-account').addEventListener('click', () => {
            this.auth.deleteAccount();
        });

        // Close modals
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.add('hidden');
            });
        });
    }

    handleWorkspaceUpdate() {
        // Update UI based on workspace status
        if (this.workspace.status === 'paired' && this.workspace.members.length === 2) {
            this.showPairedUI();
        }

        // Update pairing code display
        if (this.workspace.status === 'pending') {
            document.getElementById('pairing-code').textContent = 
                `Code: ${this.workspace.pairingCode}`;
        } else {
            document.getElementById('pairing-code').textContent = 'Connected';
        }
    }

    showPairedUI() {
        // Enable all features when paired
        document.querySelectorAll('.paired-only').forEach(el => {
            el.classList.remove('disabled');
        });

        // Show partner's color
        const partnerId = this.workspace.members.find(id => id !== this.auth.currentUser.uid);
        if (partnerId) {
            const partnerColor = this.workspace.memberColors[partnerId];
            // Apply partner color to UI elements
        }
    }

    updateUI() {
        // Update workspace name if changed
        // This will be called when workspace is updated
    }

    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
    }
}