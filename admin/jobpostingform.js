import { submitJobData, logAudit } from './database.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js"; // Import Firestore Timestamp


const auth = getAuth();

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
requireLogin(); 

document.getElementById('jobForm').addEventListener('submit', async function(event) { //Update the log audit here
    event.preventDefault(); // Prevent default form submission behavior
    
    const formData = new FormData(this);
    const entries = Object.fromEntries(formData.entries()); // Convert FormData entries into a plain object
    entries.createdAt = Timestamp.now(); // Set Firestore timestamp for the createdAt field

    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user"; // Get the logged-in user's email

    // Set the job status to 'open' by default
    entries.status = 'open';
    
    // Validate required fields
    if (!entries.position || !entries.company || !entries.age) {
        alert('Please fill in all required fields.');
        return;
    }

    // Age requirement validation
    const age = parseInt(entries.age, 10);
    if (isNaN(age) || age < 18 || age > 60) {
        alert('Please enter a valid age between 18 and 60.');
        return;
    }

    try {
        // Submit the job data to Firestore
        const jobId = await submitJobData(entries);
        console.log('Job added with ID:', jobId);

        // Log the audit entry with detailed information
        await logAudit(userEmail, "Job Added", {
            jobId, 
            jobData: entries,
            status: "Success", 
            timestamp: new Date().toISOString() // Use ISO format for logging
        });
        
        alert("Job posted successfully!");
        window.location.href = '../admin/job.html' || 'job.html'; // Redirect to the job list page on success

    } catch (error) {
        console.error("Error posting job:", error);

        // Log the error to the audit trail for troubleshooting
        await logAudit(userEmail, "Job Posting Failed", {
            status: "Failed",
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        alert("Failed to post job.");
    }
});


const goBackButton = document.querySelector('#jobForm input[type="button"]');

goBackButton.addEventListener('click', () => {
    // Redirect to the previous page
    window.location.href = "../admin/job.html" || "job.html";
});
document.getElementById('facilities').addEventListener('input', function() {
    const maxLength = 500;
    const currentLength = this.value.length;
    const remaining = maxLength - currentLength;
    
    const facilitiesCount = document.getElementById('facilitiesCount');
    facilitiesCount.textContent = `${remaining} characters remaining`;

    if (remaining < 0) {
        facilitiesCount.style.color = 'red';
    } else {
        facilitiesCount.style.color = 'black';
    }
});

document.getElementById('description').addEventListener('input', function() {
    const maxLength = 500;
    const currentLength = this.value.length;
    const remaining = maxLength - currentLength;
    
    const facilitiesCount = document.getElementById('descriptionCount');
    facilitiesCount.textContent = `${remaining} characters remaining`;

    if (remaining < 0) {
        facilitiesCount.style.color = 'red';
    } else {
        facilitiesCount.style.color = 'black';
    }
});

