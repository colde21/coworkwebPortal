// Import necessary Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { logAudit } from './database.js';

// Your web app's Firebase configuration
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
const auth = getAuth(app);
const database = getDatabase(app);

document.getElementById('submit').addEventListener("click", async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessageContainer = document.getElementById('error-message');
    const loadingScreen = document.getElementById('loading-screen');

    loadingScreen.style.display = 'flex'; // Show the loading screen

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const roleSnapshot = await get(ref(database, `user/${uid}/role`));
        if (roleSnapshot.exists()) {
            const role = roleSnapshot.val();
            console.log('Role:', role); // Useful for debugging

            // Log audit for successful login
            await logAudit(email, "Sign in", {  timestamp: new Date().toISOString(),status: "Success" });

            // Block back button navigation after login
            window.onload = function() {
                // Add a new entry to the browser history (to override the back button)
                history.pushState(null, null, window.location.href);
                window.onpopstate = function() {
                    // When the user presses the back button, prevent the action and redirect them to the login page
                    history.pushState(null, null, window.location.href);
                    alert('You cannot go back to the previous page after logging in.');
                    window.location.href = "../login.html"; // Redirect to the login page or any other page
                };
            };

            // Redirect based on the role
            if (role === "admin") {
                window.location.href = "../admin/home.html";
            } 
         else if (role === "hr" || role === "hr2") {
            window.location.href = "../hr/dashboard_hr.html";
        } 
         else if (role === "employee") {
            window.location.href = "../employee/home.html"; // Make sure the path is correct
        } else {
                throw new Error('Role not recognized or not assigned'); // Handle unexpected roles
            }
        } else {
            throw new Error('Role not found'); // Role must be set in the database
        }
    } catch (error) {
        // Log audit for failed login
        await logAudit(email, "Sign in", { status: "Failed", error: error.message });
        console.error('Login error:', error);
        errorMessageContainer.textContent = error.message || 'Login failed'; // Displaying more descriptive error message
    } finally {
        loadingScreen.style.display = 'none'; // Hide the loading screen
    }
});