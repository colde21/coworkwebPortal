import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications, fetchHiredApplicants, fetchRejectedApplicants, fetchInterviewApplicants, logAudit } from './database.js'; 
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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Pagination Variables
let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const applicationsPerPage = 5;
let selectedFilter = 'applied'; // Default filter as 'Applications'

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
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }
    
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', handleSearch);
        searchBar.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
    }

    const filterDropdown = document.getElementById('statusFilter');
    if (filterDropdown) {
        filterDropdown.addEventListener('change', handleFilterChange);
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    fetchApplicationsAndUpdateUI(); // Load initially as 'Applications'
});

async function fetchApplicationsAndUpdateUI() {
    try {
        if (selectedFilter === 'applied') {
            const applications = await fetchAllApplications();
            allApplications = applications;
        } else if (selectedFilter === 'hired') {
            const hired = await fetchHiredApplicants();
            allApplications = hired;
        } else if (selectedFilter === 'rejected') {
            const rejected = await fetchRejectedApplicants();
            allApplications = rejected;
        } else if (selectedFilter === 'interview') {
            const interview = await fetchInterviewApplicants();
            allApplications = interview;
        }
        filteredApplications = allApplications;
        updateApplicationList(filteredApplications);
    } catch (error) {
        console.error("Failed to fetch applications:", error);
    }
}
function updateApplicationList(applications) {
    const applicationList = document.getElementById('applicationList');
    if (!applicationList) return;

    applicationList.innerHTML = ''; 

    const startIndex = (currentPage - 1) * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    const paginatedApplications = applications.slice(startIndex, endIndex);

    paginatedApplications.forEach((application) => {
        const listItem = document.createElement('li');

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.innerHTML = `
            <strong>Applicant:</strong> ${application.userName}<br>
            <strong>Position:</strong> ${application.position} - ${application.company}<br>
            <strong>Email:</strong> ${application.userEmail}<br>
            <strong>Contact number:</strong> ${application.userPhone}
        `;

        // Append the details (without any action buttons)
        listItem.appendChild(detailsDiv);
        applicationList.appendChild(listItem);
    });

    updatePaginationControls(applications);
}


function updatePaginationControls(applications) {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) return;

    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(applications.length / applicationsPerPage);

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateApplicationList(filteredApplications);
        }
    });
    paginationControls.appendChild(prevButton);

    const pageNumbers = document.createElement('span');
    pageNumbers.textContent = `${currentPage}-${totalPages}`;
    pageNumbers.classList.add('page-numbers');
    paginationControls.appendChild(pageNumbers);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateApplicationList(filteredApplications);
        }
    });
    paginationControls.appendChild(nextButton);
}

function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    filteredApplications = filterApplications(allApplications).filter(application => 
        application.userName.toLowerCase().includes(query) ||
        application.position.toLowerCase().includes(query) ||
        application.company.toLowerCase().includes(query) ||
        application.userEmail.toLowerCase().includes(query)
    );
    updateApplicationList(filteredApplications);
}

function handleRefresh() {
    filteredApplications = filterApplications(allApplications);
    updateApplicationList(filteredApplications);
}

function handleFilterChange(event) {
    selectedFilter = event.target.value;
    fetchApplicationsAndUpdateUI();
}

function filterApplications(applications) {
    return applications; // No status-based filtering, fetching by filter already handles it.
}

// Utility to create a button with a label and a click event
function createButton(label, onClick) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}