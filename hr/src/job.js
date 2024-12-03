import { fetchAllJobs, logAudit, exportAuditLog, generateDisposableLink } from './db.js';
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, addDoc, doc, collection, deleteDoc, updateDoc, Timestamp,getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// Firebase configuration
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
const firestore = getFirestore(app);
const database = getDatabase(app);
const jobDropdown = document.getElementById('jobDropdown');
const proceedButton = document.getElementById('proceedToJobPosting');

const itemsPerPage = 10;
let currentPage = 1;
let filteredJobs = [];

// Function to ensure user is logged in and check their role
function requireLogin() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
        } else {
            const role = await fetchUserRole(user.uid);
            if (role === 'hr') {
                console.log("Welcome HR");
     
            } else if (role === 'hr2') {
                console.log("Welcome HR2");
 
            } else {
                alert('Unauthorized access. Only HR users are allowed.');
                await firebaseSignOut(auth);
                window.location.href = '/login.html';
            }
        }
    });
}
// Populate dropdown with existing jobs
async function populateJobDropdown() {
    const jobsCol = collection(firestore, 'jobs');
    const jobDocs = await getDocs(jobsCol);

    jobDocs.forEach(doc => {
        const job = doc.data();
        const option = document.createElement('option');
        option.value = doc.id; // Store job ID for reference
        option.textContent = `${job.position} - ${job.company}`;
        jobDropdown.appendChild(option);
    });
}
// Event listener for Proceed button
proceedButton.addEventListener('click', () => {
    const selectedJob = jobDropdown.value;

    if (selectedJob === 'new') {
        // Redirect to job posting form for adding a new job
        window.location.href = 'jobposting.html';
    } else {
        // Redirect to job posting form with the selected job ID
        window.location.href = `jobposting.html?jobId=${selectedJob}`;
    }
});

// Initialize dropdown on page load
document.addEventListener('DOMContentLoaded', () => {
    
});
// Fetch user role from Realtime Database
async function fetchUserRole(userId) {
    try {
        const roleRef = ref(database, `user/${userId}/role`);
        const snapshot = await get(roleRef);
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.error("Role not found for this user.");
            return null;
        }
    } catch (error) {
        console.error('Error fetching user role from Realtime Database:', error);
        return null;
    }
}

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

// Handle sign-out
async function performSignOut() {
    const signOutConfirmation = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    signOutConfirmation.style.display = 'flex';

    confirmSignOutBtn.addEventListener('click', async function () {
        signOutConfirmation.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'flex';

        try {
            const user = auth.currentUser;

            if (!user) {
                throw new Error("No authenticated user found.");
            }

            const userEmail = user.email;
            await logAudit(userEmail, "Sign out", { status: "Success" });
            await firebaseSignOut(auth);
            window.location.href = "/login.html";
        } catch (error) {
            console.error("Error during sign-out:", error);
            const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
            await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            alert(error.message || 'Sign out failed. Please try again.');
        } finally {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    });

    cancelSignOutBtn.addEventListener('click', function () {
        signOutConfirmation.style.display = 'none';
    });
}

// Add event listener to the Sign Out button
if (document.getElementById('signOutBtn')) {
    document.getElementById('signOutBtn').addEventListener('click', performSignOut);
}

// Event listeners and page logic
document.addEventListener('DOMContentLoaded', () => {
    populateJobDropdown();
    setupNavigation();
    requireLogin();
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', performSignOut);
    }
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', handleSearch);
    }

    fetchAllJobs().then(jobs => {
        window.allJobs = jobs;
        filteredJobs = jobs;
        updateJobTable();
    }).catch(err => console.error("Failed to fetch jobs:", err));
});

