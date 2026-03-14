// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBe6YCfVtnMFaVdi_I9FVXab_z1gUF9_Q4",
    authDomain: "couple-website-30e9a.firebaseapp.com",
    databaseURL: "https://couple-website-30e9a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "couple-website-30e9a",
    storageBucket: "couple-website-30e9a.firebasestorage.app",
    messagingSenderId: "573369941326",
    appId: "1:573369941326:web:8d3e386ad89fceb639f21f",
    measurementId: "G-GBWY8DHFFM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

// Enable persistence for offline support
// Only enable if the browser supports it
if (!window.indexedDB) {
    console.log('IndexedDB not supported, running without persistence');
} else {
    // Check if we recently cleared IndexedDB to avoid infinite reload loop
    const recentlyCleared = sessionStorage.getItem('firebase_cache_cleared');
    if (recentlyCleared) {
        console.log('Recently cleared cache, skipping persistence attempt');
        sessionStorage.removeItem('firebase_cache_cleared');
    } else {
        db.enablePersistence({ synchronizeTabs: false })
            .then(() => {
                console.log('Firestore persistence enabled');
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    const errorMsg = err.message || '';
                    if (errorMsg.includes('previously used') || 
                        errorMsg.includes('version mismatch') ||
                        errorMsg.includes('newer version')) {
                        // SDK version mismatch - the persisted data is incompatible
                        console.warn('Firestore SDK version mismatch - persistence disabled. Clear IndexedDB to enable.');
                        // Try to auto-clear and reload
                        autoClearAndReload();
                    } else {
                        console.log('Multiple tabs open, persistence enabled in single tab');
                    }
                } else if (err.code === 'unimplemented') {
                    console.log('Browser doesn\'t support persistence');
                } else {
                    console.warn('Firestore persistence error:', err.message || err.code);
                }
            });
    }
}

// Function to auto-clear IndexedDB and reload
async function autoClearAndReload() {
    console.log('Attempting to clear IndexedDB...');
    
    // List of known Firebase/Firestore IndexedDB databases
    const databases = [
        'firebaseLocalStorageDb',
        'firestore_data',
        'firestore_db',
        '__firebase_local_index_db'
    ];
    
    // Create an array of promises for all deletion operations
    const deletionPromises = databases.map(dbName => {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => {
                    console.log(`Deleted database: ${dbName}`);
                    resolve();
                };
                request.onerror = () => {
                    console.log(`Error deleting database: ${dbName}`);
                    resolve(); // Resolve anyway to continue
                };
                request.onblocked = () => {
                    console.log(`Database blocked for deletion: ${dbName}`);
                    resolve();
                };
            } catch (err) {
                console.log(`Could not delete database ${dbName}:`, err);
                resolve();
            }
        });
    });
    
    // Also try clearing via localStorage
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('firebase') || key.includes('firestore'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed localStorage: ${key}`);
        });
    } catch (err) {
        console.log('Error clearing localStorage:', err);
    }
    
    // Wait for all IndexedDB deletions to complete
    await Promise.all(deletionPromises);
    
    // Set flag to prevent infinite reload loop
    sessionStorage.setItem('firebase_cache_cleared', 'true');
    
    // Add a small delay to ensure everything is cleaned up
    setTimeout(() => {
        console.log('Reloading page after cache clear...');
        window.location.reload();
    }, 1000);
}

// Function to show persistence error to users
function showPersistenceError() {
    const existingAlert = document.getElementById('persistence-error-alert');
    if (existingAlert) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.id = 'persistence-error-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff9800;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;
    alertDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Firestore Offline Mode Disabled</div>
        <div style="margin-bottom: 12px;">Your browser has cached data from a different app version. Clear your browser's IndexedDB to enable offline support.</div>
        <button onclick="clearIndexedDB()" style="
            background: white;
            color: #ff9800;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">Clear Cache & Reload</button>
    `;
    document.body.appendChild(alertDiv);
}

// Function to clear IndexedDB and reload
async function clearIndexedDB() {
    const databases = [
        'firebaseLocalStorageDb',
        'firestore_data',
        'firestore_db',
        '__firebase_local_index_db'
    ];
    
    const deletionPromises = databases.map(dbName => {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => {
                    console.log(`Deleted database: ${dbName}`);
                    resolve();
                };
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
            } catch (err) {
                console.log(`Could not delete database ${dbName}:`, err);
                resolve();
            }
        });
    });
    
    await Promise.all(deletionPromises);
    
    // Show success message
    alert('Cache cleared! The page will now reload.');
    window.location.reload();
}

// Collection references
const usersCollection = db.collection('users');
const workspacesCollection = db.collection('workspaces');
const archivedWorkspacesCollection = db.collection('archived_workspaces');

// Real-time database references
const timersRef = rtdb.ref('timers');
const messagesRef = rtdb.ref('messages');
const alarmsRef = rtdb.ref('alarms');