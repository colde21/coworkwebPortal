import { fetchAllJobs, logAudit, exportAuditLog } from './database.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, addDoc, doc, collection, deleteDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const auth = getAuth(app);
const firestore = getFirestore(app);

const itemsPerPage = 10;
let currentPage = 1;
let filteredJobs = [];
//Prevent user Jump Page 
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
//sign out function should be working by now 
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


document.addEventListener('DOMContentLoaded', () => {
    requireLogin();  // Ensure login

    const signOutBtn = document.getElementById('signOutBtn'); // don porget
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    } else {
    }// this also

    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    /*document.getElementById('sortAsc').addEventListener('click', () => handleSort('asc'));
    document.getElementById('sortDesc').addEventListener('click', () => handleSort('desc'));*/

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs; // Store all jobs in a global variable for filtering and sorting
        filteredJobs = jobs;
        updateJobTable();
    }).catch(err => console.error("Failed to fetch jobs:", err));
});
//Update tables
function updateJobTable() {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    // Sort jobs by `unarchivedAt` first, then by `createdAt` (descending order)
    filteredJobs.sort((a, b) => {
        const timeA = a.unarchivedAt ? a.unarchivedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
        const timeB = b.unarchivedAt ? b.unarchivedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
        return timeB - timeA; // Sort by most recent first
    });

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const jobsToDisplay = filteredJobs.slice(start, end);

    jobsToDisplay.forEach(job => {
        const newRow = tableBody.insertRow(-1);
        newRow.dataset.id = job.id;

            // Append cells for specific columns
        const cells = ['position', 'company', 'location', 'vacancy', 'type', 'contact'];
        cells.forEach(field => {
            const cell = newRow.insertCell();
            cell.textContent = job[field] || 'N/A';
        });
    });

    document.getElementById('jobCount').textContent = `Total Jobs: ${filteredJobs.length}`;
    updatePaginationControls();
}


//Search 
function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();

    // Search across multiple fields
    filteredJobs = window.allJobs.filter(job => {
        return (
            (job.position && job.position.toLowerCase().includes(query)) ||
            (job.company && job.company.toLowerCase().includes(query)) ||
            (job.location && job.location.toLowerCase().includes(query)) ||
            (job.vacancy && job.vacancy.toString().toLowerCase().includes(query)) ||
            (job.type && job.type.toLowerCase().includes(query)) ||
            (job.contact && job.contact.toLowerCase().includes(query))
        );
    });

    currentPage = 1; // Reset to first page when search is performed
    updateJobTable();
}
//Pagination
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

//Archived Selected Jobs
async function archiveSelectedJobs() {
    const checkedBoxes = document.querySelectorAll('#jobTable tbody input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        alert("No jobs selected for archiving.");
        return;
    }

    // Show the confirmation dialog
    const confirmationDialog = document.getElementById('confirmationDialog');
    confirmationDialog.style.display = 'flex'; // Show dialog

    // Handle confirmation logic
    document.getElementById('confirmArchiveBtn').onclick = async () => {
        confirmationDialog.style.display = 'none'; // Hide dialog
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";

        for (const box of checkedBoxes) {
            const jobId = box.closest('tr').dataset.id;
            try {
                const jobDocRef = doc(firestore, 'jobs', jobId);
                const jobDocSnap = await getDoc(jobDocRef);
                if (jobDocSnap.exists()) {
                    const jobData = jobDocSnap.data();
                    const { company, position } = jobData;

                    // Archive the job with a timestamp
                    const archiveData = {
                        ...jobData,
                        archivedAt: Timestamp.now() // Set the archive timestamp
                    };

                    // Add the job to the 'archive' collection
                    await addDoc(collection(firestore, 'archive'), archiveData);
                    await deleteDoc(jobDocRef); // Remove the job from the jobs collection

                    // Log the action in the audit trail
                    await logAudit(userEmail, "Job Archived", { jobId });

                    box.closest('tr').remove(); // Remove the row from the table
                }
            } catch (error) {
                console.error(`Failed to archive job with ID: ${jobId}`, error);
                alert(`Failed to archive job with ID: ${jobId}.`);
            }
        }

        // Reload the page after all jobs are processed
        window.location.reload();
    };

    // Handle cancellation
    document.getElementById('cancelArchiveBtn').onclick = () => {
        confirmationDialog.style.display = 'none'; // Hide dialog
    };
}

