import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications, hireApplicant, archiveJobIfNeeded, logAudit } from './database.js';
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
let allApplications = [];  // To store all applications globally
let filteredApplications = []; // To store filtered applications
let currentPage = 1;  // Current page in pagination
const applicationsPerPage = 5;  // Limit applications per page

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

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);  // Added the refresh button functionality
    }

    fetchApplicationsAndUpdateUI();  // Initial load
});

function fetchApplicationsAndUpdateUI() {
    fetchAllApplications().then(applications => {
        allApplications = applications;
        filteredApplications = applications; // Initialize filteredApplications with all applications
        updateApplicationList(filteredApplications);
    }).catch(err => console.error("Failed to fetch applications:", err));
}

function updateApplicationList(applications) {
    const applicationList = document.getElementById('applicationList');
    if (!applicationList) return;

    applicationList.innerHTML = ''; 

    // Get the applications for the current page
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

        const contactButton = document.createElement('button');
        contactButton.textContent = 'Contact';
        contactButton.addEventListener('click', () => {
            const subject = `Application Status for ${application.position} at ${application.company}`;
            const body = `Dear ${application.userName},\n\nCongratulations! You have been approved by ${application.company} for the position of ${application.position}.\n\nBest regards,\nYour Company Name`;
            const mailtoLink = `mailto:${application.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        });

        const hireButton = document.createElement('button');
        hireButton.textContent = 'Hire';
        hireButton.addEventListener('click', async () => {
            await hireApplicantAndDecrementVacancy(application.id, application);
        });

        listItem.appendChild(detailsDiv);
        listItem.appendChild(contactButton);
        listItem.appendChild(hireButton);
        applicationList.appendChild(listItem);
    });

    // Update pagination controls
    updatePaginationControls(applications);
}

function updatePaginationControls(applications) {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) return;

    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(applications.length / applicationsPerPage);

    // Create "Previous" button
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

    // Create page numbers display
    const pageNumbers = document.createElement('span');
    pageNumbers.textContent = `${currentPage}-${totalPages}`;
    pageNumbers.classList.add('page-numbers');
    paginationControls.appendChild(pageNumbers);

    // Create "Next" button
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

async function hireApplicantAndDecrementVacancy(applicationId, application) {
    try {
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";

        if (!application.jobId) {
            alert("Job ID not found for the selected application.");
            return;
        }

        await hireApplicant(applicationId, application);

        await logAudit(userEmail, "Applicant Hired", {
            applicationId: applicationId,
            applicantName: application.userName,
            position: application.position,
            company: application.company,
            status: "Success",
            timestamp: new Date().toISOString()
        });

        const jobDocRef = doc(firestore, 'jobs', application.jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            let vacancy = jobDocSnap.data().vacancy;
            if (vacancy > 0) {
                vacancy--;
                await updateDoc(jobDocRef, { vacancy });

                if (vacancy === 0) {
                    await archiveJobIfNeeded(application.jobId, application.company, application.position, userEmail);
                    window.location.href = "archive.html";
                    fetchApplicationsAndUpdateUI();
                    return;
                }

                fetchApplicationsAndUpdateUI();
                alert(`${application.userName} has been hired and vacancy updated.`);
            } else {
                alert("The job has no more vacancies.");
            }
        } else {
            alert("Job not found.");
        }
    } catch (error) {
        console.error("Error hiring applicant and updating vacancy:", error);

        await logAudit(userEmail, "Applicant Hire Failed", {
            applicationId: applicationId,
            applicantName: application.userName,
            position: application.position,
            company: application.company,
            status: "Failed",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

function handleSearch() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;

    const query = searchBar.value.toLowerCase();

    if (query === '') {
        filteredApplications = allApplications;
    } else {
        filteredApplications = allApplications.filter(application => {
            return (
                (application.userName && application.userName.toLowerCase().includes(query)) ||
                (application.position && application.position.toLowerCase().includes(query)) ||
                (application.company && application.company.toLowerCase().includes(query)) ||
                (application.userEmail && application.userEmail.toLowerCase().includes(query)) 
            );
        });
    }
    currentPage = 1; // Reset to first page after search
    updateApplicationList(filteredApplications);
}

function handleRefresh() {
    currentPage = 1; // Reset the page to 1
    fetchApplicationsAndUpdateUI(); // Reload the application list
}
