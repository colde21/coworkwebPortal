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
        const loadingScreen = document.getElementById('loading-screen');
        
        // Show the loading screen
        loadingScreen.style.display = 'flex';

        const formData = new FormData(this);
        const entries = Object.fromEntries(formData.entries());
        entries.createdAt = Timestamp.now();

        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";
        entries.status = 'open';

        const age = parseInt(entries.age, 10);
        if (isNaN(age) || age < 18 || age > 60) {
            alert('Please enter a valid age between 18 and 60.');
            loadingScreen.style.display = 'none'; // Hide the loading screen if age is invalid
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
        } finally {
            // Hide the loading screen after form submission is complete
            loadingScreen.style.display = 'none';
        }
    });

    const goBackButton = document.querySelector('input[type="button"]');
    goBackButton.addEventListener('click', () => {
        window.location.href = "../admin/job.html";
    });
});
