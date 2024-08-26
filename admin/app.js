import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications, hireApplicant } from './database.js';

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

let allApplications = [];  // To store all applications globally
let refreshInterval; // To store the interval ID

function performSignOut() {
    firebaseSignOut(auth).then(() => {
        window.location.href = "../login.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

// Add event listener to the sign-out button
document.getElementById('signOutBtn').addEventListener('click', performSignOut);

// Function to fetch applications and update the UI
function fetchApplicationsAndUpdateUI() {
    fetchAllApplications().then(applications => {
        allApplications = applications; // Store all applications globally
        updateApplicationList(allApplications); // Update the UI
    }).catch(err => console.error("Failed to fetch applications:", err));
}

// Function to update the displayed application list
function updateApplicationList(applications) {
    const applicationList = document.getElementById('applicationList');
    applicationList.innerHTML = ''; // Clear existing list items

    applications.forEach(application => {
        const listItem = document.createElement('li');
        
        // Create a div to hold the details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details'; // Add class for styling
        
        // Add applicant details
        detailsDiv.innerHTML = `
            <strong>Applicant:</strong> ${application.userName}<br>
            <strong>Position:</strong> ${application.position} - ${application.company}<br>
            <strong>Email:</strong> ${application.userEmail}<br>
            <strong>Contact number:</strong> ${application.userPhone}
        `;
        
        // Create the Hire button
        const hireButton = document.createElement('button');
        hireButton.textContent = 'Hire';
        hireButton.addEventListener('click', () => hireApplicantHandler(application.id, application));
        
        // Append details and button to list item
        listItem.appendChild(detailsDiv);
        listItem.appendChild(hireButton);
        
        // Append list item to the list
        applicationList.appendChild(listItem);
    });
}

// Search function to filter applications by company
function handleSearch() {
    const query = searchBar.value.toLowerCase();
    
    if (query === '') {
        // If search bar is empty, show all applications and restart the refresh interval
        updateApplicationList(allApplications);
        refreshInterval = setInterval(fetchApplicationsAndUpdateUI, 1000);
    } else {
        // Otherwise, filter the applications by the search query
        const filteredApplications = allApplications.filter(application =>
            application.company.toLowerCase().includes(query)
        );
        updateApplicationList(filteredApplications);
        clearInterval(refreshInterval); // Stop refreshing when searching
    }
}

// Add event listener to the search bar
const searchBar = document.getElementById('searchBar');

searchBar.addEventListener('input', handleSearch);
searchBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
});

// Pause refreshing when the user interacts with the search bar
searchBar.addEventListener('focus', () => clearInterval(refreshInterval));

// Hire button handler with confirmation dialog
async function hireApplicantHandler(applicationId, applicantData) {
    const confirmation = confirm(`Are you sure you want to hire ${applicantData.userName} for the position of ${applicantData.position} at ${applicantData.company}?`);

    if (confirmation) {
        try {
            await hireApplicant(applicationId, applicantData);
            alert(`Applicant ${applicantData.userName} has been hired!`);
            window.location.reload();  // Refresh the list after hiring
        } catch (error) {
            console.error(`Error hiring applicant ${applicationId}:`, error);
            alert('Failed to hire the applicant.');
        }
    }
}

// Refresh the application list every second
refreshInterval = setInterval(fetchApplicationsAndUpdateUI, 1000);

// Initial fetch and display of applications
document.addEventListener('DOMContentLoaded', fetchApplicationsAndUpdateUI);


