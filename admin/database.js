import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, Timestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Function to submit job data
export async function submitJobData(formData) {
    try {
        const jobsCol = collection(firestore, 'jobs');
        const docRef = await addDoc(jobsCol, {
            ...formData,
            createdAt: formData.createdAt
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding job:", error);
        throw error;
    }
}

// Function to fetch all job data (excluding archived jobs)
export async function fetchAllJobs() {
    try {
        const jobsCol = collection(firestore, 'jobs');
        const snapshot = await getDocs(jobsCol);
        const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return jobs;
    } catch (error) {
        console.error("Failed to fetch jobs:", error);
        throw error;
    }
}

// Function to fetch all archived job data from the "archive" collection
export async function fetchArchivedJobs() {
    try {
        const archivedJobsCol = collection(firestore, 'archive');
        const snapshot = await getDocs(archivedJobsCol);
        const archivedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return archivedJobs;
    } catch (error) {
        console.error("Failed to fetch archived jobs:", error);
        throw error;
    }
}

// Function to delete an archived job
export async function deleteArchivedJob(jobId) {
    try {
        const jobDoc = doc(firestore, `archive/${jobId}`);
        await deleteDoc(jobDoc);
        console.log(`Deleted archived job with ID: ${jobId}`);
    } catch (error) {
        console.error(`Failed to delete archived job ${jobId}:`, error);
        throw error;
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
            timestamp: Timestamp.now()
        };
        await addDoc(auditsCol, auditEntry);
    } catch (error) {
        console.error("Error logging audit:", error);
    }
}

// Function to export audit logs
export async function exportAuditLog() {
    try {
        const auditCol = collection(firestore, 'auditLogs');
        const snapshot = await getDocs(auditCol);
        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp.toDate();
            return { user: data.user, action: data.action, timestamp };
        });

        logs.sort((a, b) => b.timestamp - a.timestamp);

        const logStrings = logs.map(log => `${log.user},${log.action},${log.timestamp.toISOString()}`);
        return logStrings.join('\n');
    } catch (error) {
        console.error("Error exporting audit log:", error);
        throw error;
    }
}

// Function to update job status or other properties
export async function updateJobStatus(jobId, updates) {
    try {
        const jobDoc = doc(firestore, `jobs/${jobId}`);
        await updateDoc(jobDoc, updates);
        console.log(`Updated job ${jobId} with updates: ${JSON.stringify(updates)}`);
    } catch (error) {
        console.error(`Failed to update job ${jobId}:`, error);
        throw error;
    }
}

// Function to fetch all applications
export async function fetchAllApplications() {
    try {
        const applicationsCol = collection(firestore, 'applied');
        const snapshot = await getDocs(applicationsCol);
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return applications;
    } catch (error) {
        console.error("Failed to fetch applications:", error);
        throw error;
    }
}

// Function to hire an applicant
export async function hireApplicant(applicationId, applicantData) {
    try {
        const employedCol = collection(firestore, 'employed');
        await addDoc(employedCol, applicantData);
        await deleteDoc(doc(firestore, `applied/${applicationId}`));
        console.log(`Applicant with ID: ${applicationId} has been hired and moved to the employed collection.`);
    } catch (error) {
        console.error(`Failed to hire applicant ${applicationId}:`, error);
        throw error;
    }
}

// Function to generate a disposable link
export async function generateDisposableLink(companyName) {
    try {
        const docRef = await addDoc(collection(firestore, 'disposableLinks'), {
            company: companyName,
            createdAt: Timestamp.now(),
            validUntil: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // Link valid for 24 hours
        });
        return `https://cowork-portal.netlify.app/client_viewer/applicant.html?linkId=${docRef.id}`;
    } catch (error) {
        console.error("Error generating disposable link:", error);
    }
}

// Function to archive a job if needed
export async function archiveJobIfNeeded(jobId, company, position, userEmail) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);
        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();
            await addDoc(collection(firestore, 'archive'), jobData);
            await deleteDoc(jobDocRef);
            await logAudit(userEmail, "Job Archived", { jobId });
        }
    } catch (error) {
        console.error(`Failed to archive job with ID: ${jobId}`, error);
    }
}
