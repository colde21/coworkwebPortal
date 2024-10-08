import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

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
const firestore = getFirestore(app);

// Get `linkId` from URL
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('linkId');

// Validate link and fetch applicants
async function fetchAllApplications() {
    try {
        // Check if the disposable link is valid
        const linkDocRef = doc(firestore, 'disposableLinks', linkId);
        const linkSnap = await getDoc(linkDocRef);
        if (linkSnap.exists()) {
            const linkData = linkSnap.data();
            const now = new Date();

            // Check if the link is still valid
            if (linkData.validUntil.toDate() >= now) {
                // Fetch applicants for the given company
                const q = query(collection(firestore, 'applied'), where('company', '==', linkData.company));
                const querySnapshot = await getDocs(q);

                // Correctly select the table body and the total count element
                const applicantsTableBody = document.getElementById('applicantTableBody');
                const totalApplicantsElement = document.getElementById('totalApplicants');
                
                applicantsTableBody.innerHTML = ''; // Clear the table body
                
                // Track the number of applicants
                let totalCount = 0;

                querySnapshot.forEach(doc => {
                    const applicant = doc.data();
                    const row = applicantsTableBody.insertRow(); // Insert row in the tbody
                    row.insertCell(0).textContent = applicant.position;
                    row.insertCell(1).textContent = applicant.company;

                    totalCount += 1; // Increment the total count for each applicant
                });

                // Display the total number of applicants
                totalApplicantsElement.textContent = `Total Applicants: ${totalCount}`;
            } else {
                alert("The link has expired.");
            }
        } else {
            alert("Invalid or expired link.");
        }
    } catch (error) {
        console.error("Error fetching applicants:", error);
        alert("Error fetching applicants. Please try again.");
    }
}

// Fetch and display applicants when the page loads
fetchAllApplications();
