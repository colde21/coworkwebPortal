import { fetchArchivedJobs, logAudit, } from './database.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";


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
        const listItem = document.createElement('li');
        listItem.className = 'archived-job';

        const title = document.createElement('div');
        title.className = 'jobTitle';
        title.textContent = `Position: ${job.position}`;

        const company = document.createElement('div');
        company.className = 'company';
        company.textContent = `Company: ${job.company}`;

        const location = document.createElement('div');
        location.className = 'location';
        location.textContent = `Location: ${job.location}`;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        listItem.appendChild(title);
        listItem.appendChild(company);
        listItem.appendChild(location);
        listItem.appendChild(buttonContainer);

        archiveList.appendChild(listItem);
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
