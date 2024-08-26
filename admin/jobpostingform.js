import { submitJobData, logAudit } from './database.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const auth = getAuth();

document.getElementById('jobForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    const entries = Object.fromEntries(formData.entries());
    const timestamp = new Date().toISOString();

    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown user";

    // Set the status to 'open'
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
        const jobId = await submitJobData(entries);
        console.log('Job added with ID:', jobId);
        await logAudit(userEmail, "Job Added", { jobId, jobData: entries, timestamp });
        
        alert("Job posted successfully!");
        window.location.href = '../admin/job.html' || 'job.html'; // Redirect on success

    } catch (error) {
        console.error("Error posting job:", error);
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