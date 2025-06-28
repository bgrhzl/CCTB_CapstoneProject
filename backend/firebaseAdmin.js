const admin = require('firebase-admin');
let serviceAccount;

try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error('❌ Failed to load serviceAccountKey.json. Please ensure the file exists in the backend directory.');
  console.error('📝 You can download this file from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chattang-92afe-default-rtdb.firebaseio.com",
    storageBucket: "chattang-92afe.appspot.com"
  });
}

const db = admin.firestore();
const realtimeDb = admin.database();
const storage = admin.storage();

// Test connection
db.collection('test').limit(1).get()
  .then(() => {
    console.log('✅ Firebase Admin SDK connected successfully');
  })
  .catch((error) => {
    console.error('❌ Firebase Admin SDK connection failed:', error);
  });

module.exports = { admin, db, realtimeDb, storage };

