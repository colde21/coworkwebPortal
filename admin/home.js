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

function performSignOut() { //Sign out Function 
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
document.getElementById('signOutBtn').addEventListener('click', performSignOut); // Sign out button 



document.addEventListener('DOMContentLoaded', () => 
    { // Real-time Job Count and Vacancies Count
    updateDashboardData();
});
function updateDashboardData() { //Update Dashboard 
    Promise.all([updateJobCount(), updateVacanciesCount(), updateApplicationCount(), updateEmployedCount()])
        .then(([jobCount, vacanciesCount, applicationCount, employedCount]) => {
            createChart(jobCount, applicationCount, employedCount, vacanciesCount);
        })
        .catch(error => {
            console.error("Error updating dashboard:", error);
        });
}

function updateJobCount() { //Update Job Count
    return fetchAllJobs().then(jobs => {
        let count = jobs.length;
        document.getElementById('jobCount').textContent = `Total: ${count}`;
        return count;
    }).catch(error => {
        console.error("Error fetching jobs:", error);
        document.getElementById('jobCount').textContent = `Failed to load jobs.`;
        return 0;
    });
}

function updateVacanciesCount() { //Update Vacancies Count
    return fetchAllJobs().then(jobs => {
        let totalVacancies = jobs.reduce((sum, job) => sum + (parseInt(job.vacancy, 10) || 0), 0);
        document.getElementById('vacanciesCount').textContent = `Total: ${totalVacancies}`;
        return totalVacancies;
    }).catch(error => {
        console.error("Error fetching vacancies:", error);
        document.getElementById('vacanciesCount').textContent = `Failed to load vacancies.`;
        return 0;
    });
}

function updateApplicationCount() { //Update Application Count
    return new Promise((resolve, reject) => {
        const applicationCol = collection(firestore, 'applied');
        onSnapshot(applicationCol, (snapshot) => {
            let count = snapshot.size;
            document.getElementById('applicationCount').textContent = `Total: ${count}`;
            resolve(count);
        }, (error) => {
            console.error("Error fetching applications:", error);
            document.getElementById('applicationCount').textContent = `Failed to load applications.`;
            reject(error);
        });
    });
}

function updateEmployedCount() { //Update Employed Count
    return new Promise((resolve, reject) => {
        const employedCol = collection(firestore, 'employed');
        onSnapshot(employedCol, (snapshot) => {
            let count = snapshot.size;
            document.getElementById('employedCount').textContent = `Total: ${count}`;
            resolve(count);
        }, (error) => {
            console.error("Error fetching employed count:", error);
            document.getElementById('employedCount').textContent = `Failed to load employed count.`;
            reject(error);
        });
    });
}

// Chart creation function using Chart.js
function createChart(jobCount, applicationCount, employedCount, vacanciesCount) {
    const ctx = document.getElementById('summaryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jobs', 'Applications', 'Employed', 'Vacancies'],
            datasets: [{
                label: 'Total',
                data: [jobCount, applicationCount, employedCount, vacanciesCount],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
