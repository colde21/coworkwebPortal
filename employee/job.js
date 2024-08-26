import { fetchAllJobs, updateJobStatus, logAudit } from './database.js';
import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

const firebaseConfig = {
    // Your Firebase config
};

// Initialize Firebase if not already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

async function performSignOut() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    try {
        await firebaseSignOut(auth);
        await logAudit(userEmail, "Sign out", { status: "Success" });
        window.location.href = "../login.html";
    } catch (error) {
        await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
        console.error("Error signing out:", error);
    }
}

document.getElementById('signOutBtn').addEventListener('click', performSignOut);

document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', handleSearch);

    document.getElementById('sortAsc').addEventListener('click', () => handleSort('asc'));
    document.getElementById('sortDesc').addEventListener('click', () => handleSort('desc'));

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs; // Store all jobs in a global variable for filtering and sorting
        updateJobTable(jobs);
    }).catch(err => console.error("Failed to fetch jobs:", err));
});

function updateJobTable(jobs) {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows
    let count = 0; // Initialize job count

    jobs.forEach(job => {
        count++; // Increment for each job
        const newRow = tableBody.insertRow(-1);
        newRow.dataset.id = job.id;

        // Append cells for specific columns
        const cells = ['position', 'company', 'location', 'vacancy', 'type', 'contact'];
        cells.forEach(field => {
            const cell = newRow.insertCell();
            cell.textContent = job[field] || 'N/A';
        });
    });

    document.getElementById('jobCount').textContent = `Total Jobs: ${count}`;
}


function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    const filteredJobs = window.allJobs.filter(job => {
        return job.company.toLowerCase().includes(query);
    });
    updateJobTable(filteredJobs);
}


function handleSort(order) {
    const sortBy = document.getElementById('sortBy').value;
    const sortedJobs = [...window.allJobs].sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return order === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return order === 'asc' ? 1 : -1;
        return 0;
    });
    updateJobTable(sortedJobs);
}
//delete selected job
async function deleteSelectedJobs() {
    const checkedBoxes = document.querySelectorAll('#jobTable tbody input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        alert("No jobs selected for deletion.");
        return;
    }

    const confirmation = confirm("Are you sure you want to delete the selected jobs?");
    if (!confirmation) {
        return; // User cancelled the deletion
    }

    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    checkedBoxes.forEach(async (box) => {
        const jobId = box.closest('tr').dataset.id;
        try {
            await deleteJobById(jobId);
            box.closest('tr').remove();
            console.log(`Deleted job with ID: ${jobId}`);
            await logAudit(userEmail, "Job Deleted", { jobId });
        } catch (error) {
            console.error(`Failed to delete job with ID: ${jobId}`, error);
        }
    });
}