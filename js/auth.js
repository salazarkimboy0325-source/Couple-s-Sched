// Authentication and User Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentWorkspace = null;
        this.init();
    }

    init() {
        // Listen to auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserWorkspace();
            } else {
                this.showAuthScreen();
            }
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.tab}-form`).classList.add('active');
            });
        });

        // Join type radio
        document.querySelectorAll('input[name="join-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const pairingInput = document.getElementById('pairing-code-input');
                if (e.target.value === 'join') {
                    pairingInput.classList.remove('hidden');
                } else {
                    pairingInput.classList.add('hidden');
                }
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    }

    async register() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const joinType = document.querySelector('input[name="join-type"]:checked').value;
        const pairingCode = joinType === 'join' ? 
            document.querySelector('#pairing-code-input input').value : null;

        try {
            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile
            await user.updateProfile({
                displayName: name
            });

            // Create user document
            await usersCollection.doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                color: this.getRandomColor(),
                pairingCode: pairingCode
            });

            // Handle workspace
            if (joinType === 'create') {
                await this.createWorkspace(user);
            } else {
                await this.joinWorkspace(user, pairingCode);
            }

        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    }

    getRandomColor() {
        const colors = ['blue', 'pink'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async createWorkspace(user) {
        const pairingCode = this.generatePairingCode();
        
        const workspace = {
            name: `${user.displayName}'s Workspace`,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            pairingCode: pairingCode,
            status: 'pending',
            members: [user.uid],
            memberColors: {
                [user.uid]: 'blue'
            }
        };

        const docRef = await workspacesCollection.add(workspace);
        
        // Update user with workspace
        await usersCollection.doc(user.uid).update({
            workspaceId: docRef.id,
            workspaceRole: 'creator'
        });

        this.showPairingCode(pairingCode);
    }

    async joinWorkspace(user, pairingCode) {
        // Find workspace with pairing code
        const snapshot = await workspacesCollection
            .where('pairingCode', '==', pairingCode)
            .where('status', '==', 'pending')
            .get();

        if (snapshot.empty) {
            throw new Error('Invalid pairing code');
        }

        const workspaceDoc = snapshot.docs[0];
        const workspace = workspaceDoc.data();

        // Update workspace
        await workspaceDoc.ref.update({
            members: firebase.firestore.FieldValue.arrayUnion(user.uid),
            status: 'paired',
            memberColors: {
                ...workspace.memberColors,
                [user.uid]: 'pink'
            }
        });

        // Update user
        await usersCollection.doc(user.uid).update({
            workspaceId: workspaceDoc.id,
            workspaceRole: 'member'
        });
    }

    generatePairingCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async loadUserWorkspace() {
        try {
            const userDoc = await usersCollection.doc(this.currentUser.uid).get();
            const userData = userDoc.data();

            // Check if userData exists before accessing properties
            if (!userData) {
                console.warn('User document does not exist in Firestore');
                this.showAuthScreen();
                return;
            }

            if (userData.workspaceId) {
                const workspaceDoc = await workspacesCollection.doc(userData.workspaceId).get();
                if (workspaceDoc.exists) {
                    this.currentWorkspace = {
                        id: workspaceDoc.id,
                        ...workspaceDoc.data()
                    };
                    this.showDashboard();
                    window.app.initializeWorkspace(this.currentWorkspace);
                } else {
                    // Workspace no longer exists, show auth screen
                    console.warn('Workspace document does not exist');
                    this.showAuthScreen();
                }
            } else {
                // New user - show auth screen with workspace options
                this.showAuthScreen();
            }
        } catch (error) {
            console.error('Error loading user workspace:', error);
            this.showAuthScreen();
        }
    }

    showDashboard() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        
        // Update UI with user info
        document.getElementById('user-name').textContent = this.currentUser.displayName;
        document.getElementById('user-email').textContent = this.currentUser.email;
        document.getElementById('workspace-name').textContent = this.currentWorkspace.name;
        
        // Set profile circle color
        const color = this.currentWorkspace.memberColors[this.currentUser.uid];
        document.getElementById('profile-circle').style.background = 
            color === 'blue' ? 'linear-gradient(135deg, #2196f3, #1976d2)' : 
            'linear-gradient(135deg, #e91e63, #c2185b)';
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('dashboard-screen').classList.remove('active');
    }

    showPairingCode(code) {
        document.getElementById('pairing-code-display').textContent = code;
        document.getElementById('pairing-modal').classList.remove('hidden');
    }

    async logout() {
        try {
            await auth.signOut();
            window.location.reload();
        } catch (error) {
            alert('Logout failed: ' + error.message);
        }
    }

    async requestUnpair() {
        if (!this.currentWorkspace || this.currentWorkspace.status !== 'paired') return;

        const partnerId = this.currentWorkspace.members.find(id => id !== this.currentUser.uid);
        
        // Send unpair request to partner
        const request = {
            from: this.currentUser.uid,
            type: 'unpair',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            workspaceId: this.currentWorkspace.id
        };

        await db.collection('requests').add(request);
        alert('Unpair request sent to partner');
    }

    async deleteAccount() {
        if (!confirm('Are you sure? This will archive your workspace and delete your account.')) return;

        if (this.currentWorkspace && this.currentWorkspace.status === 'paired') {
            // Need partner approval
            const partnerId = this.currentWorkspace.members.find(id => id !== this.currentUser.uid);
            
            const request = {
                from: this.currentUser.uid,
                type: 'delete_account',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                workspaceId: this.currentWorkspace.id
            };

            await db.collection('requests').add(request);
            alert('Delete request sent to partner');
        } else {
            // Direct deletion for pending workspace
            await this.archiveWorkspace();
            await this.currentUser.delete();
            this.showAuthScreen();
        }
    }

    async archiveWorkspace() {
        if (!this.currentWorkspace) return;

        try {
            // Move to archive
            const workspaceData = {
                ...this.currentWorkspace,
                archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                archivedBy: this.currentUser.uid
            };

            await archivedWorkspacesCollection.doc(this.currentWorkspace.id).set(workspaceData);

            // Delete from active workspaces
            await workspacesCollection.doc(this.currentWorkspace.id).delete();

            // Update user
            await usersCollection.doc(this.currentUser.uid).update({
                workspaceId: null,
                workspaceRole: null
            });
        } catch (error) {
            console.error('Error archiving workspace:', error);
            throw error;
        }
    }
}
