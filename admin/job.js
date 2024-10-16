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

    const archiveButton = document.getElementById('archiveSelectedJobsButton');
    archiveButton.addEventListener('click', archiveSelectedJobs);

    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs;
        filteredJobs = jobs;
        updateJobTable();
    }).catch(err => console.error("Failed to fetch jobs:", err));
});

// Update the job table
function updateJobTable() {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    filteredJobs.sort((a, b) => {
        const timeA = a.unarchivedAt ? a.unarchivedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
        const timeB = b.unarchivedAt ? b.unarchivedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
        return timeB - timeA;
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
// Archive selected jobs
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

// Edit job function
async function editJob(jobId) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // List of fields to update
            const fields = {
                position: 'position',
                company: 'company',
                location: 'location',
                age: 'age',
                type: 'type',
                vacancy: 'vacancy',
                contact: 'email',
                facilities: 'facilities', 
                education: 'education',
                description: 'description',
                experience1: 'experience1', experience2: 'experience2', experience3: 'experience3',
                skills1: 'skills1', skills2: 'skills2', skills3: 'skills3', skills4: 'skills4', skills5: 'skills5',
                qualification1: 'qualification1', qualification2: 'qualification2', qualification3: 'qualification3', qualification4: 'qualification4', qualification5: 'qualification5',
                expsalary: 'expectedSalary'
            };

            // Iterate over the fields and set values if elements exist
            for (const [key, fieldId] of Object.entries(fields)) {
                const fieldElement = document.getElementById(fieldId);
                if (fieldElement) {
                    fieldElement.value = jobData[key] || '';
                } else {
                    console.warn(`Element with id "${fieldId}" not found.`);
                }
            }

            // Set the selected radio button based on jobData
            if (jobData.jobType) {
                const jobTypeRadio = document.querySelector(`input[name="jobType"][value="${jobData.jobType}"]`);
                if (jobTypeRadio) {
                    jobTypeRadio.checked = true;
                }
            }

            // Show the edit form and store jobId in dataset
            const editJobForm = document.getElementById('editJobForm');
            editJobForm.dataset.jobId = jobId;
            editJobForm.style.display = 'block';

            // Add blur effect to background
            document.querySelector('.job-container').classList.add('blur');
        } else {
            alert('Job not found!');
        }
    } catch (error) {
        console.error('Error fetching job for editing:', error);
    }
}
// Save job changes
document.getElementById('saveJobButton').addEventListener('click', function(event) {
    event.preventDefault();

    // Show the confirmation dialog before saving the job
    const editJobConfirmation = document.getElementById('editJobConfirmation');
    editJobConfirmation.style.display = 'flex';

    // If the user confirms the changes
    document.getElementById('confirmEditJobBtn').addEventListener('click', async function() {
        editJobConfirmation.style.display = 'none'; // Hide the confirmation dialog

        const jobId = document.getElementById('editJobForm').dataset.jobId;
        if (!jobId) {
            alert('No job ID found. Please refresh and try again.');
            return;
        }

        // Get the selected job type radio button value
        const selectedJobType = document.querySelector('input[name="jobType"]:checked')?.value || '';

        const updatedData = {
            position: document.getElementById('position')?.value || '',
            company: document.getElementById('company')?.value || '',
            location: document.getElementById('location')?.value || '',
            age: document.getElementById('age')?.value || '',
            type: document.getElementById('type')?.value || '',
            vacancy: document.getElementById('vacancy')?.value || '',
            contact: document.getElementById('email')?.value || '',
            skills1: document.getElementById('skills1')?.value || '',
            skills2: document.getElementById('skills2')?.value || '',
            skills3: document.getElementById('skills3')?.value || '',
            skills4: document.getElementById('skills4')?.value || '',
            skills5: document.getElementById('skills5')?.value || '',
            education: document.getElementById('education')?.value || '',
            qualification1: document.getElementById('qualification1')?.value || '',
            qualification2: document.getElementById('qualification2')?.value || '',
            qualification3: document.getElementById('qualification3')?.value || '',
            qualification4: document.getElementById('qualification4')?.value || '',
            qualification5: document.getElementById('qualification5')?.value || '',
            facilities: document.getElementById('facilities')?.value || '',
            description: document.getElementById('description')?.value || '',
            expsalary: document.getElementById('expectedSalary')?.value || '',
            experience1: document.getElementById('experience1')?.value || '',
            experience2: document.getElementById('experience2')?.value || '',
            experience3: document.getElementById('experience3')?.value || '',
            jobType: selectedJobType, // Add the selected job type
        };

        try {
            const jobDocRef = doc(firestore, 'jobs', jobId);
            await updateDoc(jobDocRef, updatedData);
            await logAudit(auth.currentUser.email, 'Job Edited', { jobId, updatedData });

            // Show success message
            const successMessage = document.getElementById('successMessage');
            successMessage.style.display = 'flex';

            // Close the success message and reset form
            document.getElementById('closeSuccessBtn').addEventListener('click', () => {
                successMessage.style.display = 'none';
                document.getElementById('editJobForm').style.display = 'none';
                document.querySelector('.job-container').classList.remove('blur');
                fetchAllJobs().then(jobs => {
                    window.allJobs = jobs;
                    filteredJobs = jobs;
                    updateJobTable();
                });
            });
        } catch (error) {
            console.error('Error updating job:', error);
            alert('Failed to update the job. Please try again.');
        }
    });

    // If the user cancels the changes
    document.getElementById('cancelEditJobBtn').addEventListener('click', function() {
        document.getElementById('editJobConfirmation').style.display = 'none';
    });
});
// "Go Back" button functionality
document.getElementById('goBackButton').addEventListener('click', function () {
    document.getElementById('editJobForm').style.display = 'none';
    document.querySelector('.job-container').classList.remove('blur');
});

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

// Function to copy the link to the clipboard
function copyToClipboard(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
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