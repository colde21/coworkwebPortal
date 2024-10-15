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

// prevent jump
function requireLogin() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // If the user is not logged in, redirect to the login page
            window.location.href = '/login.html';
        } else {
            // Optionally log that the user has accessed the page
           console.log("Page Accessed.")
        }
    });
}

let allApplications = [];  // To store all applications globally
let refreshInterval; // To store the interval ID

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

// Add event listener to the Sign Out button
document.getElementById('signOutBtn').addEventListener('click', performSignOut);

// Ensure elements exist before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    requireLogin();  // Ensure login

    const signOutBtn = document.getElementById('signOutBtn'); // don porget
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    } else {
    }// this also

    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', handleSearch);
        searchBar.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
        searchBar.addEventListener('focus', () => clearInterval(refreshInterval));
    }

    refreshInterval = setInterval(fetchApplicationsAndUpdateUI, 1000);
    fetchApplicationsAndUpdateUI();
});


function fetchApplicationsAndUpdateUI() {
    fetchAllApplications().then(applications => {
        allApplications = applications;
        updateApplicationList(allApplications);
    }).catch(err => console.error("Failed to fetch applications:", err));
}

function updateApplicationList(applications) {
    const applicationList = document.getElementById('applicationList');
    if (!applicationList) return; // Exit if the element does not exist

    applicationList.innerHTML = ''; 

    applications.forEach((application) => {
        const listItem = document.createElement('li');

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.innerHTML = `
            <strong>Applicant:</strong> ${application.userName}<br>
            <strong>Position:</strong> ${application.position} - ${application.company}<br>
            <strong>Email:</strong> ${application.userEmail}<br>
            <strong>Contact number:</strong> ${application.userPhone}
        `;

    
        listItem.appendChild(detailsDiv);
        applicationList.appendChild(listItem);
    });
}

async function hireApplicantAndDecrementVacancy(applicationId, application) {
    try {
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";

        // Ensure jobId exists in the application
        if (!application.jobId) {
            alert("Job ID not found for the selected application.");
            return;
        }

        // Hire the applicant
        await hireApplicant(applicationId, application);

        // Log audit for hiring the applicant
        await logAudit(userEmail, "Applicant Hired", {
            applicationId: applicationId,
            applicantName: application.userName,
            position: application.position,
            company: application.company,
            status: "Success",
            timestamp: new Date().toISOString()
        });

        // Fetch the job and decrement the vacancy
        const jobDocRef = doc(firestore, 'jobs', application.jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            let vacancy = jobDocSnap.data().vacancy;
            if (vacancy > 0) {
                vacancy--;

                // Update the job vacancy
                await updateDoc(jobDocRef, { vacancy });

                // Archive the job if vacancy is 0
                if (vacancy === 0) {
                    await archiveJobIfNeeded(application.jobId, application.company, application.position, userEmail);
                
                    // Update the UI after archiving the job
                    window.location.href = "archive.html";
                    fetchApplicationsAndUpdateUI();
                    return;  // Exit the function to prevent further execution
                }

                // Refresh the job table after updating the vacancy
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

        // Log audit for hiring failure
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


//handle Search function..
function handleSearch() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;

    const query = searchBar.value.toLowerCase();

    if (query === '') {
        updateApplicationList(allApplications);
        refreshInterval = setInterval(fetchApplicationsAndUpdateUI, 1000);
    } else {
        const filteredApplications = allApplications.filter(application => {
            return (
                (application.userName && application.userName.toLowerCase().includes(query)) ||
                (application.position && application.position.toLowerCase().includes(query)) ||
                (application.company && application.company.toLowerCase().includes(query)) ||
                (application.userEmail && application.userEmail.toLowerCase().includes(query)) 
            );
        });
        updateApplicationList(filteredApplications);
        clearInterval(refreshInterval);
    }
}