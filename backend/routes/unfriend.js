const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebaseAdmin');

// Unfriend endpoint (robust version)
router.post('/', async (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) {
    return res.status(400).json({ error: 'userId and friendId are required' });
  }

  try {
    // Remove friendId from userId's friends list
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      friends: admin.firestore.FieldValue.arrayRemove(friendId)
    });

    // Remove userId from friendId's friends list
    const friendRef = db.collection('users').doc(friendId);
    await friendRef.update({
      friends: admin.firestore.FieldValue.arrayRemove(userId)
    });

    // Remove chat from userchats for both users (robust: check receiverId, userId, id)
    const userChatsRef = db.collection('userchats').doc(userId);
    const friendChatsRef = db.collection('userchats').doc(friendId);
    const [userChatsSnap, friendChatsSnap] = await Promise.all([
      userChatsRef.get(),
      friendChatsRef.get()
    ]);

    function filterChats(chats, selfId, otherId) {
      return (chats || []).filter(c => {
        // Remove if receiverId, userId, or id matches the other user
        return !(
          c.receiverId === otherId ||
          c.userId === otherId ||
          c.id === otherId
        );
      });
    }

    if (userChatsSnap.exists) {
      const chats = userChatsSnap.data().chats || [];
      const filtered = filterChats(chats, userId, friendId);
      await userChatsRef.update({ chats: filtered });
    }
    if (friendChatsSnap.exists) {
      const chats = friendChatsSnap.data().chats || [];
      const filtered = filterChats(chats, friendId, userId);
      await friendChatsRef.update({ chats: filtered });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unfriend error:', err);
    return res.status(500).json({ error: 'Failed to unfriend' });
  }
});

module.exports = router;
