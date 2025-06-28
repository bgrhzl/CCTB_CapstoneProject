const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Get chat document by chatId
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: 'chatId gerekli' });

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat bulunamadı' });
    }
    const chatData = chatSnap.data();
    res.json({ chat: chatData });
  } catch (err) {
    console.error('Get chat API error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
