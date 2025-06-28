// backend/routes/addChat.js
const express = require('express');
const router = express.Router();
const { admin } = require('../firebaseAdmin');

// İki kullanıcı arasında chat başlat
router.post('/', async (req, res) => {
  try {
    const { currentUserId, targetUserId } = req.body;
    if (!currentUserId || !targetUserId) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    const db = admin.firestore();
    // Yeni chat oluştur
    const newChatRef = db.collection('chats').doc();
    await newChatRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: [],
    });
    // userchats dokümanlarını oluştur veya güncelle
    const currentUserChatsRef = db.collection('userchats').doc(currentUserId);
    const targetUserChatsRef = db.collection('userchats').doc(targetUserId);
    // Mevcut chat listelerini al
    const [currentUserChatsSnap, targetUserChatsSnap] = await Promise.all([
      currentUserChatsRef.get(),
      targetUserChatsRef.get()
    ]);
    if (!currentUserChatsSnap.exists) {
      await currentUserChatsRef.set({ chats: [] });
    }
    if (!targetUserChatsSnap.exists) {
      await targetUserChatsRef.set({ chats: [] });
    }
    // Chat objeleri
    const chatForCurrent = {
      chatId: newChatRef.id,
      lastMessage: "",
      receiverId: targetUserId,
      updatedAt: Date.now(),
      isSeen: true,
    };
    const chatForTarget = {
      chatId: newChatRef.id,
      lastMessage: "",
      receiverId: currentUserId,
      updatedAt: Date.now(),
      isSeen: false,
    };
    await Promise.all([
      currentUserChatsRef.update({ chats: admin.firestore.FieldValue.arrayUnion(chatForCurrent) }),
      targetUserChatsRef.update({ chats: admin.firestore.FieldValue.arrayUnion(chatForTarget) })
    ]);
    res.json({ success: true, chatId: newChatRef.id });
  } catch (err) {
    console.error('addChat API error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
