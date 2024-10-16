import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs,} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
