import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { fetchAllApplications, fetchHiredApplicants, fetchRejectedApplicants, fetchInterviewApplicants, logAudit } from './database.js';
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
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

//Navigation
document.getElementById('homeButton').addEventListener('click', function () {
    location.href = 'home.html';
});

document.getElementById('jobButton').addEventListener('click', function () {
    location.href = 'job.html';
});

document.getElementById('appButton').addEventListener('click', function () {
    location.href = 'app.html';
});

document.getElementById('archiveButton').addEventListener('click', function () {
    location.href = 'archive.html';
});

// Assuming the sign-out functionality is handled in the same JavaScript file
document.getElementById('signOutBtn').addEventListener('click', function () {
    // Add your sign-out logic here
    console.log('Sign out button clicked');
});
//Navigation


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

    cancelSignOutBtn.addEventListener('click', function () {
        signOutConfirmation.style.display = 'none';
    });
}

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

function openUserDetailsDialog(userDetails, imageUrl, applications) {
    const modal = document.getElementById('userDetailsModal');
    const dialogBody = modal.querySelector('.dialog-body');

    // Populate the modal with the user details
    dialogBody.innerHTML = `
        <img src="${imageUrl}" alt="${userDetails.first_name || 'N/A'}'s profile picture" class="profile-pic">
        <p><strong>Name:</strong> ${applications?.userName || 'N/A'}</p>
        <p><strong>Email:</strong> ${applications?.userEmail || 'N/A'}</p>
        <p><strong>Phone:</strong> ${applications?.userPhone || 'N/A'}</p>
        <p><strong>Position Applied:</strong> ${applications?.position || 'N/A'}</p>
        <p><strong>Company:</strong> ${applications?.company || 'N/A'}</p>
        <p><strong>Preferred Jobs:</strong> ${userDetails.preferredJobs || 'N/A'}</p>
        <p><strong>Skills:</strong> ${userDetails.skills || 'N/A'}</p>
    `;

    // Show the modal
    modal.style.display = 'flex';

    // Close the modal when clicking the close button
    const closeButton = document.getElementById('closeUserDetailsModal');
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    // Close the modal when clicking outside the modal content
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
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

async function fetchApplicationsAndUpdateUI() {
    try {
        if (selectedFilter === 'applied') {
            const applications = await fetchAllApplications();
            allApplications = applications;
        } else if (selectedFilter === 'hired') {
            const hired = await fetchHiredApplicants();
            allApplications = hired;
        } else if (selectedFilter === 'rejected') {
            const rejected = await fetchRejectedApplicants();
            allApplications = rejected;
        } else if (selectedFilter === 'interview') {
            const interview = await fetchInterviewApplicants();
            allApplications = interview;
        }
        filteredApplications = allApplications;
        updateApplicationList(filteredApplications);
    } catch (error) {
        console.error("Failed to fetch applications:", error);
    }
}

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

        listItem.appendChild(profileImageDiv);
        listItem.appendChild(detailsDiv);

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
