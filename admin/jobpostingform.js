import { submitJobData, logAudit } from './database.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const auth = getAuth();
document.addEventListener('DOMContentLoaded', () => {
    

    function requireLogin() {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = '/login.html';
            }
        });
    }
    requireLogin();

    // Form Submission
    document.getElementById('jobForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(this);
        const entries = Object.fromEntries(formData.entries());
        entries.createdAt = Timestamp.now();

        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";
        entries.status = 'open';

        const age = parseInt(entries.age, 10);
        if (isNaN(age) || age < 18 || age > 60) {
            alert('Please enter a valid age between 18 and 60.');
            return;
        }

        try {
            const jobId = await submitJobData(entries);
            await logAudit(userEmail, "Job Added", {
                jobId,
                jobData: entries,
                status: "Success",
                timestamp: new Date().toISOString()
            });
            
            alert("Job posted successfully!");
            window.location.href = '../admin/job.html';
        } catch (error) {
            await logAudit(userEmail, "Job Posting Failed", {
                status: "Failed",
                error: error.message,
                timestamp: new Date().toISOString()
            });
            alert("Failed to post job.");
        }
    });

    const goBackButton = document.querySelector('input[type="button"]');
    goBackButton.addEventListener('click', () => {
        window.location.href = "../admin/job.html";
    });
});