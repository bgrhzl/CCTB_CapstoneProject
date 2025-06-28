// backend/routes/register.js
const express = require('express');
const router = express.Router();
const { admin } = require('../firebaseAdmin');

// Kullanıcı ve userchat Firestore'a ekle
router.post('/', async (req, res) => {
  try {
    const { uid, username, email, avatar, language } = req.body;
    if (!uid || !username || !email) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    // users koleksiyonu
    await admin.firestore().collection('users').doc(uid).set({
      username,
      email,
      avatar: avatar || './avatar.png',
      id: uid,
      language: language || 'en',
      blocked: [],
    });
    // userchats koleksiyonu
    await admin.firestore().collection('userchats').doc(uid).set({
      chats: [],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Register API error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
