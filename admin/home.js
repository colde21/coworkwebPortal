import { fetchAllJobs, logAudit, exportAuditLog } from './database.js';
import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
  
// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    firebaseSignOut(auth).then(() => {
        logAudit(userEmail, "Sign out", { status: "Success" });
        window.location.href = "../login.html";
    }).catch((error) => {
        logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
        console.error("Error signing out:", error);
    });
}

// Add event listener to the sign-out button
document.getElementById('signOutBtn').addEventListener('click', performSignOut);
// Sign out button 

// Real-time Job Count and Vacancies Count
document.addEventListener('DOMContentLoaded', () => {
    updateJobCount();
    updateVacanciesCount();
    updateApplicationCount();
    updateEmployedCount();
});

function updateJobCount() {
    fetchAllJobs().then(jobs => {
        let count = jobs.length;
        document.getElementById('jobCount').textContent = `Total: ${count}`;
    }).catch(error => {
        console.error("Error fetching jobs:", error);
        document.getElementById('jobCount').textContent = `Failed to load jobs.`;
    });
}

function updateVacanciesCount() {
    fetchAllJobs().then(jobs => {
        let totalVacancies = jobs.reduce((sum, job) => sum + (parseInt(job.vacancy, 10) || 0), 0);
        document.getElementById('vacanciesCount').textContent = `Total: ${totalVacancies}`;
    }).catch(error => {
        console.error("Error fetching jobs:", error);
        document.getElementById('vacanciesCount').textContent = `Failed to load vacancies.`;
    });
}

function updateApplicationCount() {
    const applicationCol = collection(firestore, 'applied');
    onSnapshot(applicationCol, (snapshot) => {
        let count = snapshot.size;  // Get the number of documents
        document.getElementById('applicationCount').textContent = `Total: ${count}`;
    }, (error) => {
        console.error("Error fetching applications:", error);
        document.getElementById('applicationCount').textContent = `Failed to load applications.`;
    });
}

function updateEmployedCount() {
    const employedCol = collection(firestore, 'employed');
    onSnapshot(employedCol, (snapshot) => {
        let count = snapshot.size;  // Get the number of documents
        document.getElementById('employedCount').textContent = `Total: ${count}`;
    }, (error) => {
        console.error("Error fetching employed count:", error);
        document.getElementById('employedCount').textContent = `Failed to load employed count.`;
    });
}
