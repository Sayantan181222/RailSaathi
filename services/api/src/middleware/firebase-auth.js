const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin app only once
function initializeFirebase() {
  if (admin.apps.length === 0) {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
      } else {
        console.warn(
          'Warning: Firebase Admin credentials not configured in environment.'
        );
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
}

/**
 * Verify a Firebase ID Token.
 * @param {string} idToken - Token received from Firebase client
 * @returns {Promise<Object>} decoded token containing uid, phone_number, etc.
 */
async function verifyFirebaseToken(idToken) {
  try {
    // Fail-safe mock token verification for offline demo/local testing
    if (idToken && idToken.startsWith('mock_')) {
      console.log('Firebase Auth: Using mock bypass for verification token.');
      // MOCK MODE: real Firebase OTP verification bypassed for demo
      let phone = '';
      if (idToken.startsWith('mock_firebase_otp_token_for_')) {
        phone = idToken.replace('mock_firebase_otp_token_for_', '').split('_')[0];
      } else {
        phone = idToken.replace('mock_', '').split('_')[0];
      }
      return { uid: `mock_uid_${phone}`, phone_number: `+91${phone}` };
    }

    initializeFirebase();

    if (admin.apps.length === 0) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase ID token verification failed:', error.message);
    throw error;
  }
}

module.exports = {
  verifyFirebaseToken
};