// Display job details pop-up
function viewJobDetails(jobId) {
    const jobDetailsPopup = document.getElementById('viewJobDetailsPopup');
    const jobDetailsContent = document.getElementById('jobDetailsContent');

    getDoc(doc(firestore, 'jobs', jobId)).then((jobDoc) => {
        if (jobDoc.exists()) {
            const jobData = jobDoc.data();

            // Fetch skills and qualifications as arrays
            const skills = jobData.skills || [];
            const qualifications = jobData.qualifications || [];

            jobDetailsContent.innerHTML = `
                <p><strong>Position:</strong> ${jobData.position || 'N/A'}</p><hr>
                <p><strong>Company:</strong> ${jobData.company || 'N/A'}</p><hr>
                <p><strong>Location:</strong> ${jobData.location || 'N/A'}</p><hr>
                <p><strong>Vacancy:</strong> ${jobData.vacancy || 'N/A'}</p><hr>
                <p><strong>Contact Person:</strong> ${jobData.contactPerson || 'N/A'}</p><hr>
                <p><strong>Contact Number:</strong> ${jobData.contactNumber || 'N/A'}</p><hr>
                <p><strong>Type:</strong> ${jobData.type || 'N/A'}</p><hr>
                 <p><strong>Job Category:</strong> ${jobData.jobType || 'N/A'}</p><hr>
                <p><strong>Email:</strong> ${jobData.email || 'N/A'}</p><hr>
                <p><strong> Salary:</strong> ${jobData.salary || 'N/A'}</p><hr>
                <p><strong>Skills:</strong> ${skills.length > 0 ? skills.join(', ') : 'N/A'}</p><hr>
                <p><strong>Qualifications:</strong> ${qualifications.length > 0 ? qualifications.join(', ') : 'N/A'}</p><hr>
                <p><strong>Facilities:</strong> ${jobData.facilities || 'N/A'}</p><hr>
                <p><strong>Description:</strong> ${jobData.description || 'N/A'}</p>
            `;
            jobDetailsPopup.style.display = 'flex';
        } else {
            alert("Job details not found.");
        }
    }).catch((error) => {
        console.error("Error fetching job details:", error);
        alert("Failed to load job details.");
    });
}


// Close job details pop-up
document.getElementById('closeViewJobDetailsPopup').addEventListener('click', () => {
    document.getElementById('viewJobDetailsPopup').style.display = 'none';
});

function showLoader() {
    const loader = document.getElementById('paginationLoader');
    if (loader) {
        loader.style.display = 'inline-block';
    }
}

function hideLoader() {
    const loader = document.getElementById('paginationLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Update the job table
async function updateJobTable() {
    const tableBody = document.getElementById('jobTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    // Show loader while updating job table
    showLoader();

    try {
        // Sort and filter jobs
        filteredJobs.sort((a, b) => {
            const timeA = a.unarchivedAt ? a.unarchivedAt.seconds : (a.createdAt ? a.createdAt.seconds : 0);
            const timeB = b.unarchivedAt ? b.unarchivedAt.seconds : (b.createdAt ? b.createdAt.seconds : 0);
            return timeB - timeA;
        });

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const jobsToDisplay = filteredJobs.slice(start, end);

        // Populate job table rows
        jobsToDisplay.forEach(job => {
            const newRow = tableBody.insertRow(-1);
            newRow.dataset.id = job.id;
            const cells = ['position', 'company', 'location', 'vacancy', 'type', 'email'];
            cells.forEach(field => {
                const cell = newRow.insertCell();
                cell.textContent = job[field] || 'N/A';
            });

            const editCell = newRow.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => editJob(job.id));
            editCell.appendChild(editButton);

            const viewCell = newRow.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => viewJobDetails(job.id));
            viewCell.appendChild(viewButton);
        });

        document.getElementById('jobCount').textContent = `Total Jobs: ${filteredJobs.length}`;
        updatePaginationControls();
    } catch (error) {
        console.error("Failed to update job table:", error);
    } finally {
        // Hide loader after updating job table
        hideLoader();
    }
}

document.querySelectorAll('.edit-button').forEach(button => {
    button.addEventListener('click', () => {
        const jobId = button.dataset.jobId;
        editJob(jobId);
    });
});

//Search 
function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();

    // Search across multiple fields
    filteredJobs = window.allJobs.filter(job => {
        return (
            (job.position && job.position.toLowerCase().includes(query)) ||
            (job.company && job.company.toLowerCase().includes(query)) ||
            (job.location && job.location.toLowerCase().includes(query)) ||
            (job.vacancy && job.vacancy.toString().toLowerCase().includes(query)) ||
            (job.type && job.type.toLowerCase().includes(query)) ||
            (job.contact && job.contact.toLowerCase().includes(query))
        );
    });

    currentPage = 1; // Reset to first page when search is performed
    updateJobTable();
}
async function hasApplicants(jobId) {
    try {
        const applicationsRef = collection(firestore, 'applied'); // Replace with your actual collection name
        const querySnapshot = await getDocs(applicationsRef);

        // Check if any application belongs to this job
        return querySnapshot.docs.some(doc => doc.data().jobId === jobId);
    } catch (error) {
        console.error('Error checking applicants:', error);
        return false;
    }
}

