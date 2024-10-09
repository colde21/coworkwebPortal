import { submitJobData, logAudit } from './database.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const auth = getAuth();

function requireLogin() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/login.html';
        }
    });
}
requireLogin();

// Enable and Disable Qualifications and Skills fields based on checkboxes
const enableQualificationsCheckbox = document.getElementById('enableQualifications');
const qualificationsInput = document.getElementById('qualifications');

enableQualificationsCheckbox.addEventListener('change', function () {
    qualificationsInput.disabled = !this.checked;
});

// Handle enable/disable for skills
const enableSkillsCheckbox = document.getElementById('enableSkills');
const skillsInput = document.getElementById('skills');

enableSkillsCheckbox.addEventListener('change', function () {
    skillsInput.disabled = !this.checked;
});

// Toggle fields based on checkboxes
enableQualificationsCheckbox.addEventListener('change', () => {
    qualificationsInput.disabled = !enableQualificationsCheckbox.checked;
});

enableSkillsCheckbox.addEventListener('change', () => {
    skillsInput.disabled = !enableSkillsCheckbox.checked;
});

// Form Submission
document.getElementById('jobForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Ensure at least one field is enabled before submission
    if (!enableQualificationsCheckbox.checked && !enableSkillsCheckbox.checked) {
        alert('Please enable either Qualifications or Skills.');
        return;
    }

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

const goBackButton = document.querySelector('#jobForm input[type="button"]');
goBackButton.addEventListener('click', () => {
    window.location.href = "../admin/job.html";
});
