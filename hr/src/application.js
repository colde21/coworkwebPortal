import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications, fetchHiredApplicants, fetchRejectedApplicants, fetchInterviewApplicants, hireApplicant, rejectApplicant, moveToInterview, logAudit } from './db.js';
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

//Navigation
//Navigation
document.getElementById('homeButton').addEventListener('click', function () {
    location.href = 'dashboard_hr.html';
});

document.getElementById('jobButton').addEventListener('click', function () {
    location.href = 'Jobs/job.html';
});

document.getElementById('appButton').addEventListener('click', function () {
    location.href = 'application.html';
});

document.getElementById('archiveButton').addEventListener('click', function () {
    location.href = 'archive.html';
});

// Assuming the sign-out functionality is handled in the same JavaScript file
document.getElementById('signOutBtn').addEventListener('click', function () {
    console.log('Sign out button clicked');
});

//Navigation

let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const applicationsPerPage = 5;
let selectedFilter = 'applied';

function requireLogin() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/login.html';
        } else {
            console.log("Page Accessed.");
        }
    });
}
//Sign out!
async function performSignOut() {
    const signOutConfirmation = document.getElementById('signOutConfirmation');
    const confirmSignOutBtn = document.getElementById('confirmSignOutBtn');
    const cancelSignOutBtn = document.getElementById('cancelSignOutBtn');
    const loadingScreen = document.getElementById('loading-screen');

    signOutConfirmation.style.display = 'flex';
    confirmSignOutBtn.addEventListener('click', async function() {
        signOutConfirmation.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'flex';

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No authenticated user found.");

            const userEmail = user.email;
            await logAudit(userEmail, "Sign out", { status: "Success" });
            await firebaseSignOut(auth);
            window.location.href = "/login.html";
        } catch (error) {
            const userEmail = auth.currentUser ? auth.currentUser.email : "Unknown user";
            await logAudit(userEmail, "Sign out", { status: "Failed", error: error.message });
            alert(error.message || 'Sign out failed. Please try again.');
        } finally {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    });

    cancelSignOutBtn.addEventListener('click', function() {
        signOutConfirmation.style.display = 'none';
    });
}

// Updated function to fetch full user details from 'users' collection
async function fetchUserDetails(userId) {
    try {
        const userDoc = doc(firestore, 'users', userId);
        const userSnapshot = await getDoc(userDoc);
        return userSnapshot.exists() ? userSnapshot.data() : null;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

async function fetchContactPerson(jobId) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnapshot = await getDoc(jobDocRef);

        if (jobDocSnapshot.exists()) {
            const jobData = jobDocSnapshot.data();
            return jobData.contact || "N/A"; // Return the contact person or "N/A" if not found
        } else {
            console.error("Job not found!");
            return "N/A";
        }
    } catch (error) {
        console.error("Error fetching contact person:", error);
        return "N/A";
    }
}
// Updated function with detailed logging to debug the applications object
function openUserDetailsDialog(userDetails, imageUrl, applications) {
    console.log("User Details:", userDetails);
    console.log("Applications data:", applications);

    const userName = applications?.userName || 'N/A';
    const userEmail = applications?.userEmail || 'N/A';
    const userPhone = applications?.userPhone || 'N/A';
    const position = applications?.position || 'N/A';
    const company = applications?.company || 'N/A';

    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'modal-overlay';

    const dialogContent = document.createElement('div');
    dialogContent.className = 'modal-content';

    dialogContent.innerHTML = `
        <div class="dialog-header">
            <button class="close-dialog">X</button>
        </div>
        <div class="dialog-body">
            <img src="${imageUrl}" alt="${userDetails.first_name || 'N/A'}'s profile picture" class="profile-pic">
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Phone:</strong> ${userPhone}</p>
            <p><strong>Position Applied:</strong> ${position}</p>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Preferred Jobs:</strong> ${userDetails.preferredJobs || 'N/A'}</p>
            <p><strong>Skills:</strong> ${userDetails.skills || 'N/A'}</p>

        </div>
    `;

    dialogOverlay.appendChild(dialogContent);
    document.body.appendChild(dialogOverlay);

    dialogOverlay.querySelector('.close-dialog').addEventListener('click', () => {
        document.body.removeChild(dialogOverlay);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    requireLogin();
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', performSignOut);
    
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', handleSearch);
        searchBar.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') handleSearch();
        });
    }

    const filterDropdown = document.getElementById('statusFilter');
    if (filterDropdown) filterDropdown.addEventListener('change', handleFilterChange);

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);

    fetchApplicationsAndUpdateUI();
});
//Fetch application 
async function fetchApplicationsAndUpdateUI() {
    try {
        // Fetch the applications based on the selected filter
        let applications = [];  // Define applications here

        if (selectedFilter === 'applied') {
            applications = await fetchAllApplications();
        } else if (selectedFilter === 'hired') {
            applications = await fetchHiredApplicants();
        } else if (selectedFilter === 'rejected') {
            applications = await fetchRejectedApplicants();
        } else if (selectedFilter === 'interview') {
            applications = await fetchInterviewApplicants();
        }
        
        allApplications = applications;
        filteredApplications = allApplications;
        updateApplicationList(filteredApplications);
    } catch (error) {
        console.error("Failed to fetch applications:", error);
    }
}

