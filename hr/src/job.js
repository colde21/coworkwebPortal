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
                 <p><strong>Contact:</strong> ${jobData.contact || 'N/A'}</p><hr>
                <p><strong>Type:</strong> ${jobData.type || 'N/A'}</p><hr>
                <p><strong>Email:</strong> ${jobData.email || 'N/A'}</p><hr>
                <p><strong> Salary:</strong> ${jobData.salary || 'N/A'}</p><hr>
                <p><strong>Skills:</strong> ${skills.length > 0 ? skills.join(', ') : 'N/A'}</p><hr>
                <p><strong>Qualifications:</strong> ${qualifications.length > 0 ? qualifications.join(', ') : 'N/A'}</p><hr>
                <p><strong>Experience:</strong> ${[jobData.experience1, jobData.experience2, jobData.experience3].filter(Boolean).join(', ') || 'N/A'}</p><hr>
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
// Archive job function
async function archiveJobIfNeeded(jobId, userEmail) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Check if there are applicants for this job
            const applicationsColRef = collection(firestore, 'applied');
            const applicationsSnapshot = await getDocs(applicationsColRef);
            const hasApplicants = applicationsSnapshot.docs.some(doc => doc.data().jobId === jobId);

            if (hasApplicants) {
                alert("This job cannot be archived or unarchived because it has applicants.");
                return;
            }

            const archiveData = {
                ...jobData,
                archivedAt: Timestamp.now()
            };

            await addDoc(collection(firestore, 'archive'), archiveData);
            await deleteDoc(jobDocRef);
            await logAudit(userEmail, "Job Archived", { jobId });
            console.log(`Archived job with ID: ${jobId}`);
        }
    } catch (error) {
        console.error(`Failed to archive job with ID: ${jobId}`, error);
        alert(`Failed to archive job with ID: ${jobId}.`);
    }
}

// Edit job function
async function editJob(jobId) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);

        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Populate basic fields
            const fields = {
                position: 'position',
                company: 'company',
                location: 'location',
                age: 'age',
                type: 'type',
                vacancy: 'vacancy',
                contact: 'contact',
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
                }
            }

            // Populate skills
            const skillsContainer = document.getElementById('editSkillsContainer');
            skillsContainer.innerHTML = ''; // Clear existing skills
            if (Array.isArray(jobData.skills)) {
                jobData.skills.forEach((skill) => {
                    addSkillToContainer(skill, skillsContainer, 'edit');
                });
            }

            // Populate qualifications
            const qualificationsContainer = document.getElementById('editQualificationsContainer');
            qualificationsContainer.innerHTML = ''; // Clear existing qualifications
            if (Array.isArray(jobData.qualifications)) {
                jobData.qualifications.forEach((qualification) => {
                    addQualificationToContainer(qualification, qualificationsContainer, 'edit');
                });
            }

            // Set the selected radio button for jobType
            if (jobData.jobType) {
                const jobTypeRadio = document.querySelector(
                    `input[name="jobType"][value="${jobData.jobType}"]`
                );
                if (jobTypeRadio) {
                    jobTypeRadio.checked = true;
                }
            }

            // Show the edit form
            const editJobForm = document.getElementById('editJobForm');
            editJobForm.dataset.jobId = jobId;
            editJobForm.style.display = 'block';

            const darkOverlay = document.getElementById('darkOverlay');
            darkOverlay.style.display = 'block';
        } else {
            alert('Job not found!');
        }
    } catch (error) {
        console.error('Error fetching job for editing:', error);
    }
}

function addSkillToContainer(skill, container, type = 'edit') {
    const skillTag = document.createElement('span');
    skillTag.className = 'skill-tag';
    skillTag.textContent = skill;

    const removeButton = document.createElement('button');
    removeButton.className = `remove-skill-${type}`;
    removeButton.textContent = '×';
    removeButton.onclick = () => container.removeChild(skillTag);

    skillTag.appendChild(removeButton);
    container.appendChild(skillTag);
}

