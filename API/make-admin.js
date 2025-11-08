// This is your secure backend function
// It runs on Vercel's servers, not in the browser.

const admin = require('firebase-admin');

// Get your secret key from Vercel's "Environment Variables"
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Initialize the Firebase Admin App (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// This is the main function Vercel will run
export default async function handler(request, response) {
  // 1. Check if the user is logged in (from the frontend)
  const { userId, email } = request.body;
  if (!userId) {
    return response.status(401).json({ error: 'User not authenticated.' });
  }

  // 2. Perform the SECURE action
  try {
    // This is the magic: Set a "custom claim" on the user
    await admin.auth().setCustomUserClaims(userId, { admin: true });
    
    // 3. Send a success message back
    return response.status(200).json({ 
      message: `Success! ${email} is now an admin.` 
    });
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return response.status(500).json({ error: error.message });
  }
}
