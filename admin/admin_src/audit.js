import { exportAuditLog, logAudit } from './database.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDfARYPh7OupPRZvY5AWA7u_vXyXfiX_kg",
    authDomain: "cowork-195c0.firebaseapp.com",
    databaseURL: "https://cowork-195c0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cowork-195c0",
    storageBucket: "cowork-195c0.appspot.com",
    messagingSenderId: "151400704939",
    appId: "1:151400704939:web:934d6d15c66390055440ee",
    measurementId: "G-8DL6T09CP4"
};

// Initialize Firebase app
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
let logs = []; // To store all fetched logs
let currentPage = 1;
const recordsPerPage = 15;

// Ensure the user is authenticated before accessing the page
function requireLogin() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/login.html';
        } else {
            console.log("Page Accessed.");
        }
    });
}
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';

    try {
        // Parse the timestamp string into a Date object
        const date = new Date(Date.parse(timestamp));

        // Ensure the parsed date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        };

        return date.toLocaleString('en-US', options);
    } catch (error) {
        console.error("Error parsing timestamp:", error);
        return 'Invalid Date';
    }
}
//Navigation
document.getElementById('homeButton').addEventListener('click', function () {
    location.href = 'home.html';
});

document.getElementById('jobButton').addEventListener('click', function () {
    location.href = 'job.html';
});

document.getElementById('appButton').addEventListener('click', function () {
    location.href = 'app.html';
});

document.getElementById('archiveButton').addEventListener('click', function () {
    location.href = 'archive.html';
});
document.getElementById('auditButton').addEventListener('click', function () {
    location.href = 'audit.html';
});

// Assuming the sign-out functionality is handled in the same JavaScript file
document.getElementById('signOutBtn').addEventListener('click', function () {
    console.log('Sign out button clicked');
});
async function performSignOut() {
    const signOutConfirmation = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    signOutConfirmation.style.display = 'flex';

    confirmSignOutBtn.addEventListener('click', async function() {
        signOutConfirmation.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'flex';

        try {
            const user = auth.currentUser;

            if (!user) {
                throw new Error("No authenticated user found.");
            }

            const userEmail = user.email;
            await logAudit(userEmail, "Sign out", { status: "Success" });
            await firebaseSignOut(auth);
            window.location.href = "/login.html";
        } catch (error) {
            console.error("Error during sign-out:", error);
            const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
            await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            alert(error.message || 'Sign out failed. Please try again.');
        } finally {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    });

    cancelSignOutBtn.addEventListener('click', function() {
        signOutConfirmation.style.display = 'none';
    });
}
// Fetch audit logs from Firestore
async function fetchAuditLogs() {
    try {
        const querySnapshot = await getDocs(collection(firestore, 'auditLogs'));
        logs = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // Sort logs by timestamp (descending order)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        displayLogs(); // Display logs with pagination
    } catch (error) {
        console.error('Error fetching audit logs:', error);
    }
}
// Display logs with pagination
function displayLogs() {
    const tableBody = document.getElementById('auditTable').querySelector('tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, logs.length);

    logs
        .sort((a, b) => new Date(b.details.timestamp) - new Date(a.details.timestamp)) // Sort by most recent first
        .slice(startIndex, endIndex)
        .forEach((log, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${formatTimestamp(log.details.timestamp) || 'N/A'}</td>
                <td>${log.user || 'N/A'}</td>
                <td>${log.action || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });

    updatePaginationControls();
}
// Pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(logs.length / recordsPerPage);
    const paginationDiv = document.getElementById('paginationControls');
    paginationDiv.innerHTML = '';

    // Previous button
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.addEventListener('click', () => {
            currentPage--;
            displayLogs();
        });
        paginationDiv.appendChild(prevButton);
    }

       // Next button
       if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => {
            currentPage++;
            displayLogs();
        });
        paginationDiv.appendChild(nextButton);
    }

    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationDiv.appendChild(pageIndicator);
}
// Export logs to Excel
document.getElementById('exportAuditLogBtn').addEventListener('click', () => {
    exportAuditLog().then((csvContent) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'audit_log.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch((error) => {
        console.error("Error exporting audit log:", error);
    });
});

document.addEventListener('DOMContentLoaded', async() => {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }
    requireLogin();
    await fetchAuditLogs();
});

