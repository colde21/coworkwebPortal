import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications } from "./db.js";  // Correct import

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

// Initialize Firebase if not already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Get `linkId` from URL
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('linkId');

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;
let allApplicants = [];  // Store all applicants globally
let originalApplicants = [];

// Validate link and fetch applicants
async function fetchApplicantsByLink() {
    try {
        console.log("Fetching disposable link with ID:", linkId);  // Debugging log

        const linkDocRef = doc(firestore, 'disposableLinks', linkId);
        const linkSnap = await getDoc(linkDocRef);

        if (linkSnap.exists()) {
            const linkData = linkSnap.data();
            console.log("Link Data:", linkData);  // Debugging log

            const now = new Date();

            if (linkData.validUntil.toDate() >= now) {
                console.log("Link is still valid.");  // Debugging log
                const q = query(collection(firestore, 'applied'), where('company', '==', linkData.company));
                const querySnapshot = await getDocs(q);

                let totalApplicants = 0;
                allApplicants = [];  // Reset applicants array
                originalApplicants = [];  // Reset the original applicants array

                querySnapshot.forEach(doc => {
                    const applicantData = doc.data();
                    totalApplicants++;
                    allApplicants.push(applicantData);
                    originalApplicants.push(applicantData);  // Store a copy in the original array
                });

                console.log("Total Applicants Found:", totalApplicants);  // Debugging log

                document.getElementById('totalApplicants').textContent = `Total Applicants: ${totalApplicants}`;
                displayApplicants();  // Show applicants with pagination
                updateDateTime();
            } else {
                alert("The link has expired.");
            }
        } else {
            alert("Invalid or expired link.");
        }
    } catch (error) {
        console.error("Error fetching applicants:", error);
        alert("Error fetching applicants. Please try again.");
    }
}

// Function to display applicants based on the current page and search results
function displayApplicants() {
    const applicantsTableBody = document.getElementById('applicantTableBody');
    applicantsTableBody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allApplicants.length);

    // Display the correct slice of applicants for the current page
    const paginatedApplicants = allApplicants.slice(startIndex, endIndex);
    paginatedApplicants.forEach(applicant => {
        const row = applicantsTableBody.insertRow();
        row.insertCell(0).textContent = applicant.position || '-';
        row.insertCell(1).textContent = applicant.company || '-';
    });

    updatePaginationControls();
}

// Function to update the pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(allApplicants.length / itemsPerPage);
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const currentPageDisplay = document.getElementById('currentPageDisplay');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

    currentPageDisplay.textContent = `Page: ${currentPage} of ${totalPages}`;
}

// Search functionality (filter by position name)
document.getElementById('searchBar').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();

    // If the search query is empty, reset to the original list
    if (query === '') {
        allApplicants = [...originalApplicants];  // Restore the original applicants
    } else {
        // Filter applicants by position name
        allApplicants = originalApplicants.filter(applicant =>
            applicant.position && applicant.position.toLowerCase().includes(query)
        );
    }

    currentPage = 1;  // Reset to first page for the filtered results
    displayApplicants();
});

// Event listeners for pagination controls
document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayApplicants();
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil(allApplicants.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayApplicants();
    }
});

// Function to update date and time display
function updateDateTime() {
    const currentDateTime = new Date().toLocaleString();  // Get current date and time
    document.getElementById('dateTime').textContent = currentDateTime;
}

// Fetch and display applicants when the page loads
fetchApplicantsByLink();
