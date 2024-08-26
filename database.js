import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Function to submit job data
export async function submitJobData(formData) {
    try {
        const jobsCol = collection(firestore, 'jobs');
        const docRef = await addDoc(jobsCol, formData);
        return docRef.id;  // Returns the document ID of the new document
    } catch (error) {
        console.error("Error adding job:", error);
    }
}

// Function to fetch all job data
export async function fetchAllJobs() {
    const jobsCol = collection(firestore, 'jobs');
    const snapshot = await getDocs(jobsCol);
    const jobs = [];
    snapshot.forEach(doc => {
        jobs.push({ id: doc.id, ...doc.data() });
    });
    return jobs;  // Returns an array of job objects
}

// Function to delete a job by ID
export async function deleteJobById(jobId, userEmail) {
    try {
        const jobDoc = doc(firestore, `jobs/${jobId}`);
        await deleteDoc(jobDoc);
        await logAudit(userEmail, "Job Deleted", { jobId });
        return jobId;  // Optionally return the deleted job ID
    } catch (error) {
        console.error(`Failed to delete job ${jobId}:`, error);
    }
}

// Function to log audit actions
export async function logAudit(user, action, details) {
    try {
        const auditsCol = collection(firestore, 'auditLogs');
        const auditEntry = {
            user,
            action,
            details,
            timestamp: Timestamp.now()  // Use Firestore Timestamp
        };
        await addDoc(auditsCol, auditEntry);
    } catch (error) {
        console.error("Error logging audit:", error);
    }
}

// Function to fetch all audit logs
export async function exportAuditLog() {
    try {
        const auditCol = collection(firestore, 'auditLogs');
        const snapshot = await getDocs(auditCol);
        const logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp.toDate();
            logs.push(`${data.user},${data.action},${timestamp.toISOString()}`);
        });
        return logs.join('\n');
    } catch (error) {
        console.error("Error exporting audit log:", error);
        throw error;
    }
}