//Update Application
function updateApplicationList(applications) {
    const applicationList = document.getElementById('applicationList');
    if (!applicationList) return;

    applicationList.innerHTML = ''; 

    const startIndex = (currentPage - 1) * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    const paginatedApplications = applications.slice(startIndex, endIndex);

    paginatedApplications.forEach((application) => {
        const listItem = document.createElement('li');
        listItem.classList.add('applicant-container'); 

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.innerHTML = `
            <strong>Applicant:</strong> ${application.userName || 'N/A'}<br>
            <strong>Position:</strong> ${application.position || 'N/A'} - ${application.company || 'N/A'}<br>
            <strong>Email:</strong> ${application.userEmail || 'N/A'}<br>
            <strong>Contact number:</strong> ${application.userPhone || 'N/A'}
        `;

        const profileImageDiv = document.createElement('div');
        profileImageDiv.className = 'profile-image';
        
        getDownloadURL(storageRef(storage, `profile_images/${application.userId}.jpg`))
            .then((url) => {
                const profileImage = document.createElement('img');
                profileImage.src = url;
                profileImage.alt = `${application.userName || 'N/A'}'s profile image`;
                profileImage.className = 'profile-pic';
                profileImageDiv.appendChild(profileImage);
            })
            .catch((error) => {
                console.error("Error fetching profile image:", error);
                const placeholderImage = document.createElement('div');
                placeholderImage.textContent = 'P';
                placeholderImage.className = 'placeholder-image';
                profileImageDiv.appendChild(placeholderImage);
            });

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        const contactButton = createButton('Contact', (event) => {
            event.stopPropagation(); 
            const subject = `Application Status for ${application.position || 'N/A'} at ${application.company || 'N/A'}`;
            const body = `Dear ${application.userName || 'N/A'},\n\nYou have applied for ${application.position || 'N/A'} at ${application.company || 'N/A'}.`;
            const mailtoLink = `mailto:${application.userEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        });

        if (selectedFilter === 'applied') {
            const interviewButton = createButton('For Interview', async (event) => {
                event.stopPropagation();
                
                const user = auth.currentUser;
                if (!user) return alert('User not authenticated.');
            
                const userEmail = user.email;
            
                // Copy FCM Tokens of the applicant
                const fcmTokens = await copyFCMTokens(application.userId);
                
                if (fcmTokens) {
                    console.log("FCM Tokens copied:", fcmTokens); // Optional: Log tokens to verify copy
                }
            
                // Show the interview modal
                const interviewDetails = await showInterviewModal(application);
                if (interviewDetails) {
                    const fullInterviewData = {
                        ...application,
                        ...interviewDetails
                    };
            
                    // Move to interview and log the action
                    await moveToInterview(application.id, { ...application, ...interviewDetails });
                    await logAudit(userEmail, "Set for Interview", {
                        applicationId: application.id,
                        user: application.userName,
                        details: interviewDetails,
                        status: "Success"
                    });
                    
                    showSuccessModal();
                    fetchApplicationsAndUpdateUI();
                }
            });
            buttonsContainer.appendChild(contactButton);
            buttonsContainer.appendChild(interviewButton);
        }
        
        
        else if (selectedFilter === 'interview') {
            const hireButton = createButton('Hire', async (event) => {
                event.stopPropagation();
                
                const user = auth.currentUser;
                if (!user) return alert('User not authenticated.');
            
                const userEmail = user.email;
            
                const confirm = await showCustomModal('Are you sure you want to hire this applicant?');
                if (confirm) {
                    await hireApplicant(application.id, application);
                    await logAudit(userEmail, "Hire Applicant", {
                        applicationId: application.id,
                        user: application.userName,
                        status: "Success"
                    });
                    alert('Applicant has been hired.');
                    fetchApplicationsAndUpdateUI();
                }
            });
            const rejectButton = createButton('Reject', async (event) => {
                event.stopPropagation();
                
                const user = auth.currentUser;
                if (!user) return alert('User not authenticated.');
            
                const userEmail = user.email;
            
                const confirm = await showCustomModal('Are you sure you want to reject this applicant?');
                if (confirm) {
                    await rejectApplicant(application.id, application);
                    await logAudit(userEmail, "Reject Applicant", {
                        applicationId: application.id,
                        user: application.userName,
                        status: "Success"
                    });
                    alert('Applicant has been rejected.');
                    fetchApplicationsAndUpdateUI();
                }
            });

            buttonsContainer.appendChild(contactButton);
            buttonsContainer.appendChild(hireButton);
            buttonsContainer.appendChild(rejectButton);
        }

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${application.id}`;
        chartContainer.appendChild(canvas);

        listItem.appendChild(profileImageDiv);  
        listItem.appendChild(detailsDiv);      
        listItem.appendChild(buttonsContainer); 

        listItem.addEventListener('click', async () => {
            const userDetails = await fetchUserDetails(application.userId);
            if (userDetails) {
                let imageUrl = 'placeholder_image_url.png';
                try {
                    const downloadUrl = await getDownloadURL(storageRef(storage, `profile_images/${application.userId}.jpg`));
                    imageUrl = downloadUrl;
                } catch (error) {
                    console.error("Error fetching profile image, using placeholder:", error);
                }
        
                openUserDetailsDialog(userDetails, imageUrl, application);
            } else {
                alert('Failed to fetch user details.');
            }
        });
        

        applicationList.appendChild(listItem);
    });

    updatePaginationControls(applications);
}
//Render job match chart

function updatePaginationControls(applications) {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) return;

    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(applications.length / applicationsPerPage);

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateApplicationList(filteredApplications);
        }
    });
    paginationControls.appendChild(prevButton);

    const pageNumbers = document.createElement('span');
    pageNumbers.textContent = `${currentPage}-${totalPages}`;
    pageNumbers.classList.add('page-numbers');
    paginationControls.appendChild(pageNumbers);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateApplicationList(filteredApplications);
        }
    });
    paginationControls.appendChild(nextButton);
}

