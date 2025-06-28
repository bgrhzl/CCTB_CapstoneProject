// backend/routes/chatSettings.js
const express = require('express');
const router = express.Router();
const { admin } = require('../firebaseAdmin');

// Her kullanıcı için chat ayarlarını kaydet/getir
router.post('/save', async (req, res) => {
  try {
    const { chatId, userId, settings } = req.body;
    if (!chatId || !userId || !settings) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    await admin.firestore().collection('chatSettings').doc(`${chatId}_${userId}`).set(settings, { merge: true });
    res.json({ success: true });
  } catch (err) {
    console.error('chatSettings save error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/get', async (req, res) => {
  try {
    const { chatId, userId } = req.query;
    if (!chatId || !userId) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    const docRef = admin.firestore().collection('chatSettings').doc(`${chatId}_${userId}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.json({ settings: null });
    res.json({ settings: docSnap.data() });
  } catch (err) {
    console.error('chatSettings get error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
