const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://your-database-name.firebaseio.com'
});

const app = express();
app.use(bodyParser.json());

// Example route to set a secure session cookie
app.post('/sessionLogin', (req, res) => {
  const idToken = req.body.idToken;
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  admin.auth().createSessionCookie(idToken, { expiresIn })
    .then((sessionCookie) => {
      const options = { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'Strict' };
      res.cookie('session', sessionCookie, options);
      res.status(200).send('Session cookie created.');
    })
    .catch((error) => {
      res.status(401).send('UNAUTHORIZED REQUEST!');
    });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