function handleSearch() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    filteredApplications = filterApplications(allApplications).filter(application => 
        (application.userName && application.userName.toLowerCase().includes(query)) ||
        (application.position && application.position.toLowerCase().includes(query)) ||
        (application.company && application.company.toLowerCase().includes(query)) ||
        (application.userEmail && application.userEmail.toLowerCase().includes(query)) ||
        (application.userPhone && String(application.userPhone).includes(query)) 
    );
    updateApplicationList(filteredApplications);
}

function handleRefresh() {
    filteredApplications = filterApplications(allApplications);
    updateApplicationList(filteredApplications);
}

function handleFilterChange(event) {
    selectedFilter = event.target.value;
    currentPage = 1;
    fetchApplicationsAndUpdateUI();
}

function filterApplications(applications) {
    return applications;
}

function createButton(label, onClick) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function showCustomModal(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <p>${message}</p>
                <button id="confirmBtn" class="confirm-btn">Confirm</button>
                <button id="cancelBtn" class="cancel-btn">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);

        document.getElementById('confirmBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(true);
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

function showInterviewModal(application) {
    return new Promise(async (resolve) => {
        // Fetch the contact person for the job
        const contactPerson = await fetchContactPerson(application.jobId);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Schedule Interview for ${application.userName}</h3>
                <label for="interviewDate">Date:</label>
                <input type="date" id="interviewDate" required><br><br>
                <label for="interviewTime">Time:</label>
                <input type="time" id="interviewTime" required><br><br>
                <label for="interviewLocation">Location:</label>
                <input type="text" id="interviewLocation" placeholder="Enter location" required><br><br>
                <label for="interviewRequirements">Requirements:</label>
                <textarea id="interviewRequirements" rows="3" placeholder="List interview requirements" required></textarea><br><br>
                <label for="contactPerson">Contact Person:</label>
                <input type="text" id="contactPerson" value="${contactPerson}" placeholder="Enter contact person" required><br><br>
                <button id="confirmInterviewBtn" class="confirm-btn">Confirm</button>
                <button id="cancelInterviewBtn" class="cancel-btn">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmInterviewBtn').addEventListener('click', () => {
            const interviewDate = document.getElementById('interviewDate').value;
            const interviewTime = document.getElementById('interviewTime').value;
            const interviewLocation = document.getElementById('interviewLocation').value;
            const interviewRequirements = document.getElementById('interviewRequirements').value;
            const contactPersonInput = document.getElementById('contactPerson').value;

            if (interviewDate && interviewTime && interviewLocation && interviewRequirements && contactPersonInput) {
                const interviewDetails = {
                    date: interviewDate,
                    time: interviewTime,
                    location: interviewLocation,
                    requirements: interviewRequirements,
                    contactPerson: contactPersonInput,
                };
                document.body.removeChild(modal);
                resolve(interviewDetails);
            } else {
                alert("Please fill out all the interview details.");
            }
        });

        document.getElementById('cancelInterviewBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const closeSuccessModalButton = document.getElementById('closeSuccessModal');
    const successModal = document.getElementById('successModal');

    // Add event listener to close button only if element is found
    if (closeSuccessModalButton) {
        closeSuccessModalButton.addEventListener('click', () => {
            successModal.style.display = 'none'; // Hide the modal
        });
    }
});

// Function to show the success modal
function showSuccessModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.display = 'flex'; // Show the modal
    }
}

async function copyFCMTokens(userId) {
    try {
        const userDocRef = doc(firestore, 'users', userId);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            const fcmTokens = userData.fcmTokens;

            if (fcmTokens) {
                console.log('FCM Tokens copied successfully:', fcmTokens);
                return fcmTokens; // Return the tokens if needed elsewhere
            } else {
                console.log('No FCM Tokens found for this user.');
                return null;
            }
        } else {
            console.log('User document does not exist.');
            return null;
        }
    } catch (error) {
        console.error('Error copying FCM Tokens:', error);
        return null;
    }
}