// Edit job function
async function editJob(jobId) {
    try {
        const applicantsExist = await hasApplicants(jobId);

        // Fetch job details
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Populate form fields
            const fields = {
                position: 'position',
                company: 'company',
                location: 'location',
                age: 'age',
                type: 'type',
                vacancy: 'vacancy',
                contactPerson: 'contactPerson',
                contactNumber: 'contactNumber',
                jobType: 'jobType',
                email: 'email',
                facilities: 'facilities',
                education: 'education',
                description: 'description',
                salary: 'salary',
            };

            for (const [key, fieldId] of Object.entries(fields)) {
                const fieldElement = document.getElementById(fieldId);
                if (fieldElement) {
                    fieldElement.value = jobData[key] || '';
                    fieldElement.disabled = applicantsExist && key !== 'vacancy';
                }
            }

            // Validation handlers for age and vacancy
            const ageField = document.getElementById('age');
            const vacancyField = document.getElementById('vacancy');

            // Restrict age to two digits and within range
            ageField.addEventListener('input', () => {
                ageField.value = ageField.value.replace(/[^0-9]/g, '');
                if (ageField.value.length > 2) {
                    ageField.value = ageField.value.slice(0, 2);
                }

                const ageValue = parseInt(ageField.value, 10);
                if (ageValue > 60) {
                    ageField.value = '60';
                } else if (ageValue < 18 && ageField.value.length === 2) {
                    ageField.value = '18';
                }
            });

            // Restrict vacancy to two digits
            vacancyField.addEventListener('input', () => {
                vacancyField.value = vacancyField.value.replace(/[^0-9]/g, '');
                if (vacancyField.value.length > 2) {
                    vacancyField.value = vacancyField.value.slice(0, 2);
                }
            });
             // Validate contact number (10-12 digits)
             const contactNumber = document.getElementById('contactNumber');
             const contactNumberRegex = /^\d{10,12}$/;
             if (!contactNumberRegex.test(contactNumber.value)) {
               alert('Contact number must be 10-12 digits long and only contain numbers.');
               isValid = false;
           }

            // Skills and Qualifications
            const skillsContainer = document.getElementById('editSkillsContainer');
            skillsContainer.innerHTML = '';
            (jobData.skills || []).forEach(skill => {
                addSkillToContainer(skill, skillsContainer, 'edit', !applicantsExist);
            });

            const qualificationsContainer = document.getElementById('editQualificationsContainer');
            qualificationsContainer.innerHTML = '';
            (jobData.qualifications || []).forEach(qualification => {
                addQualificationToContainer(qualification, qualificationsContainer, 'edit', !applicantsExist);
            });

            // Disable add buttons for skills and qualifications if there are applicants
            document.getElementById('editSkillInput').disabled = applicantsExist;
            document.getElementById('editAddSkillButton').disabled = applicantsExist;
            document.getElementById('editQualificationInput').disabled = applicantsExist;
            document.getElementById('editAddQualificationButton').disabled = applicantsExist;

            // Show the edit form and overlay
            document.getElementById('editJobForm').dataset.jobId = jobId;
            document.getElementById('editJobForm').style.display = 'block';
            document.getElementById('darkOverlay').style.display = 'block';
        } else {
            alert('Job not found!');
        }
    } catch (error) {
        console.error('Error fetching job for editing:', error);
    }
}


function addSkillToContainer(skill, container, type = 'edit', allowRemoval = true) {
    const skillTag = document.createElement('span');
    skillTag.className = 'skill-tag';
    skillTag.textContent = skill;

    if (allowRemoval) {
        const removeButton = document.createElement('button');
        removeButton.className = `remove-skill-${type}`;
        removeButton.textContent = '×';
        removeButton.onclick = () => container.removeChild(skillTag);
        skillTag.appendChild(removeButton);
    }

    container.appendChild(skillTag);
}

function addQualificationToContainer(qualification, container, type = 'edit', allowRemoval = true) {
    const qualificationTag = document.createElement('span');
    qualificationTag.className = 'qualification-tag';
    qualificationTag.textContent = qualification;

    if (allowRemoval) {
        const removeButton = document.createElement('button');
        removeButton.className = `remove-qualification-${type}`;
        removeButton.textContent = '×';
        removeButton.onclick = () => container.removeChild(qualificationTag);
        qualificationTag.appendChild(removeButton);
    }

    container.appendChild(qualificationTag);
}

