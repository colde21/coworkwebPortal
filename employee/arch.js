import { fetchArchivedJobs, logAudit, deleteArchivedJob } from './database.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, doc, addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const firestore = getFirestore(app);  // Initialize Firestore

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
// display unarchive function and delete //
function showConfirmationDialog(message, onConfirm) {
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmButton = document.getElementById('confirmActionBtn');
    const cancelButton = document.getElementById('cancelActionBtn');

    confirmationMessage.textContent = message;
    confirmationDialog.style.display = 'flex'; // Show the dialog

    // Remove any previously attached event listeners to avoid conflicts
    confirmButton.replaceWith(confirmButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));

    // Attach the event listeners for confirmation and cancellation
    document.getElementById('confirmActionBtn').onclick = () => {
        confirmationDialog.style.display = 'none'; // Hide the dialog
        onConfirm();
    };
    
    document.getElementById('cancelActionBtn').onclick = () => {
        confirmationDialog.style.display = 'none'; // Just hide the dialog on cancel
    };
}
//Display Edit Vacancy//
function showVacancyInputDialog(message, defaultValue, onConfirm) {
    const vacancyDialog = document.getElementById('vacancyDialog');
    const vacancyMessage = document.getElementById('vacancyDialogMessage');
    const vacancyInput = document.getElementById('vacancyInput');
    const confirmButton = document.getElementById('confirmVacancyBtn');
    const cancelButton = document.getElementById('cancelVacancyBtn');

    vacancyMessage.textContent = message;
    vacancyInput.value = defaultValue; // Set the default value in the input
    vacancyDialog.style.display = 'flex'; // Show the dialog

    // Remove any previously attached event listeners to avoid conflicts
    confirmButton.replaceWith(confirmButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));

    // Attach the event listeners for confirming and canceling
    document.getElementById('confirmVacancyBtn').onclick = () => {
        const newValue = vacancyInput.value;
        if (newValue !== null && !isNaN(newValue) && newValue >= 0) {
            vacancyDialog.style.display = 'none'; // Hide the dialog
            onConfirm(newValue); // Call the confirmation callback with the new value
        } else {
            alert('Please enter a valid vacancy number.');
        }
    };

    document.getElementById('cancelVacancyBtn').onclick = () => {
        vacancyDialog.style.display = 'none'; // Just hide the dialog on cancel
    };
}

// Check for old archived jobs and delete them if they are older than 5 years
async function deleteOldArchivedJobs() {
    const archivedJobs = await fetchArchivedJobs(); // Fetch all archived jobs
    const fiveYearsInMillis = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
    const now = Date.now(); // Get current time

    archivedJobs.forEach(async job => {
        if (job.archivedAt) {
            const archivedTime = job.archivedAt.toMillis(); // Convert Firestore timestamp to milliseconds
            if (now - archivedTime > fiveYearsInMillis) {
                // Job is older than 5 years, delete it
                await deleteArchivedJob(job.id);
                console.log(`Deleted archived job with ID: ${job.id} because it was older than 5 years.`);
            }
        }
    });
}

// Event listener for when the document content is loaded
document.addEventListener('DOMContentLoaded', async () => {
    requireLogin(); 
    await deleteOldArchivedJobs(); // Check and delete old archived jobs
    fetchArchivedJobs().then(jobs => {
        updateArchiveTable(jobs); // Your function that displays the archived jobs
    }).catch(err => console.error("Failed to fetch archived jobs:", err));
});

function updateArchiveTable(jobs) {
    const container = document.querySelector('.container');
    const list = document.createElement('ul');
    
    jobs.forEach(job => {
        const listItem = document.createElement('li');
        listItem.className = 'archived-job';
        
        const title = document.createElement('div');
        title.className = 'jobTitle';
        title.textContent = job.position;
        
        const company = document.createElement('div');
        company.className = 'company';
        company.textContent = job.company;
        
        const location = document.createElement('div');
        location.className = 'location';
        location.textContent = job.location;

        listItem.appendChild(title);
        listItem.appendChild(company);
        listItem.appendChild(location);
        list.appendChild(listItem);
    });

    container.appendChild(list);
}

// Function to unarchive a job with vacancy editing
async function unarchiveJob(jobId) {
    const jobDocRef = doc(firestore, `archive/${jobId}`);
    const jobData = await getDoc(jobDocRef);

    if (jobData.exists()) {
        // Use custom vacancy input dialog instead of prompt
        showConfirmationDialog("Do you want to unarchive this job?", async () => {
            const currentVacancy = jobData.data().vacancy || 0;
            showVacancyInputDialog(
                `Edit the vacancy number for "${jobData.data().position}" at "${jobData.data().company}":`,
                currentVacancy,
                async (newVacancy) => {
                    // Second confirmation before unarchiving
                    showConfirmationDialog("Are you sure you want to unarchive this job with the updated vacancy?", async () => {
                        try {
                            const user = auth.currentUser;
                            const userEmail = user ? user.email : "Unknown user";
                            
                            // Add the updated job back to the jobs collection
                            await addDoc(collection(firestore, 'jobs'), updatedJobData);

                            // Remove the job from the archive collection
                            await deleteArchivedJob(jobId);

                            // Log the unarchive action
                            await logAudit(userEmail, "Job Unarchived", { jobId, newVacancy });

                            window.location.reload(); // Reload to update the archive list
                        } catch (error) {
                            console.error(`Failed to unarchive job ${jobId}:`, error);
                        }
                    });
                }
            );
        });
    } else {
        alert("Job data not found.");
    }
}
