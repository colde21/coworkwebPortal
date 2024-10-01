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
        } else{
            console.log("Page Accessed.")
        }
    });
}

//Sign out button
//sign out function should be working by now 
async function performSignOut() {
    const loadingScreen = document.getElementById('loading-screen'); // Reference to the loading screen element
    const errorMessageContainer = document.getElementById('error-message'); // Reference to show errors

    if (loadingScreen) loadingScreen.style.display = 'flex'; // Show the loading screen

    try {
        const user = auth.currentUser; // Get the currently authenticated user

        if (!user) {
            throw new Error("No authenticated user found."); // Handle the case when there's no logged-in user
        }

        const userEmail = user.email;
        console.log('User Email:', userEmail); // Useful for debugging

        // Log audit for successful sign-out
        await logAudit(userEmail, "Sign out", { status: "Success" });
        console.log("Audit logged for sign-out.");

        // Perform Firebase sign-out
        await firebaseSignOut(auth);
        console.log("User successfully signed out.");

        // Redirect to the login page or show a sign-out success message
        window.location.href = "/login.html";
    } catch (error) {
        console.error("Error during sign-out:", error);

        // Log audit for failed sign-out
        const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
        await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });

        // Show the error message in the error message container
        if (errorMessageContainer) {
            errorMessageContainer.textContent = error.message || 'Sign out failed. Please try again.';
        }
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none'; // Hide the loading screen
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const signOutBtn = document.getElementById('signOutBtn'); // don porget
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    } else {
    }//

    requireLogin();  // Ensure login

    const archiveButton = document.getElementById('archiveSelectedJobsButton');
    archiveButton.addEventListener('click', archiveSelectedJobs);

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

        const checkboxCell = newRow.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'circular-checkbox';
        checkbox.dataset.id = job.id;
        checkboxCell.appendChild(checkbox);

        // Append cells for specific columns
        const cells = ['position', 'company', 'location', 'vacancy', 'type', 'contact'];
        cells.forEach(field => {
            const cell = newRow.insertCell();
            cell.textContent = job[field] || 'N/A';
        });

        const editCell = newRow.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editJob(job.id));
        editCell.appendChild(editButton);
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
//Sort
/*function handleSort(order) {
    const sortBy = document.getElementById('sortBy').value;
    filteredJobs.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return order === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return order === 'asc' ? 1 : -1;
        return 0;
    });
    currentPage = 1; // Reset to first page when sorting is performed
    updateJobTable();
}*/
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



//Export auditLogs
document.getElementById('exportAuditLogBtn').addEventListener('click', () => {
    exportAuditLog().then(csvContent => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'audit_log.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(error => {
        console.error("Error exporting audit log:", error);
    });
});


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
