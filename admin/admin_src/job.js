import { fetchAllJobs, logAudit, exportAuditLog, generateDisposableLink } from './database.js';
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

// Function to ensure user is logged in
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

// Handle sign-out
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

// Event listeners after DOM content loads
document.addEventListener('DOMContentLoaded', () => {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }

    requireLogin();

    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs;
        filteredJobs = jobs;
        updateJobTable();
    }).catch(err => console.error("Failed to fetch jobs:", err));

});

// Display job details pop-up
function viewJobDetails(jobId) {
    const jobDetailsPopup = document.getElementById('viewJobDetailsPopup');
    const jobDetailsContent = document.getElementById('jobDetailsContent');

    getDoc(doc(firestore, 'jobs', jobId)).then((jobDoc) => {
        if (jobDoc.exists()) {
            const jobData = jobDoc.data();

            // Fetch skills and qualifications as arrays
            const skills = jobData.skills || [];
            const qualifications = jobData.qualifications || [];

            jobDetailsContent.innerHTML = `
                <p><strong>Position:</strong> ${jobData.position || 'N/A'}</p><hr>
                <p><strong>Company:</strong> ${jobData.company || 'N/A'}</p><hr>
                <p><strong>Location:</strong> ${jobData.location || 'N/A'}</p><hr>
                <p><strong>Vacancy:</strong> ${jobData.vacancy || 'N/A'}</p><hr>
                <p><strong>Contact Person:</strong> ${jobData.contactPerson || 'N/A'}</p><hr>
                <p><strong>Contact Number:</strong> ${jobData.contactNumber || 'N/A'}</p><hr>
                <p><strong>Type:</strong> ${jobData.type || 'N/A'}</p><hr>
                 <p><strong>Job Category:</strong> ${jobData.jobType || 'N/A'}</p><hr>
                <p><strong>Email:</strong> ${jobData.email || 'N/A'}</p><hr>
                <p><strong> Salary:</strong> ${jobData.salary || 'N/A'}</p><hr>
                <p><strong>Skills:</strong> ${skills.length > 0 ? skills.join(', ') : 'N/A'}</p><hr>
                <p><strong>Qualifications:</strong> ${qualifications.length > 0 ? qualifications.join(', ') : 'N/A'}</p><hr>
                <p><strong>Facilities:</strong> ${jobData.facilities || 'N/A'}</p><hr>
                <p><strong>Description:</strong> ${jobData.description || 'N/A'}</p>
            `;
            jobDetailsPopup.style.display = 'flex';
        } else {
            alert("Job details not found.");
        }
    }).catch((error) => {
        console.error("Error fetching job details:", error);
        alert("Failed to load job details.");
    });
}

// Close job details pop-up
document.getElementById('closeViewJobDetailsPopup').addEventListener('click', () => {
    document.getElementById('viewJobDetailsPopup').style.display = 'none';
});

function showLoader() {
    const loader = document.getElementById('paginationLoader');
    if (loader) {
        loader.style.display = 'inline-block';
    }
}

function hideLoader() {
    const loader = document.getElementById('paginationLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}
// Update the job table
async function updateJobTable() {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    // Show loader while updating job table
    showLoader();

    try {
        // Sort and filter jobs
        filteredJobs.sort((a, b) => {
            const timeA = a.unarchivedAt ? a.unarchivedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
            const timeB = b.unarchivedAt ? b.unarchivedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
            return timeB - timeA;
        });

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const jobsToDisplay = filteredJobs.slice(start, end);

        // Populate job table rows
        jobsToDisplay.forEach(job => {
            const newRow = tableBody.insertRow(-1);
            newRow.dataset.id = job.id;

            const checkboxCell = newRow.insertCell();
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'circular-checkbox';
            checkbox.dataset.id = job.id;
            checkboxCell.appendChild(checkbox);

            const cells = ['position', 'company', 'location', 'vacancy', 'type', 'email'];
            cells.forEach(field => {
                const cell = newRow.insertCell();
                cell.textContent = job[field] || 'N/A';
            });
            const viewCell = newRow.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => viewJobDetails(job.id));
            viewCell.appendChild(viewButton);
        });

        document.getElementById('jobCount').textContent = `Total Jobs: ${filteredJobs.length}`;
        updatePaginationControls();
    } catch (error) {
        console.error("Failed to update job table:", error);
    } finally {
        // Hide loader after updating job table
        hideLoader();
    }
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

// Pagination controls
function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    const pageDisplay = document.createElement('span');
    pageDisplay.textContent = `${currentPage} of ${totalPages}`;
    paginationControls.appendChild(pageDisplay);

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', async () => {
        showLoader();
        currentPage--;
        await updateJobTable();
        hideLoader();
    });
    paginationControls.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', async () => {
        showLoader();
        currentPage++;
        await updateJobTable();
        hideLoader();
    });
    paginationControls.appendChild(nextButton);
}

//Export auditLogs
document.getElementById('exportAuditLogBtn').addEventListener('click', () => {
    exportAuditLog().then(csvContent => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'audit_log.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(error => {
        console.error("Error exporting audit log:", error);
    });
});
// Attach event listener to the Archive Selected Jobs button
document.getElementById('archiveSelectedJobsButton').addEventListener('click', archiveSelectedJobs);

async function archiveSelectedJobs() {
    const checkedBoxes = document.querySelectorAll('#jobTable tbody input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        alert("No jobs selected for archiving.");
        return;
    }

    const confirmationDialog = document.getElementById('confirmationDialog');
    confirmationDialog.style.display = 'flex';

    document.getElementById('confirmArchiveBtn').onclick = async () => {
        confirmationDialog.style.display = 'none';
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";

        for (const box of checkedBoxes) {
            const jobId = box.closest('tr').dataset.id;
            await archiveJobIfNeeded(jobId, userEmail);
            box.closest('tr').remove();
        }
        window.location.reload();
    };

    document.getElementById('cancelArchiveBtn').onclick = () => {
        confirmationDialog.style.display = 'none';
    };
}

// Archive job function
async function archiveJobIfNeeded(jobId, userEmail) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();
            const archiveData = {
                ...jobData,
                archivedAt: Timestamp.now()
            };

            await addDoc(collection(firestore, 'archive'), archiveData);
            await deleteDoc(jobDocRef);
            await logAudit(userEmail, "Job Archived", { jobId });
            console.log(`Archived job with ID: ${jobId}`);
        }
    } catch (error) {
        console.error(`Failed to archive job with ID: ${jobId}`, error);
        alert(`Failed to archive job with ID: ${jobId}.`);
    }
}

document.getElementById('generateLinkButton').addEventListener('click', async () => {
    const companyName = prompt("Enter the company name for which you want to generate the link:").trim().toLowerCase();
    if (companyName) {
        const link = await generateDisposableLink(companyName);
        if (link) {
            // Display the link and update the link text
            document.getElementById('disposableLinkText').textContent = link;
            document.getElementById('disposableLinkContainer').style.display = 'block';

            // Automatically copy the link to the clipboard
            document.getElementById('copyLinkButton').addEventListener('click', () => {
                copyToClipboard(link);
            });
        } else {
            alert("Failed to generate the link. Please try again.");
        }
    }
});
