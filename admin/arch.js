import { fetchArchivedJobs, updateJobStatus, logAudit, deleteArchivedJob } from './database.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, doc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    fetchArchivedJobs().then(jobs => {
        updateArchiveTable(jobs);
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

        // Unarchive button
        const unarchiveButton = document.createElement('button');
        unarchiveButton.textContent = 'Unarchive';
        unarchiveButton.addEventListener('click', () => unarchiveJob(job.id));

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteJob(job.id, listItem));

        listItem.appendChild(title);
        listItem.appendChild(company);
        listItem.appendChild(location);
        listItem.appendChild(unarchiveButton);
        listItem.appendChild(deleteButton);

        list.appendChild(listItem);
    });

    container.appendChild(list);
}

// Function to unarchive a job with vacancy editing
async function unarchiveJob(jobId) {
    // Fetch the job data from the archive
    const jobDocRef = doc(firestore, `archive/${jobId}`);
    const jobData = await getDoc(jobDocRef);

    if (jobData.exists()) {
        // Confirmation before editing the vacancy
        const editConfirmation = confirm("Do you want to unarchive this job?");
        if (!editConfirmation) {
            alert("Unarchiving canceled.");
            return;
        }

        // Prompt the user to edit the vacancy number before unarchiving
        const currentVacancy = jobData.data().vacancy || 0;
        const newVacancy = prompt(`Edit the vacancy number for "${jobData.data().position}" at "${jobData.data().company}":`, currentVacancy);

        if (newVacancy !== null && !isNaN(newVacancy) && newVacancy >= 0) {
            const confirmation = confirm("Are you sure you want to unarchive this job with the updated vacancy?");
            if (confirmation) {
                try {
                    const user = auth.currentUser;
                    const userEmail = user ? user.email : "Unknown user";
                    
                    // Update the vacancy in the job data
                    const updatedJobData = {
                        ...jobData.data(),
                        vacancy: parseInt(newVacancy, 10)
                    };

                    // Add the updated job back to the jobs collection with a new ID
                    await addDoc(collection(firestore, 'jobs'), updatedJobData);

                    // Remove the job from the archive collection
                    await deleteArchivedJob(jobId);

                    // Log the unarchive action
                    await logAudit(userEmail, "Job Unarchived", { jobId, newVacancy });

                    alert(`Job "${updatedJobData.position}" at "${updatedJobData.company}" was successfully unarchived with updated vacancy ${newVacancy}.`);
                    window.location.reload(); // Reload to update the archive list
                } catch (error) {
                    console.error(`Failed to unarchive job ${jobId}:`, error);
                }
            }
        } else {
            alert("Invalid input. The job was not unarchived.");
        }
    } else {
        alert("Job data not found.");
    }
}



// Function to delete a job permanently
async function deleteJob(jobId, listItem) {
    const confirmation = confirm("Are you sure you want to delete this job permanently?");
    if (confirmation) {
        try {
            await deleteArchivedJob(jobId);
            listItem.remove(); // Remove the list item from the DOM
            alert("Job successfully deleted.");
        } catch (error) {
            console.error(`Failed to delete job ${jobId}:`, error);
        }
    }
}
