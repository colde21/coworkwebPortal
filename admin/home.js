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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";
    const confirmSignOut = confirm("Are you sure you want to sign out?");
    if (confirmSignOut) {
        firebaseSignOut(auth).then(() => {
            logAudit(userEmail, "Sign out", { status: "Success" });
            window.location.href = "../login.html";
        }).catch(error => {
            logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            console.error("Error signing out:", error);
        });
    }
}

document.getElementById('signOutBtn').addEventListener('click', performSignOut);

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardData();
});

async function fetchApplicationsAndEmployed() {
    const applicationCol = collection(firestore, 'applied');
    const employedCol = collection(firestore, 'employed');
    try {
        const [applicationsSnapshot, employedSnapshot] = await Promise.all([getDocs(applicationCol), getDocs(employedCol)]);
        const applications = applicationsSnapshot.docs.map(doc => doc.data()) || [];
        const employed = employedSnapshot.docs.map(doc => doc.data()) || [];
        return { applications, employed };
    } catch (error) {
        console.error("Error fetching data:", error);
        return { applications: [], employed: [] };
    }
}

function updateDashboardData() {
    Promise.all([
        updateJobCount(),
        updateVacanciesCount(),
        updateApplicationCount(),
        updateEmployedCount(),
        fetchApplicationsAndEmployed()
    ]).then(([jobCount, vacanciesCount, applicationCount, employedCount, { applications, employed }]) => {
        createCharts(applications, employed);
    }).catch(error => {
        console.error("Error updating dashboard:", error);
    });
}

function updateJobCount() {
    return fetchAllJobs().then(jobs => {
        const count = jobs.length;
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
        const totalVacancies = jobs.reduce((sum, job) => sum + (parseInt(job.vacancy, 10) || 0), 0);
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
        onSnapshot(applicationCol, snapshot => {
            const count = snapshot.size;
            document.getElementById('applicationCount').textContent = `Total: ${count}`;
            resolve(count);
        }, error => {
            console.error("Error fetching applications:", error);
            document.getElementById('applicationCount').textContent = `Failed to load applications.`;
            reject(error);
        });
    });
}

function updateEmployedCount() {
    return new Promise((resolve, reject) => {
        const employedCol = collection(firestore, 'employed');
        onSnapshot(employedCol, snapshot => {
            const count = snapshot.size;
            document.getElementById('employedCount').textContent = `Total: ${count}`;
            resolve(count);
        }, error => {
            console.error("Error fetching employed count:", error);
            document.getElementById('employedCount').textContent = `Failed to load employed count.`;
            reject(error);
        });
    });
}

function aggregateDataByCompany(applications, employed) {
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

        if (!employedByPosition[position]) {
            employedByPosition[position] = {};
        }
        employedByPosition[position][company] = (employedByPosition[position][company] || 0) + 1;
    });

    return { applicationsByCompany, employedByCompany, employedByPosition };
}

function createApplicationsByCompanyChart(applicationsByCompany) {
    const ctxApplications = document.getElementById('applicationsByCompanyChart').getContext('2d');
    const companies = Object.keys(applicationsByCompany);
    const applications = Object.values(applicationsByCompany);

    const chart = new Chart(ctxApplications, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Applications by Company',
                data: applications,
                backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Applications per Company'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    const resizeObserver = new ResizeObserver(() => {
        chart.resize();
    });
    resizeObserver.observe(document.getElementById('applicationsByCompanyChart'));
}

function createEmployedByPositionChart(employedByPosition) {
    const ctxEmployedByPosition = document.getElementById('employedByPositionChart').getContext('2d');
    
    const positions = Object.keys(employedByPosition);  
    const companies = [...new Set(Object.values(employedByPosition).flatMap(position => Object.keys(position)))];
    
    const datasets = companies.map((company, index) => {
        const data = positions.map(position => employedByPosition[position][company] || 0);
        const colors = ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)'];
        const borderColors = ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'];

        return {
            label: company,
            data,  
            backgroundColor: colors[index % colors.length],
            borderColor: borderColors[index % borderColors.length],
            borderWidth: 1,
            barPercentage: 0.8,
            categoryPercentage: 0.8
        };
    });

    new Chart(ctxEmployedByPosition, {
        type: 'bar',
        data: {
            labels: positions,  
            datasets  
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Positions per Company'
                },
                legend: {
                    display: false  
                }
            },
            scales: {
                x: {
                    stacked: true  
                },
                y: {
                    beginAtZero: true,
                    stacked: true  
                }
            }
        }
    });
}

function createEmployedByCompanyChart(employedByCompany) {
    const ctxEmployedByCompany = document.getElementById('employedByCompanyChart').getContext('2d');
    const companies = Object.keys(employedByCompany);
    const employedCounts = Object.values(employedByCompany);

    const chart = new Chart(ctxEmployedByCompany, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Employed by Company',
                data: employedCounts,
                backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)'],
                borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Employed per Company'
                },
                legend: {
                    display: false  
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    const resizeObserver = new ResizeObserver(() => {
        chart.resize();
    });
    resizeObserver.observe(document.getElementById('employedByCompanyChart'));
}

function createTextSummary(summaryElementId, labels, data, percentages) {
    const summaryElement = document.getElementById(summaryElementId);
    if (!summaryElement) {
        console.error(`Summary element with ID '${summaryElementId}' not found.`);
        return;
    }
    summaryElement.innerHTML = ''; 

    let summaryHTML = '<h3>Legend:</h3><ul>';
    labels.forEach((label, index) => {
        summaryHTML += `<li>${label}</li>`;
    });
    summaryHTML += '</ul><h3>Summary:</h3><ul>';
    labels.forEach((label, index) => {
        const total = typeof data[index] === 'object' ? Object.values(data[index]).reduce((sum, count) => sum + count, 0) : data[index];
        summaryHTML += `<li><b>${label}: ${total} - ${percentages[index]}</b></li>`;
    });
    summaryHTML += '</ul>';

    summaryElement.innerHTML = summaryHTML;
}

function createCharts(applications, employed) {
    const { applicationsByCompany, employedByCompany, employedByPosition } = aggregateDataByCompany(applications, employed);

    createApplicationsByCompanyChart(applicationsByCompany);
    createEmployedByPositionChart(employedByPosition);
    createEmployedByCompanyChart(employedByCompany);

    // Generate summary for each chart
    createTextSummary('applicationsByCompanySummary', Object.keys(applicationsByCompany), Object.values(applicationsByCompany), calculatePercentage(Object.values(applicationsByCompany)));
    createTextSummary('employedByPositionSummary', Object.keys(employedByPosition), Object.values(employedByPosition), calculatePercentage(Object.values(employedByPosition).map(position => Object.values(position).reduce((sum, val) => sum + val, 0))));
    createTextSummary('employedByCompanySummary', Object.keys(employedByCompany), Object.values(employedByCompany), calculatePercentage(Object.values(employedByCompany)));
}

function calculatePercentage(data) {
    const total = data.reduce((sum, value) => sum + value, 0);
    return data.map(value => ((value / total) * 100).toFixed(2) + '%');
}
