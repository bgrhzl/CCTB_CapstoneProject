const express = require('express');
const router = express.Router();
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

// Mesaj gönderme endpointi
router.post('/send', async (req, res) => {
  try {
    const { chatId, senderId, text, originalLanguage, translations, imgUrl, userIds } = req.body;
    console.log('Received message send request with imgUrl:', imgUrl);
    if (!chatId || !senderId || (!text && !imgUrl)) {
      return res.status(400).json({ error: 'Eksik parametre' });
    }

    const message = {
      senderId,
      text: text || '',
      originalLanguage: originalLanguage || 'auto',
      translations: translations || {},
      createdAt: Timestamp.now(),
      ...(imgUrl ? { img: imgUrl } : {}),
    };
   
    console.log('Constructed message object:', message);

    // Mesajı chat dokümanına eklemeden önce userIDs alanını kontrol et ve ekle
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat bulunamadı' });
    }
    const chatData = chatSnap.data();
    let updateData = { messages: FieldValue.arrayUnion(message) };
    if (!Array.isArray(chatData.userIDs) || chatData.userIDs.length !== 2) {
      // userIds parametresini kullanarak güncelle
      updateData.userIDs = userIds;
    }
    await chatRef.update(updateData);

    // Her iki kullanıcının userchats listesini güncelle
    if (Array.isArray(userIds)) {
      const updatePromises = userIds.map(async (id) => {
        const userChatsRef = db.collection('userchats').doc(id);
        const userChatsSnapshot = await userChatsRef.get();
        if (userChatsSnapshot.exists) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chats.findIndex((c) => c.chatId === chatId);
          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].lastMessage = text || 'Image';
            userChatsData.chats[chatIndex].isSeen = id === senderId;
            userChatsData.chats[chatIndex].updatedAt = Date.now();
            await userChatsRef.update({ chats: userChatsData.chats });
          }
        } else {
          // If userchats doc does not exist, create it
          await userChatsRef.set({
            chats: [{
              chatId,
              lastMessage: text || 'Image',
              isSeen: id === senderId,
              updatedAt: Date.now()
            }]
          });
        }
      });
      await Promise.all(updatePromises);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Mesaj gönderme hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