document.getElementById('editAddSkillButton').addEventListener('click', () => {
    const skillInput = document.getElementById('editSkillInput');
    if (skillInput.value.trim()) {
        addSkillToContainer(skillInput.value.trim(), document.getElementById('editSkillsContainer'), 'edit');
        skillInput.value = '';
    }
});

document.getElementById('editAddQualificationButton').addEventListener('click', () => {
    const qualificationInput = document.getElementById('editQualificationInput');
    if (qualificationInput.value.trim()) {
        addQualificationToContainer(qualificationInput.value.trim(), document.getElementById('editQualificationsContainer'), 'edit');
        qualificationInput.value = '';
    }
});
// Save job changes
document.getElementById('saveJobButton').addEventListener('click', async function (event) {
    event.preventDefault();

    const jobId = document.getElementById('editJobForm').dataset.jobId;
    if (!jobId) {
        alert('No job ID found. Please refresh and try again.');
        return;
    }

    const updatedData = {
        position: document.getElementById('position').value || '',
        company: document.getElementById('company').value || '',
        location: document.getElementById('location').value || '',
        age: document.getElementById('age').value || '',
        type: document.getElementById('type').value || '',
        jobType: document.getElementById('jobType').value || '',
        vacancy: document.getElementById('vacancy').value || '',
        contactNumber: document.getElementById('contactNumber').value || '',
        contactPerson: document.getElementById('contactPerson').value || '',
        email: document.getElementById('email').value || '',
        education: document.getElementById('education').value || '',
        facilities: document.getElementById('facilities').value || '',
        description: document.getElementById('description').value || '',
        salary: document.getElementById('salary').value || '',
        skills: Array.from(document.querySelectorAll('#editSkillsContainer .skill-tag')).map(tag => tag.textContent.replace('×', '').trim()),
        qualifications: Array.from(document.querySelectorAll('#editQualificationsContainer .qualification-tag')).map(tag => tag.textContent.replace('×', '').trim()),
    };

    const user = auth.currentUser;
    const email = user ? user.email : "Unknown user";

    try {
        // Update Firestore
        const jobDocRef = doc(firestore, 'jobs', jobId);
        await updateDoc(jobDocRef, updatedData);

        // Log audit action
        await logAudit(email, "Job Edited", {
            status: "Success",
            timestamp: new Date().toISOString(), // ISO timestamp
            jobId,
            updatedData,
        });

        alert('Job updated successfully!');
        document.getElementById('editJobForm').style.display = 'none';
        document.getElementById('darkOverlay').style.display = 'none';
    } catch (error) {
        console.error('Error updating job:', error);

        // Log failure audit
        await logAudit(email, "Job Edit Failed", {
            status: "Failed",
            timestamp: new Date().toISOString(), // ISO timestamp
            jobId,
            error: error.message,
        });

        alert('Failed to update the job.');
    }
});
 // Collect skills
 const skillsContainer = document.getElementById('editSkillsContainer');
 const skills = Array.from(skillsContainer.children).map(skillTag => skillTag.textContent.replace('×', '').trim());
 skills.forEach((skill, index) => {
     updatedData[`skills${index + 1}`] = skill;
 });

 // Collect qualifications
 const qualificationsContainer = document.getElementById('editQualificationsContainer');
 const qualifications = Array.from(qualificationsContainer.children).map(qualTag => qualTag.textContent.replace('×', '').trim());
 qualifications.forEach((qualification, index) => {
     updatedData[`qualification${index + 1}`] = qualification;
 });

// "Go Back" button functionality
const goBackButton = document.getElementById('goBackButton');
if (goBackButton) {
    goBackButton.addEventListener('click', () => {
        document.getElementById('editJobForm').style.display = 'none';
        document.getElementById('darkOverlay').style.display = 'none';
    });
} else {
    console.error('Go Back button not found!');
}

// Pagination controls
function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    const pageDisplay = document.createElement('span');
    pageDisplay.textContent = `${currentPage} of ${totalPages}`;
    paginationControls.appendChild(pageDisplay);

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', async () => {
        showLoader();
        currentPage--;
        await updateJobTable();
        hideLoader();
    });
    paginationControls.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', async () => {
        showLoader();
        currentPage++;
        await updateJobTable();
        hideLoader();
    });
    paginationControls.appendChild(nextButton);
}