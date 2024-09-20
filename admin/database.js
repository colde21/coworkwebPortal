import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, Timestamp, getDoc} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// Function to submit job data
export async function submitJobData(formData) {
    try {
        const jobsCol = collection(firestore, 'jobs');
        const docRef = await addDoc(jobsCol, formData);
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
        const jobs = [];
        snapshot.forEach(doc => {
            const jobData = doc.data();
             // Exclude archived jobs
                jobs.push({ id: doc.id, ...jobData });
           
        });
        return jobs;  // Returns an array of non-archived job objects
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
        const archivedJobs = [];
        snapshot.forEach(doc => {
            archivedJobs.push({ id: doc.id, ...doc.data() });
        });
        return archivedJobs;  // Returns an array of archived job objects
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
            timestamp: Timestamp.now(), // Use Firestore Timestamp
            user,
            action,
            details
        };
        await addDoc(auditsCol, auditEntry);
    } catch (error) {
        console.error("Error logging audit:", error);
        throw error;
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
        const applications = [];
        snapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        return applications;  // Returns an array of application objects
    } catch (error) {
        console.error("Failed to fetch applications:", error);
        throw error;
    }
}


// Function to add an employee to the employed collection
export async function hireApplicant(applicationId, applicantData) {
    try {
        const employedCol = collection(firestore, 'employed');
        await addDoc(employedCol, applicantData);

        // Delete the application after hiring
        await deleteDoc(doc(firestore, `applied/${applicationId}`));

        console.log(`Applicant with ID: ${applicationId} has been hired and moved to the employed collection.`);
    } catch (error) {
        console.error(`Failed to hire applicant ${applicationId}:`, error);
        throw error;
    }
}

// Exporting the archiveJobIfNeeded function
export async function archiveJobIfNeeded(jobId, company, position, userEmail) {
    try {
        const jobDocRef = doc(firestore, 'jobs', jobId);
        const jobDocSnap = await getDoc(jobDocRef);
        if (jobDocSnap.exists()) {
            const jobData = jobDocSnap.data();

            // Archive the job
            await addDoc(collection(firestore, 'archive'), jobData);
            await deleteDoc(jobDocRef);
            console.log(`Archived job with ID: ${jobId}`);

            await logAudit(userEmail, "Job Archived", { jobId });

            // Show a confirmation alert with company name and position
            alert(`Job "${position}" at "${company}" was automatically archived because the vacancy is 0.`);
        }
    } catch (error) {
        console.error(`Failed to archive job with ID: ${jobId}`, error);
        alert(`Failed to archive job with ID: ${jobId}.`);
    }
}



