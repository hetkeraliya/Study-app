// This is your SECURE backend function for the Shop
// It runs on Vercel's servers.

const admin = require('firebase-admin');

// Get your secret key from Vercel's "Environment Variables"
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Initialize the Firebase Admin App (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// This is the main function Vercel will run
export default async function handler(request, response) {
  // 1. Get data from the frontend
  const { userId, itemId, itemPrice } = request.body;

  if (!userId || !itemId || !itemPrice) {
    return response.status(400).json({ error: 'Missing data. Need userId, itemId, and itemPrice.' });
  }
  
  // 2. Define your shop items here
  // (This is a safety check to make sure the price wasn't faked)
  const officialShopItems = {
    'item-movie': 100,
    'item-guide': 500,
    'item-badge': 1000
  };

  const officialPrice = officialShopItems[itemId];
  if (officialPrice !== itemPrice) {
    return response.status(400).json({ error: 'Price mismatch. Transaction voided.' });
  }

  // 3. Get a reference to the user's data document
  const appId = 'default-app-id'; // Use the same appId as your frontend
  const userDocRef = db.doc(`/artifacts/${appId}/users/${userId}/appData/data`);

  // 4. Run a secure "transaction"
  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists) {
        throw new Error("User data not found.");
      }

      const userData = userDoc.data();
      const currentCoins = userData.coins || 0;

      // 5. Check if they have enough coins
      if (currentCoins < officialPrice) {
        throw new Error("You do not have enough coins for this purchase.");
      }

      // 6. They have enough! Subtract coins and update inventory.
      const newCoins = currentCoins - officialPrice;
      
      // Add the item to a new 'inventory' array in their data
      const currentInventory = userData.inventory || [];
      const newInventory = [...currentInventory, itemId];

      transaction.update(userDocRef, { 
        coins: newCoins,
        inventory: newInventory 
      });
    });

    // 7. Send success message
    return response.status(200).json({ 
      message: 'Purchase successful! Your item is in your inventory.' 
    });

  } catch (error) {
    console.error('Error during purchase transaction:', error);
    // Send the specific error message (like "Not enough coins") back
    return response.status(500).json({ error: error.message });
  }
}
