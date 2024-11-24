import { fetchAllJobs, logAudit } from './db.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js"; // Ensure this import is present
import { getFirestore, collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Initialize Firebase app
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app); // This initializes the Realtime Database

// Ensure the user is authenticated and identify their role from Realtime Database
function requireLogin() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
        } else {
            const role = await fetchUserRole(user.uid);
            if (role === 'hr') {
                console.log("Welcome HR");
                // Custom logic for HR
           
            } else if (role === 'hr2') {
                console.log("Welcome HR2");
                // Custom logic for HR2
    
            } else {
                alert('Unauthorized access. Only HR users are allowed.');
                await firebaseSignOut(auth);
                window.location.href = '/login.html';
            }
        }
    });
}
async function fetchScheduledInterviews() {
    const firestore = getFirestore(app);
    const interviewsCol = collection(firestore, 'interview');
    const querySnapshot = await getDocs(interviewsCol);

    const events = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            title: `${data.position} - ${data.company}`,
            start: data.date, // Ensure the date is in ISO format (YYYY-MM-DD)
            time: data.time,
            description: data.description,
            jobId: data.jobId,
            extendedProps: {
                contactPerson: data.contactPerson,
                userEmail: data.userEmail,
            },
        };
    });
}

// Fetch user role from Realtime Database
async function fetchUserRole(userId) {
    try {
        const roleRef = ref(database, `user/${userId}/role`);
        const snapshot = await get(roleRef);
        if (snapshot.exists()) {
            return snapshot.val(); // Return the role (e.g., 'hr' or 'hr2')
        } else {
            console.error("Role not found for this user.");
            return null;
        }
    } catch (error) {
        console.error('Error fetching user role from Realtime Database:', error);
        return null;
    }
}

// Navigation setup
document.getElementById('homeButton').addEventListener('click', function () {
    location.href = 'dashboard_hr.html';
});

document.getElementById('jobButton').addEventListener('click', function () {
    location.href = 'Jobs/job.html';
});

document.getElementById('appButton').addEventListener('click', function () {
    location.href = 'application.html';
});

document.getElementById('archiveButton').addEventListener('click', function () {
    location.href = 'archive.html';
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

document.addEventListener('DOMContentLoaded',async() => {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }
    requireLogin();

    const calendarEl = document.getElementById('calendar');
    const events = fetchScheduledInterviews();
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
        },
        events: events,
        eventClick: function(info) {
            alert(`Job ID: ${info.event.extendedProps.jobId}\nPosition: ${info.event.title}\nDate: ${info.event.start.toISOString().split('T')[0]}\nTime: ${info.event.extendedProps.time}\nContact Person: ${info.event.extendedProps.contactPerson}`);
        },
    });
    console.log('FullCalendar:', FullCalendar);
    calendar.render();
});

