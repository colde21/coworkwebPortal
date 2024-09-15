import { fetchAllJobs } from './database.js';
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

// Real-time Job Count and Vacancies Count
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardData();
});

function updateDashboardData() {
    Promise.all([fetchAllJobs(), updateApplicationCount(), updateEmployedCount()])
    .then(([jobs, applicationCount, employedCount]) => {
        const companyData = aggregateByCompany(jobs);
        const positionData = aggregateByPosition(jobs);
        const jobCount = jobs.length;
        const vacanciesCount = jobs.reduce((sum, job) => sum + (parseInt(job.vacancy, 10) || 0), 0);

        // Update the counts on the UI
        updateJobCount(jobCount);
        updateVacanciesCount(vacanciesCount);

        // Create the chart only after all the counts are available
        createChart(companyData, positionData, jobCount, vacanciesCount, employedCount, applicationCount);
    })
    .catch(error => {
        console.error("Error updating dashboard:", error);
    });

}

// Update job count
function updateJobCount(count) {
    document.getElementById('jobCount').textContent = `Total: ${count}`;
}

// Update vacancies count
function updateVacanciesCount(count) {
    document.getElementById('vacanciesCount').textContent = `Total: ${count}`;
}

// Application count
function updateApplicationCount() {
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

// Employed count
function updateEmployedCount() {
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

// Aggregate job data by company
function aggregateByCompany(jobs) {
    const companyCounts = {};
    jobs.forEach(job => {
        const company = job.company || 'Unknown';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
    });
    return companyCounts;
}

// Aggregate job data by position
function aggregateByPosition(jobs) {
    const positionCounts = {};
    jobs.forEach(job => {
        const position = job.position || 'Unknown';
        positionCounts[position] = (positionCounts[position] || 0) + 1;
    });
    return positionCounts;
}

// Create chart using Chart.js
function createChart(companyData, positionData, jobCount, vacanciesCount, employedCount, applicationCount) {
    const ctx = document.getElementById('summaryChart').getContext('2d');
    
    const companyLabels = Object.keys(companyData);
    const companyValues = Object.values(companyData);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jobs', 'Applications', 'Employed', 'Vacancies'],
            datasets: [{
                label: 'Summary',
                data: [jobCount, applicationCount,  employedCount, vacanciesCount],

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