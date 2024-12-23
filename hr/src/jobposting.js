import { submitJobData, logAudit } from './db.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { Timestamp, getDoc, doc, getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// Your Firebase configuration
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
const auth = getAuth();
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

// Navigation setup
function setupNavigation() {
    document.getElementById('homeButton').addEventListener('click', function () {
        location.href = '../dashboard_hr.html';
    });

    document.getElementById('jobButton').addEventListener('click', function () {
        location.href = 'job.html';
    });

    document.getElementById('appButton').addEventListener('click', function () {
        location.href = '../application.html';
    });

    document.getElementById('archiveButton').addEventListener('click', function () {
        location.href = '../archive.html';
    });
}
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
        let isValid = true;

        confirmationDialog.style.display = 'flex'; // Show confirmation dialog

             // Validate position (character limit: 50)
             const position = document.getElementById('position');
             const positionRegex = /^[a-zA-Z\s]+$/;
             if (position.value.trim() === '' || position.value.length > 50 || !positionRegex.test(position.value)) {
                 alert('Position is required, cannot exceed 50 characters, and must not contain numbers.');
                 isValid = false;
             }
     
             // Validate location (character limit: 100)
             const location = document.getElementById('location');
             if (location.value.trim() === '' || location.value.length > 100) {
                 alert('Location is required and cannot exceed 100 characters.');
                 isValid = false;
             }
     
             // Validate age (range: 18-60)
             const age = parseInt(document.getElementById('age').value, 10);
             if (isNaN(age) || age < 18 || age > 60) {
                 alert('Age must be between 18 and 60.');
                 isValid = false;
             }
     
             // Validate contact (character limit: 50)
             const contact = document.getElementById('contactPerson');
             if (contact.value.trim() === '' || contact.value.length > 50 || !positionRegex.test(contact.value)) {
                alert('Contact person is required, cannot exceed 50 characters, and must not contain numbers.');
                isValid = false;
            }
     
             // Validate email (valid format)
             const email = document.getElementById('email');
             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
             if (!emailRegex.test(email.value)) {
                 alert('Please enter a valid email address.');
                 isValid = false;
             }
     
             // Validate facilities (character limit: 200)
             const facilities = document.getElementById('facilities');
             if (facilities.value.length > 200) {
                 alert('Facilities cannot exceed 200 characters.');
                 isValid = false;
             }
     
             // Validate description (character limit: 500)
             const description = document.getElementById('description');
             if (description.value.length > 500) {
                 alert('Description cannot exceed 500 characters.');
                 isValid = false;
             }
     
             // Validate salary (positive number)
             const salary = document.getElementById('salary');
             if (!/^\d+$/.test(salary.value) || parseInt(salary.value, 10) <= 0) {
                 alert('Salary must be a positive number.');
                 isValid = false;
             }
              // Validate contact number (10-12 digits)
              const contactNumber = document.getElementById('contactNumber');
              const contactNumberRegex = /^\d{10,12}$/;
              if (!contactNumberRegex.test(contactNumber.value)) {
                alert('Contact number must be 10-12 digits long and only contain numbers.');
                isValid = false;
            }
             

             // Validate company name (character limit: 50)
             const company = document.getElementById('company');
             if (company.value.trim() === '' || company.value.length > 50) {
                 alert('Company name is required and cannot exceed 50 characters.');
                 isValid = false;
             }
     
             // Validate job type (selection required)
             const jobType = document.getElementById('type');
             if (!jobType.value) {
                 alert('Please select a job type.');
                 isValid = false;
             }
     
             // Validate vacancy (positive number)
             const vacancy = document.getElementById('vacancy');
             if (!/^\d{1,2}$/.test(vacancy.value) || parseInt(vacancy.value, 10) <= 0) {
                alert('Vacancy must be a positive number and contain at most two digits.');
                isValid = false;
             }
     
             // Validate job category (selection required)
             const jobCategory = document.getElementById('jobType');
             if (!jobCategory.value) {
                 alert('Please select a job category.');
                 isValid = false;
             }
             if (isValid) {
                confirmationDialog.style.display = 'flex'; // Show confirmation dialog
            }
            else{
                 confirmationDialog.style.display = 'none'
            }
          
        
    });
    // Cancel submission and hide confirmation dialog
    cancelSubmitBtn.addEventListener('click', () => {
        confirmationDialog.style.display = 'none'; // Hide confirmation dialog
    });

    age.addEventListener('input', () => {
        age.value = age.value.replace(/[^0-9]/g, '');
        if (age.value.length > 2) {
            age.value = age.value.slice(0, 2);
        }
    
        const ageValue = parseInt(age.value, 10);
        if (ageValue > 60) {
            age.value = '60';
        } else if (ageValue < 18 && age.value.length === 2) {
            age.value = '18';
        }
    });
    
    vacancy.addEventListener('input', () => {
        vacancy.value = vacancy.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        if (vacancy.value.length > 2) {
            vacancy.value = vacancy.value.slice(0, 2); // Restrict to two digits
        }
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
            // Log the audit action for successful job posting
            await logAudit(userEmail, "Job Added", {
                jobId,
                jobData: entries,
                status: "Success",
                timestamp: new Date().toISOString()
            });
    
            successMessage.style.display = 'flex'; // Show success message
        } catch (error) {
            // Log the audit action for failed job posting
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

});
document.addEventListener('DOMContentLoaded', async() => {
    setupNavigation();
    const buttons = document.querySelectorAll('.links button');
    buttons.forEach(button => button.classList.remove('active'));

    const loadingScreen = document.getElementById('loading-screen');
    const skillsContainer = document.querySelector('.skills-container');
    const skillInput = document.getElementById('skillInput');
    const qualificationsContainer = document.querySelector('.qualifications-container');
    const qualificationInput = document.getElementById('qualificationInput');
    const maxSkills = 5;
    const maxQualifications = 5;
    
    const jobButton = document.getElementById('jobButton');
    if (jobButton) {
        jobButton.classList.add('active');
    }
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

        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('jobId'); // Retrieve `jobId` from URL
    
        if (jobId) {
            console.log('Job ID found in URL:', jobId); // Debugging
            await prefillForm(jobId); // Call prefillForm with the jobId
        } else {
            console.log('No Job ID found in URL.'); // Debugging
        }
        loadingScreen.style.display = 'none'; 
});

// Prefill the form fields based on the selected job data
async function prefillForm(jobId) {
    try {
        console.log('Fetching job data for Job ID:', jobId);
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDoc = await getDoc(jobDocRef);

        if (jobDoc.exists()) {
            const jobData = jobDoc.data();

            // Fill fields
            document.getElementById('company').value = jobData.company || '';
            document.getElementById('contactPerson').value = jobData.contact || '';
            document.getElementById('contactNumber').value = jobData.contactNumber || '';
            document.getElementById('email').value = jobData.email || '';

            // Log the audit action for pre-filling job details
            const user = auth.currentUser;
            const userEmail = user ? user.email : "Unknown user";
            await logAudit(userEmail, "Accessed Job Details", {
                jobId,
                status: "Success",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error pre-filling form:', error);
        alert('Failed to pre-fill job details. Please try again.');

        // Log the audit action for failed pre-filling
        const user = auth.currentUser;
        const userEmail = user ? user.email : "Unknown user";
        await logAudit(userEmail, "Accessed Job Details", {
            jobId,
            status: "Failed",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const goBackButton = document.getElementById('goBackButton');
    if (goBackButton) {
        goBackButton.addEventListener('click', () => {
            window.location.href = "../Jobs/job.html";
        });
    } else {
        console.error("Go Back button not found in the DOM.");
    }
});