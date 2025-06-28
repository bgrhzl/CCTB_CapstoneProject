const express = require('express');
const router = express.Router();
const { admin } = require('../firebaseAdmin');

// Create a new group chat
router.post('/create', async (req, res) => {
  try {
    const { name, userIds, groupAvatar } = req.body;
    if (!name || !Array.isArray(userIds) || userIds.length < 2) {
      return res.status(400).json({ success: false, error: 'Group name and at least 2 users required.' });
    }
    const db = admin.firestore();
    // Create chat doc
    const chatRef = await db.collection('chats').add({
      isGroup: true,
      name,
      users: userIds,
      messages: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      groupAvatar: groupAvatar || '/group.png',
    });
    // Add chat to each user's userchats
    const chatId = chatRef.id;
    await Promise.all(userIds.map(async (uid) => {
      const userChatsRef = db.collection('userchats').doc(uid);
      const userChatsDoc = await userChatsRef.get();
      let chats = [];
      if (userChatsDoc.exists) {
        chats = userChatsDoc.data().chats || [];
      }
      // Avoid duplicate
      if (!chats.some(c => c.chatId === chatId)) {
        chats.push({ chatId, isGroup: true, name });
        await userChatsRef.set({ chats }, { merge: true });
      }
    }));
    res.json({ success: true, chatId });
  } catch (error) {
    console.error('Group create error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add user to group
router.post('/addUser', async (req, res) => {
  const { groupId, userId } = req.body;
  if (!groupId || !userId) return res.status(400).json({ error: 'Missing groupId or userId' });
  const db = admin.firestore();
  try {
    const groupRef = db.collection('chats').doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();
    if (!groupData.isGroup) return res.status(400).json({ error: 'Not a group chat' });
    if ((groupData.users || []).includes(userId)) return res.status(400).json({ error: 'User already in group' });
    await groupRef.update({ users: admin.firestore.FieldValue.arrayUnion(userId) });
    // Add group to user's userchats
    const userChatsRef = db.collection('userchats').doc(userId);
    const userChatsDoc = await userChatsRef.get();
    let chats = userChatsDoc.exists ? (userChatsDoc.data().chats || []) : [];
    chats.push({ chatId: groupId, receiverId: groupId, isGroup: true });
    await userChatsRef.set({ chats }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave group
router.post('/leave', async (req, res) => {
  const { groupId, userId } = req.body;
  if (!groupId || !userId) return res.status(400).json({ error: 'Missing groupId or userId' });
  const db = admin.firestore();
  try {
    const groupRef = db.collection('chats').doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();
    if (!groupData.isGroup) return res.status(400).json({ error: 'Not a group chat' });
    if (!(groupData.users || []).includes(userId)) return res.status(400).json({ error: 'User not in group' });
    // Remove user from group
    await groupRef.update({ users: admin.firestore.FieldValue.arrayRemove(userId) });
    // Remove group from user's userchats
    const userChatsRef = db.collection('userchats').doc(userId);
    const userChatsDoc = await userChatsRef.get();
    if (userChatsDoc.exists) {
      let chats = userChatsDoc.data().chats || [];
      chats = chats.filter(c => c.chatId !== groupId);
      await userChatsRef.set({ chats }, { merge: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
