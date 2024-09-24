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

// Signout 
function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    // Show confirmation dialog
    const confirmSignOut = confirm("Are you sure you want to sign out?");

    if (confirmSignOut) {
        firebaseSignOut(auth).then(() => {
            logAudit(userEmail, "Sign out", { status: "Success" });
            window.location.href = "../login.html";
        }).catch((error) => {
            logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            console.error("Error signing out:", error);
        });
    } else {
        console.log("Sign out cancelled");
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
        const [applicationsSnapshot, employedSnapshot] = await Promise.all([
            getDocs(applicationCol),
            getDocs(employedCol)
        ]);

        const applications = applicationsSnapshot.docs.map(doc => doc.data()) || [];
        const employed = employedSnapshot.docs.map(doc => doc.data()) || [];

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

        if (!employedByPosition[position]) {
            employedByPosition[position] = {};
        }
        employedByPosition[position][company] = (employedByPosition[position][company] || 0) + 1;
    });

    return { applicationsByCompany, employedByCompany, employedByPosition };
}

// Function to calculate percentage
function calculatePercentage(data) {
    const total = data.reduce((sum, value) => sum + value, 0);
    return data.map(value => ((value / total) * 100).toFixed(2) + '%');
}

// Create a list of distinct colors for each chart
function getCompanyColors(numCompanies) {
    const predefinedColors = [
        'rgba(75, 192, 192, 0.2)',
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(255, 159, 64, 0.2)'
    ];

    const predefinedBorderColors = [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
    ];

    while (numCompanies > predefinedColors.length) {
        predefinedColors.push(`rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`);
        predefinedBorderColors.push(`rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`);
    }

    return { colors: predefinedColors.slice(0, numCompanies), borders: predefinedBorderColors.slice(0, numCompanies) };
}

// Applications by Company Chart
function createApplicationsByCompanyChart(applicationsByCompany) {
    const ctxApplications = document.getElementById('applicationsByCompanyChart').getContext('2d');
    const companies = Object.keys(applicationsByCompany);
    const applications = Object.values(applicationsByCompany);
    const percentages = calculatePercentage(applications);
    const { colors, borders } = getCompanyColors(companies.length);

    new Chart(ctxApplications, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Applications by Company',
                data: applications,
                backgroundColor: colors,
                borderColor: borders,
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Applications by Company'
                },
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function (chart) {
                            const labels = chart.data.labels;
                            const datasets = chart.data.datasets[0];
                            return labels.map((label, index) => {
                                return {
                                    text: `${label}: ${datasets.data[index]} (${percentages[index]})`,
                                    fillStyle: datasets.backgroundColor[index],
                                    strokeStyle: datasets.borderColor[index]
                                };
                            });
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Create Text Summary
    createTextSummary('applicationsByCompanySummary', companies, applications, percentages);
}

// Employed by Position Chart with properly aligned bars
function createEmployedByPositionChart(employedByPosition) {
    const ctxEmployedByPosition = document.getElementById('employedByPositionChart').getContext('2d');
    
    const positions = Object.keys(employedByPosition);
    const companySet = new Set();
    positions.forEach(position => {
        Object.keys(employedByPosition[position]).forEach(company => {
            companySet.add(company);
        });
    });
    
    const companies = Array.from(companySet); // Convert Set back to Array
    const datasets = [];

    const { colors, borders } = getCompanyColors(companies.length);

    companies.forEach((company, index) => {
        const data = positions.map(position => employedByPosition[position][company] || 0);

        datasets.push({
            label: company,
            data,
            backgroundColor: colors[index],
            borderColor: borders[index],
            borderWidth: 1,
            barPercentage: 0.8,  // Adjusts the bar width
            categoryPercentage: 0.8  // Adjusts the space between bars
        });
    });

    new Chart(ctxEmployedByPosition, {
        type: 'bar',
        data: {
            labels: positions,
            datasets
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Employed by Position'
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

    // Create Text Summary
    const summaryData = datasets.map(d => d.data.reduce((acc, curr) => acc + curr, 0));
    const summaryPercentages = calculatePercentage(summaryData);
    createTextSummary('employedByPositionSummary', positions, summaryData, summaryPercentages);
}

// Employed by Company Chart
function createEmployedByCompanyChart(employedByCompany) {
    const ctxEmployedByCompany = document.getElementById('employedByCompanyChart').getContext('2d');
    const companies = Object.keys(employedByCompany);
    const employedCounts = Object.values(employedByCompany);
    const percentages = calculatePercentage(employedCounts);
    const { colors, borders } = getCompanyColors(companies.length);

    new Chart(ctxEmployedByCompany, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: [{
                label: 'Employed by Company',
                data: employedCounts,
                backgroundColor: colors,
                borderColor: borders,
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Employed by Company'
                },
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function (chart) {
                            const labels = chart.data.labels;
                            const datasets = chart.data.datasets[0];
                            return labels.map((label, index) => {
                                return {
                                    text: `${label}: ${datasets.data[index]} (${percentages[index]})`,
                                    fillStyle: datasets.backgroundColor[index],
                                    strokeStyle: datasets.borderColor[index]
                                };
                            });
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Create Text Summary
    createTextSummary('employedByCompanySummary', companies, employedCounts, percentages);
}

// Function to create a text summary next to the chart
function createTextSummary(summaryElementId, labels, data, percentages) {
    const summaryElement = document.getElementById(summaryElementId);
    if (!summaryElement) {
        console.error(`Summary element with ID '${summaryElementId}' not found.`);
        return;
    }
    summaryElement.innerHTML = ''; // Clear previous content

    let summaryHTML = '<h3>Summary</h3><ul>';
    labels.forEach((label, index) => {
        summaryHTML += `<li>${label}: ${data[index]} (${percentages[index]})</li>`;
    });
    summaryHTML += '</ul>';

    summaryElement.innerHTML = summaryHTML;
}

// Render the charts
function createCharts(applications, employed) {
    const { applicationsByCompany, employedByCompany, employedByPosition } = aggregateDataByCompany(applications, employed);

    // Create Applications by Company chart
    createApplicationsByCompanyChart(applicationsByCompany);

    // Create Employed by Position chart
    createEmployedByPositionChart(employedByPosition);

    // Create Employed by Company chart
    createEmployedByCompanyChart(employedByCompany);
}