function addQualificationToContainer(qualification, container, type = 'edit') {
    const qualificationTag = document.createElement('span');
    qualificationTag.className = 'qualification-tag';
    qualificationTag.textContent = qualification;

    const removeButton = document.createElement('button');
    removeButton.className = `remove-qualification-${type}`;
    removeButton.textContent = '×';
    removeButton.onclick = () => container.removeChild(qualificationTag);

    qualificationTag.appendChild(removeButton);
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
document.getElementById('saveJobButton').addEventListener('click', function (event) {
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
        vacancy: document.getElementById('vacancy').value || '',
        contact: document.getElementById('email').value || '',
        education: document.getElementById('education').value || '',
        facilities: document.getElementById('facilities').value || '',
        description: document.getElementById('description').value || '',
        salary: document.getElementById('salary').value || '',
        skills: Array.from(document.querySelectorAll('#editSkillsContainer .skill-tag')).map(tag => tag.textContent.replace('×', '').trim()),
        qualifications: Array.from(document.querySelectorAll('#editQualificationsContainer .qualification-tag')).map(tag => tag.textContent.replace('×', '').trim()),
    };

   
     async function fetchSkillsAndQualifications(jobId) {
        try {
            const jobDoc = await getDoc(doc(firestore, 'jobs', jobId));
            if (jobDoc.exists()) {
                const jobData = jobDoc.data();
    
                // Populate skills
                const skillsContainer = document.getElementById('editSkillsContainer');
                skillsContainer.innerHTML = '';
                (jobData.skills || []).forEach(skill => addSkillToContainer(skill, skillsContainer));
    
                // Populate qualifications
                const qualificationsContainer = document.getElementById('editQualificationsContainer');
                qualificationsContainer.innerHTML = '';
                (jobData.qualifications || []).forEach(qualification =>
                    addQualificationToContainer(qualification, qualificationsContainer)
                );
            } else {
                console.error('Job not found!');
            }
        } catch (error) {
            console.error('Error fetching skills and qualifications:', error);
        }
    }
    
    function addSkillToContainer(skill, container) {
        const skillTag = document.createElement('span');
        skillTag.className = 'skill-tag';
        skillTag.textContent = skill;
    
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-skill';
        removeButton.textContent = '×';
        removeButton.onclick = () => container.removeChild(skillTag);
    
        skillTag.appendChild(removeButton);
        container.appendChild(skillTag);
    }
    
    function addQualificationToContainer(qualification, container) {
        const qualificationTag = document.createElement('span');
        qualificationTag.className = 'qualification-tag';
        qualificationTag.textContent = qualification;
    
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-qualification';
        removeButton.textContent = '×';
        removeButton.onclick = () => container.removeChild(qualificationTag);
    
        qualificationTag.appendChild(removeButton);
        container.appendChild(qualificationTag);
    }
    
    
    // Example call within `editJob`
    fetchSkillsAndQualifications(jobId);
    
      // Update Firestore
    const jobDocRef = doc(firestore, 'jobs', jobId);
    updateDoc(jobDocRef, updatedData)
        .then(() => {
            alert('Job updated successfully!');
            document.getElementById('editJobForm').style.display = 'none';
        })
        .catch(error => {
            console.error('Error updating job:', error);
            alert('Failed to update the job.');
        });
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
document.getElementById('goBackButton').addEventListener('click', function () {
    document.getElementById('editJobForm').style.display = 'none';
    document.getElementById('darkOverlay').style.display = 'none';
});

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

/*document.getElementById('generateLinkButton').addEventListener('click', async () => {
    const companyName = prompt("Enter the company name for which you want to generate the link:");
    if (companyName) {
        const link = await generateDisposableLink(companyName);
        if (link) {
            // Display the link and update the link text
            document.getElementById('disposableLinkText').textContent = link;
            document.getElementById('disposableLinkContainer').style.display = 'block';

            // Automatically copy the link to the clipboard
            document.getElementById('copyLinkButton').addEventListener('click', () => {
                copyToClipboard(link);
            });
        } else {
            alert("Failed to generate the link. Please try again.");
        }
    }
});*/

// Function to copy the link to the clipboard
function copyToClipboard(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
}

//Export auditLogs
/*document.getElementById('exportAuditLogBtn').addEventListener('click', () => {
    exportAuditLog().then(csvContent => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'audit_log.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(error => {
        console.error("Error exporting audit log:", error);
    });
}); */