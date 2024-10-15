import { fetchAllJobs, logAudit } from './database.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// Sign out functionality
async function performSignOut() {
    const loadingScreen = document.getElementById('loading-screen');
    const errorMessageContainer = document.getElementById('error-message');

    if (loadingScreen) loadingScreen.style.display = 'flex';

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user found.");

        const userEmail = user.email;
        await logAudit(userEmail, "Sign out", { status: "Success" });
        await firebaseSignOut(auth);
        window.location.href = "/login.html";
    } catch (error) {
        const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
        await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
        if (errorMessageContainer) {
            errorMessageContainer.textContent = error.message || 'Sign out failed. Please try again.';
        }
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const signOutBtn = document.getElementById('signOutBtn');
    const confirmationDialog = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            confirmationDialog.style.display = 'flex'; // Show confirmation dialog
        });
    }

    cancelSignOutBtn.addEventListener('click', () => {
        confirmationDialog.style.display = 'none'; // Hide the confirmation dialog
    });

    confirmSignOutBtn.addEventListener('click', async () => {
        confirmationDialog.style.display = 'none'; // Hide the confirmation dialog
        loadingScreen.style.display = 'flex'; // Show loading screen

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No authenticated user found.");

            const userEmail = user.email;
            await logAudit(userEmail, "Sign out", { status: "Success" });
            await firebaseSignOut(auth);
            window.location.href = "/login.html";
        } catch (error) {
            const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
            await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            alert("Error: Unable to sign out.");
        } finally {
            loadingScreen.style.display = 'none'; // Hide loading screen after sign-out is complete
        }
    });

    requireLogin();
    updateDashboardData();
    loadMostAppliedJobs();
});


// Fetch applications and employed data
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

// Update dashboard data
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

// Update Job Count
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

// Update Vacancies Count
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

// Update Application Count
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

// Update Employed Count
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

// Aggregate data by company
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

// Shades of red for bars
const redShades = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 77, 77, 0.7)',
    'rgba(255, 127, 80, 0.7)',
    'rgba(240, 128, 128, 0.7)',
    'rgba(220, 20, 60, 0.7)',
];

// Create Applications by Company Chart
function createApplicationsByCompanyChart(applicationsByCompany) {
    const ctxApplications = document.getElementById('applicationsByCompanyChart').getContext('2d');
    const companies = Object.keys(applicationsByCompany);
    const applications = Object.values(applicationsByCompany);

    new Chart(ctxApplications, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Applications by Company',
                data: applications,
                backgroundColor: redShades,
                borderColor: redShades.map(shade => shade.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Make bars horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Applications per Company'
                },
                legend: {
                    display: false // Hide legends for cleaner UI
                },
                datalabels: {
                    anchor: 'center',
                    align: 'center',
                    color: 'white',
                    font: {
                        weight: 'bold'
                    },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2) + '%';
                        return `${value} (${percentage})`;
                    }
                }
            },
            scales: {
                x: { beginAtZero: true } // Start the bars from 0
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Create Employed by Position Chart with Adjustments
function createEmployedByPositionChart(employedByPosition) {
    const ctxEmployedByPosition = document.getElementById('employedByPositionChart').getContext('2d');
    const positions = Object.keys(employedByPosition);
    const companies = [...new Set(Object.values(employedByPosition).flatMap(position => Object.keys(position)))];

    const totalEmployees = positions.reduce((sum, position) => {
        return sum + Object.values(employedByPosition[position]).reduce((posSum, val) => posSum + val, 0);
    }, 0);

    const datasets = companies.map((company, index) => {
        const data = positions.map(position => employedByPosition[position][company] || 0);
        return {
            label: company,
            data,
            backgroundColor: redShades[index % redShades.length],
            borderColor: redShades[index % redShades.length].replace('0.7', '1'),
            borderWidth: 1
        };
    });

    new Chart(ctxEmployedByPosition, {
        type: 'bar',
        data: {
            labels: positions,
            datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Positions per Company'
                },
                legend: {
                    display: false // Hide the legend to declutter
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: 'black',
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    formatter: (value) => {
                        const percentage = ((value / totalEmployees) * 100).toFixed(2) + '%';
                        return value > 0 ? `${value} (${percentage})` : '';
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: Math.max(...positions.map(position => 
                        companies.reduce((sum, company) => sum + (employedByPosition[position][company] || 0), 0)
                    )) + 1,
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 10 // Smaller font size for better readability
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// Create Employed by Company Chart
function createEmployedByCompanyChart(employedByCompany) {
    const ctxEmployedByCompany = document.getElementById('employedByCompanyChart').getContext('2d');
    const companies = Object.keys(employedByCompany);
    const employedCounts = Object.values(employedByCompany);

    new Chart(ctxEmployedByCompany, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Employed by Company',
                data: employedCounts,
                backgroundColor: redShades,
                borderColor: redShades.map(shade => shade.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Make bars horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Employed per Company'
                },
                legend: {
                    display: false // Hide legends for cleaner UI
                },
                datalabels: {
                    anchor: 'center',
                    align: 'center',
                    color: 'white',
                    font: {
                        weight: 'bold'
                    },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2) + '%';
                        return `${value} (${percentage})`;
                    }
                }
            },
            scales: {
                x: { beginAtZero: true } // Start the bars from 0
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Create Text Summary
function createTextSummary(summaryElementId, labels, data, percentages) {
    const summaryElement = document.getElementById(summaryElementId);
    if (!summaryElement) {
        console.error(`Summary element with ID '${summaryElementId}' not found.`);
        return;
    }
    summaryElement.innerHTML = ''; 

    let summaryHTML = '<h3>Summary:</h3><ul>';
    labels.forEach((label, index) => {
        const total = typeof data[index] === 'object' ? Object.values(data[index]).reduce((sum, count) => sum + count, 0) : data[index];
        summaryHTML += `<li><b>${label}</b> (${total}) - ${percentages[index]}</li>`;
    });
    summaryHTML += '</ul>';

    summaryElement.innerHTML = summaryHTML;
}

// Create Charts
function createCharts(applications, employed) {
    const { applicationsByCompany, employedByCompany, employedByPosition } = aggregateDataByCompany(applications, employed);

    createApplicationsByCompanyChart(applicationsByCompany);
    createEmployedByPositionChart(employedByPosition);
    createEmployedByCompanyChart(employedByCompany);

    createTextSummary('applicationsByCompanySummary', Object.keys(applicationsByCompany), Object.values(applicationsByCompany), calculatePercentage(Object.values(applicationsByCompany)));
    createTextSummary('employedByPositionSummary', Object.keys(employedByPosition), Object.values(employedByPosition), calculatePercentage(Object.values(employedByPosition).map(position => Object.values(position).reduce((sum, val) => sum + val, 0))));
    createTextSummary('employedByCompanySummary', Object.keys(employedByCompany), Object.values(employedByCompany), calculatePercentage(Object.values(employedByCompany)));
}

// Calculate Percentage
function calculatePercentage(data) {
    const total = data.reduce((sum, value) => sum + value, 0);
    return data.map(value => ((value / total) * 100).toFixed(2) + '%');
}
