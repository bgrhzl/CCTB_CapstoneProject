// backend/routes/searchUser.js
const express = require('express');
const router = express.Router();
const { admin } = require('../firebaseAdmin');

// Kullanıcıyı username ile ara
router.get('/', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username gerekli' });
    const usersRef = admin.firestore().collection('users');
    const q = usersRef
      .where('username', '>=', username)
      .where('username', '<=', username + '\uf8ff');
    const snap = await q.get();
    if (snap.empty) return res.json({ user: null });
    const user = snap.docs[0].data();
    res.json({ user });
  } catch (err) {
    console.error('searchUser API error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
