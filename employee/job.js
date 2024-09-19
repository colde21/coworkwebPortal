import { fetchAllJobs, updateJobStatus, logAudit, exportAuditLog } from './database.js';
import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, addDoc, doc, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const itemsPerPage = 10;
let currentPage = 1;
let filteredJobs = [];

// Signout 
function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    // Show confirmation dialog
    const confirmSignOut = confirm("Are you sure you want to sign out?");

    if (confirmSignOut) {
        firebaseSignOut(auth).then(() => {
            logAudit(userEmail, "Sign out", { status: "Success" });
            window.location.href = "../login.html";
        }).catch((error) => {
            logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            console.error("Error signing out:", error);
        });
    } else {
        console.log("Sign out cancelled");
    }
}

document.getElementById('signOutBtn').addEventListener('click', performSignOut);
// Signout 

document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    document.getElementById('sortAsc').addEventListener('click', () => handleSort('asc'));
    document.getElementById('sortDesc').addEventListener('click', () => handleSort('desc'));

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs; // Store all jobs in a global variable for filtering and sorting
        filteredJobs = jobs;
        updateJobTable();
    }).catch(err => console.error("Failed to fetch jobs:", err));
});

function updateJobTable() {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const jobsToDisplay = filteredJobs.slice(start, end);

    let count = 0; // Initialize job count

    jobsToDisplay.forEach(job => {
        count++; // Increment for each job
        const newRow = tableBody.insertRow(-1);
        newRow.dataset.id = job.id;

        // Append cells for specific columns
        const cells = ['position', 'company', 'location', 'vacancy', 'type', 'contact'];
        cells.forEach(field => {
            const cell = newRow.insertCell();
            cell.textContent = job[field] || 'N/A';
        });

        // Create the edit button for vacancy
        const editCell = newRow.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editVacancy(job.id, job.vacancy, job.company, job.position));
        editCell.appendChild(editButton);
    });

    document.getElementById('jobCount').textContent = `Total Jobs: ${filteredJobs.length}`;
    updatePaginationControls();
}
//Search bar 
function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    filteredJobs = window.allJobs.filter(job => {
        return job.company.toLowerCase().includes(query);
    });
    currentPage = 1; // Reset to first page when search is performed
    updateJobTable();
}
//Sort
function handleSort(order) {
    const sortBy = document.getElementById('sortBy').value;
    filteredJobs.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return order === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return order === 'asc' ? 1 : -1;
        return 0;
    });
    currentPage = 1; // Reset to first page when sorting is performed
    updateJobTable();
}
//PaginationControls
function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = ''; // Clear existing controls

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    const pageDisplay = document.createElement('span');
    pageDisplay.textContent = `${currentPage}-${totalPages}`;
    paginationControls.appendChild(pageDisplay);

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        currentPage--;
        updateJobTable();
    });
    paginationControls.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        currentPage++;
        updateJobTable();
    });
    paginationControls.appendChild(nextButton);
}
//Edit Vacancy 
async function editVacancy(jobId, currentVacancy, company, position) {
    const newVacancy = prompt(`Enter new vacancy number for "${position}" at "${company}":`, currentVacancy);
    if (newVacancy !== null && !isNaN(newVacancy) && newVacancy >= 0) {
        try {
            const user = auth.currentUser;
            const userEmail = user ? user.email : "Unknown user";
            const updatedVacancy = parseInt(newVacancy, 10);

            // Update the job vacancy
            await updateJobStatus(jobId, { vacancy: updatedVacancy });
            await logAudit(userEmail, "Vacancy Updated", { jobId, updatedVacancy });
            console.log(`Updated job ${jobId} vacancy to ${updatedVacancy}`);

            // Check if the vacancy is 0, and if so, archive the job
            if (updatedVacancy === 0) {
                await archiveJobIfNeeded(jobId, company, position, userEmail);
            }

            fetchAllJobs().then(jobs => {
                window.allJobs = jobs;
                filteredJobs = jobs;
                updateJobTable();
            });

            // Show an alert that the vacancy was updated
            alert(`Vacancy for "${position}" at "${company}" updated to ${updatedVacancy}.`);
        } catch (error) {
            console.error(`Failed to update job vacancy for ${jobId}`, error);
        }
    } else {
        alert("Invalid input. Please enter a valid number.");
    }
}