//EditJob
// Event listener for the "Save Changes" button
document.getElementById('saveJobButton').addEventListener('click', async function (event) {
    event.preventDefault(); // Prevent page reload

    // Get job ID (you must store jobId somewhere)
    const jobId = document.getElementById('editJobForm').dataset.jobId;

    if (!jobId) {
        alert('No job ID found. Please refresh and try again.');
        return;
    }

    const jobDocRef = doc(firestore, 'jobs', jobId);

    // Collect data from the form
    const updatedData = {
        position: document.getElementById('position').value,
        company: document.getElementById('company').value,
        location: document.getElementById('location').value,
        age: document.getElementById('age').value,
        type: document.getElementById('type').value,
        vacancy: document.getElementById('vacancy').value,
        contact: document.getElementById('email').value,
        qualifications: document.getElementById('qualifications').value,
        facilities: document.getElementById('facilities').value,
        description: document.getElementById('description').value,
    };

    // Validate age restriction (between 18 and 60)
    const age = parseInt(updatedData.age, 10);
    if (isNaN(age) || age < 18 || age > 60) {
        alert('Please enter a valid age between 18 and 60.');
        return;
    }

    // Validate vacancy, if 0, ask the user for confirmation to archive the job
    const vacancy = parseInt(updatedData.vacancy, 10);
    if (isNaN(vacancy) || vacancy < 0) {
        alert('Please enter a valid number for vacancy.');
        return;
    }

    if (vacancy === 0) {
        const confirmArchive = confirm('Vacancy is set to 0. Do you want to archive this job?');
        if (confirmArchive) {
            await archiveJobIfNeeded(jobId, updatedData.company, updatedData.position);
            return; // Exit after archiving the job
        }
    }

    try {
        // Update the job in Firestore
        await updateDoc(jobDocRef, updatedData);

        // Log the audit trail
        await logAudit(auth.currentUser.email, 'Job Edited', { jobId, updatedData });

        // Show a success message
        alert('Job updated successfully!');

        // Hide the edit form
        document.getElementById('editJobForm').style.display = 'none';

        // Refresh the job table to reflect the updates
        fetchAllJobs().then(jobs => {
            window.allJobs = jobs;
            filteredJobs = jobs;
            updateJobTable();
        });
    } catch (error) {
        console.error('Error updating job:', error);
        alert('Failed to update the job. Please try again.');
    }
});

// Function to archive the job if vacancy is 0
async function archiveJobIfNeeded(jobId, company, position) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);
        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Archive the job with a timestamp
            const archiveData = {
                ...jobData,
                archivedAt: Timestamp.now() // Set the archive timestamp
            };

            // Add the job to the 'archive' collection
            await addDoc(collection(firestore, 'archive'), archiveData);
            await deleteDoc(jobDocRef); // Remove the job from the jobs collection
            console.log(`Archived job with ID: ${jobId}`);

            // Log the audit action
            await logAudit(auth.currentUser.email, 'Job Archived', { jobId });

            // Show a confirmation alert with company name and position
            alert(`Job "${position}" at "${company}" was successfully archived because the vacancy is 0.`);

            // Refresh the job table after archiving
            fetchAllJobs().then(jobs => {
                window.allJobs = jobs;
                filteredJobs = jobs;
                updateJobTable();
            });
        }
    } catch (error) {
        console.error(`Failed to archive job with ID: ${jobId}`, error);
        alert(`Failed to archive job with ID: ${jobId}.`);
    }
}


// "Go Back" button functionality
document.getElementById('goBackButton').addEventListener('click', function () {
    window.location.href = "job.html"; // This will navigate the user to the previous page
});

// Function to load job data into the form for editing
async function editJob(jobId) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Populate the form with the job data
            document.getElementById('position').value = jobData.position || '';
            document.getElementById('company').value = jobData.company || '';
            document.getElementById('location').value = jobData.location || '';
            document.getElementById('age').value = jobData.age || '';
            document.getElementById('type').value = jobData.type || '';
            document.getElementById('vacancy').value = jobData.vacancy || '';
            document.getElementById('email').value = jobData.contact || '';
            document.getElementById('qualifications').value = jobData.qualifications || '';
            document.getElementById('facilities').value = jobData.facilities || '';
            document.getElementById('description').value = jobData.description || '';

            // Show the edit form and set the jobId in the dataset
            document.getElementById('editJobForm').dataset.jobId = jobId;
            document.getElementById('editJobForm').style.display = 'block';
        } else {
            alert('Job not found!');
        }
    } catch (error) {
        console.error('Error fetching job for editing:', error);
    }
}
