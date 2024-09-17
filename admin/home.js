import { fetchAllJobs, logAudit, exportAuditLog } from './database.js';
import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

document.getElementById('signOutBtn').addEventListener('click', performSignOut);

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardData();
});

async function fetchApplicationsAndEmployed() {
    const applicationCol = collection(firestore, 'applied');
    const employedCol = collection(firestore, 'employed');

    try {
        const [applicationsSnapshot, employedSnapshot] = await Promise.all([
            getDocs(applicationCol),
            getDocs(employedCol)
        ]);

        const applications = applicationsSnapshot.docs.map(doc => doc.data()) || [];
        const employed = employedSnapshot.docs.map(doc => doc.data()) || [];

        // Log data to see what Firestore returns
        console.log("Applications fetched:", applications);
        console.log("Employed fetched:", employed);

        return { applications, employed };
    } catch (error) {
        console.error("Error fetching data:", error);
        return { applications: [], employed: [] }; // Return empty arrays in case of an error
    }
}

function updateDashboardData() {
    Promise.all([
        updateJobCount(),
        updateVacanciesCount(),
        updateApplicationCount(),
        updateEmployedCount(),
        fetchApplicationsAndEmployed()
    ])
    .then(([jobCount, vacanciesCount, applicationCount, employedCount, { applications, employed }]) => {
        console.log("Applications:", applications);
        console.log("Employed:", employed);

        createCharts(applications, employed);
    })
    .catch(error => {
        console.error("Error updating dashboard:", error);
    });
}


function updateJobCount() {
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

function updateVacanciesCount() {
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

// Aggregate data by company and position
function aggregateDataByCompany(applications, employed) {
    applications = Array.isArray(applications) ? applications : [];
    employed = Array.isArray(employed) ? employed : [];

    const applicationsByCompany = {};
    const employedByCompany = {};
    const employedByPosition = {};

    applications.forEach(app => {
        const company = app.company || 'Unknown';
        applicationsByCompany[company] = (applicationsByCompany[company] || 0) + 1;
    });

    employed.forEach(emp => {
        const company = emp.company || 'Unknown';
        const position = emp.position || 'Unknown';

        employedByCompany[company] = (employedByCompany[company] || 0) + 1;

        if (!employedByPosition[company]) employedByPosition[company] = {};
        employedByPosition[company][position] = (employedByPosition[company][position] || 0) + 1;
    });

    return { applicationsByCompany, employedByCompany, employedByPosition };
}

// Render the charts
function createCharts(applications, employed) {
    const ctxApplications = document.getElementById('applicationsByCompanyChart').getContext('2d');
    const ctxEmployedByPosition = document.getElementById('employedByPositionChart').getContext('2d');
    const ctxEmployedByCompany = document.getElementById('employedByCompanyChart').getContext('2d');

    const { applicationsByCompany, employedByCompany, employedByPosition } = aggregateDataByCompany(applications, employed);

    // Applications by Company Chart
    new Chart(ctxApplications, {
        type: 'bar',
        data: {
            labels: Object.keys(applicationsByCompany),
            datasets: [{
                label: 'Applications by Company',
                data: Object.values(applicationsByCompany),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Employed by Position Chart
    const companies = Object.keys(employedByPosition);
    const datasets = [];
    const positions = new Set();

    companies.forEach(company => {
        Object.keys(employedByPosition[company]).forEach(position => positions.add(position));
    });

    companies.forEach(company => {
        const data = Array.from(positions).map(position => employedByPosition[company][position] || 0);
        datasets.push({
            label: company,
            data,
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
        });
    });

    new Chart(ctxEmployedByPosition, {
        type: 'bar',
        data: {
            labels: Array.from(positions),
            datasets
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Employed by Company Chart
    new Chart(ctxEmployedByCompany, {
        type: 'bar',
        data: {
            labels: Object.keys(employedByCompany),
            datasets: [{
                label: 'Employed by Company',
                data: Object.values(employedByCompany),
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

