import { fetchAllJobs, logAudit } from './database.js';
import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    try {
        await firebaseSignOut(auth);
        await logAudit(userEmail, "Sign out", { status: "Success" });
        window.location.href = "../login.html";
    } catch (error) {
        await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
        console.error("Error signing out:", error);
    }
}

// Add event listener to the sign-out button
document.getElementById('signOutBtn').addEventListener('click', performSignOut);

// Real time Job Count and Vacancies Count
document.addEventListener('DOMContentLoaded', () => {
    updateJobCount();
    updateVacanciesCount();
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
