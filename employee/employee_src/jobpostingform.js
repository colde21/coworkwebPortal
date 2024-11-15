import { submitJobData, logAudit } from './database.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const auth = getAuth();

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
    const successMessage = document.getElementById('successMessage');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    function requireLogin() {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = '/login.html';
            }
        });
    }
    requireLogin();

    // Show confirmation dialog when form is submitted
    document.getElementById('jobForm').addEventListener('submit', function(event) {
        event.preventDefault();
        confirmationDialog.style.display = 'flex'; // Show confirmation dialog
    });

    // Cancel submission and hide confirmation dialog
    cancelSubmitBtn.addEventListener('click', () => {
        confirmationDialog.style.display = 'none'; // Hide confirmation dialog
    });

    // Confirm submission and handle form submission
    confirmSubmitBtn.addEventListener('click', async function() {
        confirmationDialog.style.display = 'none'; // Hide confirmation dialog
        loadingScreen.style.display = 'flex'; // Show loading screen

        const formData = new FormData(document.getElementById('jobForm'));
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
            
            successMessage.style.display = 'flex'; // Show success message
        } catch (error) {
            await logAudit(userEmail, "Job Posting Failed", {
                status: "Failed",
                error: error.message,
                timestamp: new Date().toISOString()
            });
            alert("Failed to post job.");
        } finally {
            loadingScreen.style.display = 'none'; // Hide the loading screen after form submission is complete
        }
    });

    // Close success message
    closeSuccessBtn.addEventListener('click', () => {
        successMessage.style.display = 'none'; // Hide success message
        window.location.href = '../admin/job.html'; // Redirect to job list page
    });

    // Go back button functionality
    const goBackButton = document.querySelector('input[type="button"]');
    goBackButton.addEventListener('click', () => {
        window.location.href = "../admin/job.html";
    });
});
