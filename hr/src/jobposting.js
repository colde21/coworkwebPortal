import { submitJobData, logAudit } from './db.js';
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

    const skillsContainer = document.querySelector('.skills-container');
    const qualificationsContainer = document.querySelector('.qualifications-container');
    const maxSkills = 5;
    const maxQualifications = 5;

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
    confirmSubmitBtn.addEventListener('click', async function () {
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
    
        // Process skills
        const skillTags = Array.from(skillsContainer.querySelectorAll('.skill-tag'));
        const skills = skillTags.map(skillTag => skillTag.textContent.replace('×', '').trim());
        entries.skills = skills;
    
        // Process qualifications
        const qualificationTags = Array.from(qualificationsContainer.querySelectorAll('.qualification-tag'));
        const qualifications = qualificationTags.map(qualificationTag => qualificationTag.textContent.replace('×', '').trim());
        entries.qualifications = qualifications;
    
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
        window.location.href = '../Jobs/job.html'; // Redirect to job list page
    });

    // Go back button functionality
    const goBackButton = document.querySelector('input[type="button"]');
    goBackButton.addEventListener('click', () => {
        window.location.href = "../Jobs/job.html";
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const skillsContainer = document.querySelector('.skills-container');
    const skillInput = document.getElementById('skillInput');
    const qualificationsContainer = document.querySelector('.qualifications-container');
    const qualificationInput = document.getElementById('qualificationInput');
    const maxSkills = 5;
    const maxQualifications = 5;

    // Function to add a new skill
    function addSkill(skill) {
        const skillTags = skillsContainer.querySelectorAll('.skill-tag');
        if (skillTags.length >= maxSkills) {
            alert(`You can only add up to ${maxSkills} skills.`);
            return;
        }

        const skillTag = document.createElement('span');
        skillTag.className = 'skill-tag';
        skillTag.textContent = skill;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-skill';
        removeButton.textContent = '×';
        removeButton.onclick = () => skillsContainer.removeChild(skillTag);

        skillTag.appendChild(removeButton);
        skillsContainer.appendChild(skillTag);
    }

    // Add skill on Enter key press or button click
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && skillInput.value.trim()) {
            e.preventDefault();
            addSkill(skillInput.value.trim());
            skillInput.value = '';
        }
    });

    document.getElementById('addSkillButton').addEventListener('click', () => {
        const skillInput = document.getElementById('skillInput');
        if (skillInput.value.trim()) {
            addSkill(skillInput.value.trim());
            skillInput.value = '';
        }
    });
    // Function to add a new qualification
    function addQualification(qualification) {
        const qualificationTags = qualificationsContainer.querySelectorAll('.qualification-tag');
        if (qualificationTags.length >= maxQualifications) {
            alert(`You can only add up to ${maxQualifications} qualifications.`);
            return;
        }

        const qualificationTag = document.createElement('span');
        qualificationTag.className = 'qualification-tag';
        qualificationTag.textContent = qualification;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-qualification';
        removeButton.textContent = '×';
        removeButton.onclick = () => qualificationsContainer.removeChild(qualificationTag);

        qualificationTag.appendChild(removeButton);
        qualificationsContainer.appendChild(qualificationTag);
    }
    // Add qualification on Enter key press or button click
    qualificationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && qualificationInput.value.trim()) {
            e.preventDefault();
            addQualification(qualificationInput.value.trim());
            qualificationInput.value = '';
        }
    });

    document.getElementById('addQualificationButton').addEventListener('click', () => {
        if (qualificationInput.value.trim()) {
            addQualification(qualificationInput.value.trim());
            qualificationInput.value = '';
        }
    });
});