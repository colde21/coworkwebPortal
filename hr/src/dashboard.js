import { fetchAllJobs, logAudit } from './db.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { getFirestore, collection, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const firestore = getFirestore(app);

let calendar;

// Ensure the user is authenticated and identify their role
function requireLogin() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
        } else {
            const role = await fetchUserRole(user.uid);
            if (role === 'hr' || role === 'hr2') {
                console.log(`Welcome ${role}`);
            } else {
                alert('Unauthorized access. Only HR users are allowed.');
                await firebaseSignOut(auth);
                window.location.href = '/login.html';
            }
        }
    });
}
// Handle sign-out
async function performSignOut() {
    const signOutConfirmation = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    signOutConfirmation.style.display = 'flex';

    confirmSignOutBtn.addEventListener('click', async function () {
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

    cancelSignOutBtn.addEventListener('click', function () {
        signOutConfirmation.style.display = 'none';
    });
}

// Fetch user role from Realtime Database
async function fetchUserRole(userId) {
    try {
        const roleRef = ref(database, `user/${userId}/role`);
        const snapshot = await get(roleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.error("Role not found for this user.");
            return null;
        }
    } catch (error) {
        console.error('Error fetching user role from Realtime Database:', error);
        return null;
    }
}

// Dashboard data
async function fetchDashboardData() {
    try {
        const jobsSnapshot = await getDocs(collection(firestore, 'jobs'));
        const jobCount = jobsSnapshot.size;

        const applicationsSnapshot = await getDocs(collection(firestore, 'applied'));
        const applicationCount = applicationsSnapshot.size;

        const employedSnapshot = await getDocs(collection(firestore, 'employed'));
        const employedCount = employedSnapshot.size;

        let totalVacancies = 0;
        jobsSnapshot.forEach((doc) => {
            const data = doc.data();
            const vacancyCount = parseInt(data.vacancy, 10);
            if (!isNaN(vacancyCount)) {
                totalVacancies += vacancyCount;
            }
        });

        document.getElementById('jobCount').textContent = `Total: ${jobCount}`;
        document.getElementById('applicationCount').textContent = `Total: ${applicationCount}`;
        document.getElementById('employedCount').textContent = `Total: ${employedCount}`;
        document.getElementById('vacanciesCount').textContent = `Total: ${totalVacancies}`;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

// Fetch interviews from Firestore
async function fetchScheduledInterviews() {
    try {
        const interviewsCol = collection(firestore, "interview");
        const querySnapshot = await getDocs(interviewsCol);

        const events = [];
        const interviewList = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                title: data.position,
                start: `${data.date}T${data.time}`, // Combine date and time
                extendedProps: {
                    time: data.time,
                    interviewer: data.contactPerson,
                },
            });

            interviewList.push(`
                <div class="interview-item" id="interview-${doc.id}">
                    <p><strong>Date:</strong> ${data.date}</p>
                    <p><strong>Time:</strong> ${data.time}</p>
                    <p><strong>Interviewer:</strong> ${data.contactPerson}</p>
                    <button class="btn btn-primary" onclick="openModal('${doc.id}', '${data.date}', '${data.time}', '${data.contactPerson}')">Reschedule</button>
                </div>
            `);
        });

        return { events, interviewList };
    } catch (error) {
        console.error("Error fetching interviews:", error);
        return { events: [], interviewList: [] };
    }
}

// Open reschedule modal
window.openModal = function (eventId, date, time, interviewer) {
    document.getElementById("eventId").value = eventId;
    document.getElementById("interviewDate").value = date;
    document.getElementById("interviewTime").value = time;
    document.getElementById("interviewer").value = interviewer;

    const modal = new bootstrap.Modal(document.getElementById("rescheduleModal"));
    modal.show();
};

