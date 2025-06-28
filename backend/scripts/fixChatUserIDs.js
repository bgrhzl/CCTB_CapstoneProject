const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const db = getFirestore();

async function fixChatUserIDs() {
  try {
    const chatsSnapshot = await db.collection('chats').get();
    let fixedCount = 0;

    for (const doc of chatsSnapshot.docs) {
      const chatData = doc.data();
      const chatId = doc.id;

      if (!Array.isArray(chatData.userIDs) || chatData.userIDs.length !== 2) {
        // Try to infer userIDs from messages senderIds
        const messages = chatData.messages || [];
        const userIDsSet = new Set(messages.map(msg => msg.senderId));
        const userIDs = Array.from(userIDsSet);

        if (userIDs.length === 2) {
          await db.collection('chats').doc(chatId).update({ userIDs });
          console.log(`Fixed userIDs for chat ${chatId}:`, userIDs);
          fixedCount++;
        } else {
          console.warn(`Cannot fix chat ${chatId}, userIDs count not 2:`, userIDs);
        }
      }
    }

    console.log(`Finished fixing chats. Total fixed: ${fixedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing chat userIDs:', error);
    process.exit(1);
  }
}

fixChatUserIDs();
