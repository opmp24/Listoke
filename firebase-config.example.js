// COPY this file to firebase-config.js and replace the values with your Firebase project config.
// Do NOT commit firebase-config.js with real keys to a public repo.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (typeof firebase !== 'undefined' && firebase && firebase.initializeApp) {
  firebase.initializeApp(firebaseConfig);
}

/* Instructions:
 - Create a Firebase project and enable Authentication (Google), Firestore and Storage.
 - Copy this file to firebase-config.js in the project root with your config values.
 - Update Firebase security rules to restrict access according to your needs.
*/
