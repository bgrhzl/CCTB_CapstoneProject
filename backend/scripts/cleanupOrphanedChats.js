// Firestore'da user objesi eksik olan chatleri tespit ve temizleme scripti
// Node.js ortamında çalıştırılabilir

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOrphanedChats() {
  const userChatsSnapshot = await db.collection('userchats').get();
  let totalRemoved = 0;

  for (const userChatDoc of userChatsSnapshot.docs) {
    const userId = userChatDoc.id;
    const userChatsData = userChatDoc.data();
    const chats = userChatsData.chats || [];
    const newChats = [];
    let removed = 0;

    for (const chat of chats) {
      // Her chat için karşı user'ı kontrol et
      const receiverId = chat.receiverId;
      if (!receiverId) continue;
      const userDoc = await db.collection('users').doc(receiverId).get();
      if (!userDoc.exists) {
        console.log(`User ${receiverId} not found, removing chat from ${userId}`);
        removed++;
        continue;
      }
      newChats.push(chat);
    }

    if (removed > 0) {
      await db.collection('userchats').doc(userId).update({ chats: newChats });
      totalRemoved += removed;
      console.log(`Cleaned ${removed} chats for user ${userId}`);
    }
  }

  console.log(`Toplam temizlenen chat: ${totalRemoved}`);
}

cleanupOrphanedChats().then(() => {
  console.log('Temizlik tamamlandı.');
  process.exit(0);
}).catch(err => {
  console.error('Hata:', err);
  process.exit(1);
});
