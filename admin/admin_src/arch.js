import { fetchArchivedJobs, logAudit, deleteArchivedJob } from './database.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, doc, addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";


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

// Initialize Firebase if not already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const itemsPerPage = 5;
let currentPage = 1;
let filteredJobs = [];

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
    // Add your sign-out logic here
    console.log('Sign out button clicked');
});
//Navigation

async function performSignOut() {
    const signOutConfirmation = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    // Show the confirmation dialog
    signOutConfirmation.style.display = 'flex';

    // If the user confirms, proceed with sign-out
    confirmSignOutBtn.addEventListener('click', async function() {
        signOutConfirmation.style.display = 'none'; // Hide the confirmation dialog
        if (loadingScreen) loadingScreen.style.display = 'flex'; // Show loading screen

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

      // If the user cancels, hide the confirmation dialog
      cancelSignOutBtn.addEventListener('click', function() {
        signOutConfirmation.style.display = 'none';
    });
}
document.addEventListener('DOMContentLoaded', () => {
    requireLogin();
    fetchAndDisplayArchivedJobs();

    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    const signOutBtn = document.getElementById('signOutBtn');
    signOutBtn.addEventListener('click', performSignOut);
});

async function fetchAndDisplayArchivedJobs() {
    try {
        const jobs = await fetchArchivedJobs();
        filteredJobs = jobs;
        updateArchiveTable();
    } catch (error) {
        console.error("Failed to fetch archived jobs:", error);
    }
}

function updateArchiveTable() {
    const archiveList = document.getElementById('archiveList');
    archiveList.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const jobsToDisplay = filteredJobs.slice(start, end);

    jobsToDisplay.forEach(job => {
        const row = document.createElement('div');
        row.className = 'table-row';

        const positionCell = document.createElement('div');
        positionCell.className = 'table-cell';
        positionCell.textContent = job.position;

        const companyCell = document.createElement('div');
        companyCell.className = 'table-cell';
        companyCell.textContent = job.company;

        const locationCell = document.createElement('div');
        locationCell.className = 'table-cell';
        locationCell.textContent = job.location;

        const actionsCell = document.createElement('div');
        actionsCell.className = 'table-cell';

        const unarchiveButton = document.createElement('button');
        unarchiveButton.textContent = 'Unarchive';
        unarchiveButton.className = 'unarchive-button';
        unarchiveButton.addEventListener('click', () => unarchiveJob(job.id));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.addEventListener('click', () => deleteJob(job.id, row));

        actionsCell.appendChild(unarchiveButton);
        actionsCell.appendChild(deleteButton);

        row.appendChild(positionCell);
        row.appendChild(companyCell);
        row.appendChild(locationCell);
        row.appendChild(actionsCell);

        archiveList.appendChild(row);
    });

    updatePaginationControls();
}


function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    fetchArchivedJobs().then(jobs => {
        filteredJobs = jobs.filter(job => 
            job.position.toLowerCase().includes(query) ||
            job.company.toLowerCase().includes(query) ||
            job.location.toLowerCase().includes(query)
        );
        currentPage = 1;
        updateArchiveTable();
    });
}

function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage = i;
            updateArchiveTable();
        });
        paginationControls.appendChild(button);
    }
}

function showConfirmationDialog(message, onConfirm) {
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmButton = document.getElementById('confirmActionBtn');
    const cancelButton = document.getElementById('cancelActionBtn');

    confirmationMessage.textContent = message;
    confirmationDialog.style.display = 'flex';

    confirmButton.replaceWith(confirmButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));

    document.getElementById('confirmActionBtn').onclick = () => {
        confirmationDialog.style.display = 'none';
        onConfirm();
    };
    
    document.getElementById('cancelActionBtn').onclick = () => {
        confirmationDialog.style.display = 'none';
    };
}

function showVacancyInputDialog(message, defaultValue, onConfirm) {
    const vacancyDialog = document.getElementById('vacancyDialog');
    const vacancyMessage = document.getElementById('vacancyDialogMessage');
    const vacancyInput = document.getElementById('vacancyInput');
    const confirmButton = document.getElementById('confirmVacancyBtn');
    const cancelButton = document.getElementById('cancelVacancyBtn');

    vacancyMessage.textContent = message;
    vacancyInput.value = defaultValue;
    vacancyDialog.style.display = 'flex';

    confirmButton.replaceWith(confirmButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));

    document.getElementById('confirmVacancyBtn').onclick = () => {
        const newValue = vacancyInput.value;
        if (!isNaN(newValue) && newValue >= 0) {
            vacancyDialog.style.display = 'none';
            onConfirm(newValue);
        } else {
            alert('Please enter a valid vacancy number.');
        }
    };

    document.getElementById('cancelVacancyBtn').onclick = () => {
        vacancyDialog.style.display = 'none';
    };
}

async function unarchiveJob(jobId) {
    const jobDocRef = doc(firestore, `archive/${jobId}`);
    const jobData = await getDoc(jobDocRef);

    if (jobData.exists()) {
        showConfirmationDialog("Do you want to unarchive this job?", async () => {
            const currentVacancy = jobData.data().vacancy || 0;
            showVacancyInputDialog(
                `Edit the vacancy number for "${jobData.data().position}" at "${jobData.data().company}":`,
                currentVacancy,
                async (newVacancy) => {
                    showConfirmationDialog("Are you sure you want to unarchive this job with the updated vacancy?", async () => {
                        try {
                            const user = auth.currentUser;
                            const userEmail = user ? user.email : "Unknown user";
                            
                            const updatedJobData = {
                                ...jobData.data(),
                                vacancy: parseInt(newVacancy, 10),
                                unarchivedAt: Timestamp.now()
                            };

                            await addDoc(collection(firestore, 'jobs'), updatedJobData);
                            await deleteArchivedJob(jobId);
                            await logAudit(userEmail, "Job Unarchived", { jobId, newVacancy });

                            window.location.reload();
                        } catch (error) {
                            console.error(`Failed to unarchive job ${jobId}:`, error);
                        }
                    });
                }
            );
        });
    } else {
        alert("Job data not found.");
    }
}

async function deleteJob(jobId, listItem) {
    showConfirmationDialog("Are you sure you want to delete this job permanently?", async () => {
        try {
            const user = auth.currentUser;
            const userEmail = user ? user.email : "Unknown user";

            // Delete the job from the archive collection
            await deleteArchivedJob(jobId);
            
            // Log the audit with the info "Job Deleted"
            await logAudit(userEmail, "Job Deleted", { jobId });

            // Remove the job from the DOM after deletion
            listItem.remove();
            window.location.reload();
        } catch (error) {
            console.error(`Failed to delete job ${jobId}:`, error);
        }
    });
}
