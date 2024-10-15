const admin = require('firebase-admin');
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors'); // You might need this if you're handling requests from different origins

// Initialize Firebase Admin SDK

var serviceAccount = require("./cowork-195c0-firebase-adminsdk-ud4rx-bb4e3ebdbd.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cowork-195c0-default-rtdb.asia-southeast1.firebasedatabase.app"
});


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors()); // Enable CORS if needed

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Verify the session
app.post('/verify-session', async (req, res) => {
    const { idToken } = req.body;

    try {
        // Verify ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Fetch user role from Realtime Database
        const roleRef = admin.database().ref(`user/${uid}/role`);
        const snapshot = await roleRef.once('value');
        const role = snapshot.val();

        if (role) {
            res.status(200).json({ role });
        } else {
            res.status(403).send('Role not found');
        }
    } catch (error) {
        console.error('Error verifying session:', error);
        res.status(401).send('Unauthorized request');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
