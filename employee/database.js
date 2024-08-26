import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// Function to fetch all job data
export async function fetchAllJobs() {
    try {
        const jobsCol = collection(firestore, 'jobs');
        const snapshot = await getDocs(jobsCol);
        const jobs = [];
        snapshot.forEach(doc => {
            const jobData = doc.data();
            if (jobData.status !== 'archived') {  // Exclude archived jobs
                jobs.push({ id: doc.id, ...jobData });
            }
        });
        return jobs;  // Returns an array of non-archived job objects
    } catch (error) {
        console.error("Failed to fetch jobs:", error);
        throw error;
    }
}



// Function to log audit actions
export async function logAudit(user, action, details) {
    try {
        const auditsCol = collection(firestore, 'auditLogs');
        const auditEntry = {
            timestamp: Timestamp.now(), // Use Firestore Timestamp
            user,
            action,
            details
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
            logs.push({ user: data.user, action: data.action, timestamp, details: data.details });
        });

        // Sort logs by timestamp, most recent first
        logs.sort((a, b) => b.timestamp - a.timestamp);

        const logStrings = logs.map(log => `${log.user},${log.action},${log.timestamp.toISOString()}`);
        return logStrings.join('\n');
    } catch (error) {
        console.error("Error exporting audit log:", error);
        throw error;
    }
}

// Function to update job status
export async function updateJobStatus(jobId, status) {
    try {
        const jobDoc = doc(firestore, `jobs/${jobId}`);
        await updateDoc(jobDoc, { status });
        console.log(`Updated job ${jobId} status to ${status}`);
    } catch (error) {
        console.error(`Failed to update job status for ${jobId}:`, error);
    }
}
