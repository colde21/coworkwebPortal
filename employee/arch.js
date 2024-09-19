import { fetchArchivedJobs, updateJobStatus, logAudit, deleteArchivedJob } from './database.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js"; 
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, getDoc, doc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const firestore = getFirestore(app);  // Initialize Firestore

document.addEventListener('DOMContentLoaded', () => {
    fetchArchivedJobs().then(jobs => {
        updateArchiveTable(jobs);
    }).catch(err => console.error("Failed to fetch archived jobs:", err));
});

function updateArchiveTable(jobs) {
    const container = document.querySelector('.container');
    const list = document.createElement('ul');
    
    jobs.forEach(job => {
        const listItem = document.createElement('li');
        listItem.className = 'archived-job';
        
        const title = document.createElement('div');
        title.className = 'jobTitle';
        title.textContent = job.position;
        
        const company = document.createElement('div');
        company.className = 'company';
        company.textContent = job.company;
        
        const location = document.createElement('div');
        location.className = 'location';
        location.textContent = job.location;


        listItem.appendChild(title);
        listItem.appendChild(company);
        listItem.appendChild(location);

        list.appendChild(listItem);
    });

    container.appendChild(list);
}