// Save changes to Firestore and update calendar and schedule
window.saveChanges = async function () {
    const eventId = document.getElementById("eventId").value;
    const newDate = document.getElementById("interviewDate").value;
    const newTime = document.getElementById("interviewTime").value;
    const interviewer = document.getElementById("interviewer").value;

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No authenticated user found.");
        }

        const userEmail = user.email;

        // Update the interview document in Firestore
        const interviewRef = doc(firestore, "interview", eventId);
        await updateDoc(interviewRef, {
            date: newDate,
            time: newTime,
            contactPerson: interviewer,
        });

        // Update the calendar event
        const event = calendar.getEventById(eventId);
        if (event) {
            event.setStart(`${newDate}T${newTime}`); // Update the start date and time
            event.setEnd(null); // Clear the end date to prevent spanning multiple days
            event.setExtendedProp("interviewer", interviewer); // Update additional data
        }

        // Update the schedule list
        const interviewItem = document.getElementById(`interview-${eventId}`);
        if (interviewItem) {
            interviewItem.innerHTML = `
                <p><strong>Date:</strong> ${newDate}</p>
                <p><strong>Time:</strong> ${newTime}</p>
                <p><strong>Interviewer:</strong> ${interviewer}</p>
                <button class="btn btn-primary reschedule-btn" data-id="${eventId}" data-date="${newDate}" data-time="${newTime}" data-interviewer="${interviewer}">Reschedule</button>
            `;
        }

        // Log the rescheduling action in the audit log
        await logAudit(userEmail, "Rescheduled Interview", {
            status: "Success",
            timestamp: new Date().toISOString(),
        });
        // Hide the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("rescheduleModal"));
        modal.hide();

        alert("Interview rescheduled successfully!");
    } catch (error) {
        console.error("Error saving changes:", error);

        // Log the failure in the audit log
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";
        await logAudit(userEmail, "Rescheduling", {
            status: "Failed",
            error: error.message,
            timestamp: new Date().toISOString(),
        });

        alert("Failed to save changes. Please try again.");
    }
};

// Initialize calendar and fetch data
document.addEventListener("DOMContentLoaded", async () => {
    requireLogin();
    fetchDashboardData();
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', async () => {
            const eventId = document.getElementById("eventId").value;
            const newDate = document.getElementById("interviewDate").value;
            const newTime = document.getElementById("interviewTime").value;
            const interviewer = document.getElementById("interviewer").value;

            try {
                const interviewRef = doc(firestore, "interview", eventId);
                await updateDoc(interviewRef, {
                    date: newDate,
                    time: newTime,
                    contactPerson: interviewer,
                });

                // Update the calendar event
                const event = calendar.getEventById(eventId);
                if (event) {
                    event.setStart(`${newDate}T${newTime}`); // Update the start date and time
                    event.setEnd(null); // Clear the end date to prevent spanning multiple days
                    event.setExtendedProp("interviewer", interviewer); // Update additional data
                }

                // Update the schedule list
                const interviewItem = document.getElementById(`interview-${eventId}`);
                if (interviewItem) {
                    interviewItem.innerHTML = `
                        <p><strong>Date:</strong> ${newDate}</p>
                        <p><strong>Time:</strong> ${newTime}</p>
                        <p><strong>Interviewer:</strong> ${interviewer}</p>
                        <button class="btn btn-primary reschedule-btn" data-id="${eventId}" data-date="${newDate}" data-time="${newTime}" data-interviewer="${interviewer}">Reschedule</button>
                    `;
                }

                const modal = bootstrap.Modal.getInstance(document.getElementById("rescheduleModal"));
                modal.hide();

                alert("Interview rescheduled successfully!");
            } catch (error) {
                console.error("Error saving changes:", error);
                alert("Failed to save changes. Please try again.");
            }
        });
    }

    // Add event listener for the "Close" button if additional logic is needed
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            console.log('Modal closed');
        });
    }

    // Add event delegation for dynamically created reschedule buttons
    const interviewListEl = document.getElementById("interview-list");
    if (interviewListEl) {
        interviewListEl.addEventListener('click', (event) => {
            if (event.target.classList.contains('reschedule-btn')) {
                const button = event.target;
                const eventId = button.getAttribute('data-id');
                const date = button.getAttribute('data-date');
                const time = button.getAttribute('data-time');
                const interviewer = button.getAttribute('data-interviewer');

                document.getElementById("eventId").value = eventId;
                document.getElementById("interviewDate").value = date;
                document.getElementById("interviewTime").value = time;
                document.getElementById("interviewer").value = interviewer;

                const modal = new bootstrap.Modal(document.getElementById("rescheduleModal"));
                modal.show();
            }
        });
    }
    const { events, interviewList } = await fetchScheduledInterviews();

    // Initialize FullCalendar
    const calendarEl = document.getElementById("calendar");
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        events: events,
        editable: false,
        eventOverlap: false,
    });
    calendar.render();

    // Populate interview list
    interviewListEl.innerHTML = interviewList.join("");
});
// Add event listener to the Sign Out button
if (document.getElementById('signOutBtn')) {
    document.getElementById('signOutBtn').addEventListener('click', performSignOut);
}
