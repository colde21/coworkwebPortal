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

// Sign out functionality
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

document.addEventListener('DOMContentLoaded', () => {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }
    requireLogin();
    updateDashboardData();
    loadMostAppliedJobs();
});

// Load "Most Applied Jobs"
async function loadMostAppliedJobs() {
    const mostAppliedJobsList = document.getElementById('mostAppliedJobsList');
    const applicationCol = collection(firestore, 'applied');
    
    try {
        const applicationsSnapshot = await getDocs(applicationCol);
        const applications = applicationsSnapshot.docs.map(doc => doc.data());
        const positionsByCount = {};

        applications.forEach(app => {
            const position = app.position || 'Unknown Position';
            positionsByCount[position] = (positionsByCount[position] || 0) + 1;
        });

        const sortedJobs = Object.entries(positionsByCount).sort(([, a], [, b]) => b - a).slice(0, 5);
        mostAppliedJobsList.innerHTML = '';
        sortedJobs.forEach(([job, count]) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<b>${job}</b> (${count}) - ${((count / applications.length) * 100).toFixed(2)}%`;
            mostAppliedJobsList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching most applied jobs:", error);
    }
}

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
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch Scheduled Interviews
    const fetchScheduledInterviews = async () => {
        const interviewsCol = collection(firestore, 'interview');
        const querySnapshot = await getDocs(interviewsCol);

        // Format interviews for FullCalendar and List
        const events = [];
        const interviewList = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                title: data.position,
                start: data.date, // Ensure date is in ISO format
            });

            interviewList.push(`
                <div class="interview-item">
                    <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${data.time}</p>
                    <p><strong>Interviewer:</strong> ${data.contactPerson}</p>
                </div>
            `);
        });

        // Populate Calendar
        const calendarEl = document.getElementById('calendar');
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: events,
        });
        calendar.render();

        // Populate Interview List
        const interviewListEl = document.getElementById('interview-list');
        interviewListEl.innerHTML = interviewList.join('');
    };

    // Call the function to fetch and display interviews
    await fetchScheduledInterviews();
});
