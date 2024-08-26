import { getAuth, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let currentPage = 1;
const itemsPerPage = 4;
let totalPages = 1;
let employedData = [];

function performSignOut() {
    firebaseSignOut(auth).then(() => {
        window.location.href = "../login.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

document.getElementById('signOutBtn').addEventListener('click', performSignOut);

document.addEventListener('DOMContentLoaded', async () => {
    const employedCol = collection(firestore, 'employed');
    const snapshot = await getDocs(employedCol);
    
    snapshot.forEach(doc => {
        employedData.push(doc.data());
    });

    totalPages = Math.ceil(employedData.length / itemsPerPage);
    displayEmployedList();
    updatePaginationControls();
});

function displayEmployedList() {
    const employedList = document.getElementById('employedList');
    employedList.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = employedData.slice(start, end);

    paginatedData.forEach(employed => {
        const listItem = document.createElement('li');
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.innerHTML = `
            <strong>Employee:</strong>${employed.userName}<br>
            <strong>Position:</strong>${employed.position} - ${employed.company}<br>
            <strong>Email:</strong>${employed.userEmail}<br>
            <strong>Contact Number:</strong>${employed.userPhone}
        `;
        listItem.appendChild(detailsDiv);
        employedList.appendChild(listItem);
    });
}

function updatePaginationControls() {
    const paginationContainer = document.querySelector('.pagination');
    paginationContainer.innerHTML = '';

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayEmployedList();
            updatePaginationControls();
        }
    });
    paginationContainer.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayEmployedList();
            updatePaginationControls();
        }
    });
    paginationContainer.appendChild(nextButton);
}
