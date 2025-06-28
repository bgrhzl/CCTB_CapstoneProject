const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const FirebaseDataService = require('../firebaseDataService');
const admin = require('firebase-admin');
const dataService = new FirebaseDataService(admin);

// Send friend request
router.post('/send', async (req, res) => {
  const { fromUserId, toUserId } = req.body;
  if (!fromUserId || !toUserId) return res.status(400).json({ error: 'Missing user IDs' });
  try {
    // Check if already friends
    const fromUserDoc = await db.collection('users').doc(fromUserId).get();
    const toUserDoc = await db.collection('users').doc(toUserId).get();
    if (!fromUserDoc.exists || !toUserDoc.exists) return res.status(404).json({ error: 'User not found' });
    const fromFriends = fromUserDoc.data().friends || [];
    if (fromFriends.includes(toUserId)) return res.status(400).json({ error: 'Already friends' });
    // Check if request already exists (only block if pending)
    const reqSnap = await db.collection('friendRequests')
      .where('fromUserId', '==', fromUserId)
      .where('toUserId', '==', toUserId)
      .where('status', '==', 'pending') // Only block if pending
      .get();
    if (!reqSnap.empty) return res.status(400).json({ error: 'Request already sent' });
    // Create request
    await db.collection('friendRequests').add({
      fromUserId,
      toUserId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List incoming friend requests for a user
router.get('/list/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const snap = await db.collection('friendRequests')
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // fromUserId'leri topla
    const fromUserIds = requests.map(r => r.fromUserId);
    // Avatar ve username bilgilerini çek
    const fromUsers = await dataService.getBasicUserInfos(fromUserIds);
    // Her request'e gönderen user bilgisini ekle
    const requestsWithUser = requests.map(req => ({
      ...req,
      fromUser: fromUsers.find(u => u.id === req.fromUserId) || null
    }));
    res.json({ requests: requestsWithUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept friend request
router.post('/accept', async (req, res) => {
  const { requestId } = req.body;
  try {
    const reqDoc = await db.collection('friendRequests').doc(requestId).get();
    if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });
    const { fromUserId, toUserId } = reqDoc.data();
    // Add each other as friends
    await db.collection('users').doc(fromUserId).update({
      friends: admin.firestore.FieldValue.arrayUnion(toUserId)
    });
    await db.collection('users').doc(toUserId).update({
      friends: admin.firestore.FieldValue.arrayUnion(fromUserId)
    });
    // Update request status
    await db.collection('friendRequests').doc(requestId).update({ status: 'accepted' });

    // --- Create chat and update userchats if not already present ---
    // Check if a chat already exists between these users
    const chatsSnap = await db.collection('chats').get();
    let existingChat = null;
    chatsSnap.forEach(doc => {
      const chat = doc.data();
      if (Array.isArray(chat.userIds) && chat.userIds.length === 2 &&
        ((chat.userIds[0] === fromUserId && chat.userIds[1] === toUserId) ||
         (chat.userIds[0] === toUserId && chat.userIds[1] === fromUserId))) {
        existingChat = { id: doc.id, ...chat };
      }
    });
    let chatId;
    if (!existingChat) {
      // Create new chat document
      const chatRef = db.collection('chats').doc();
      await chatRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        messages: [],
        userIds: [fromUserId, toUserId]
      });
      chatId = chatRef.id;
    } else {
      chatId = existingChat.id;
    }
    // Update both users' userchats
    const batch = db.batch();
    const user1ChatsRef = db.collection('userchats').doc(fromUserId);
    const user2ChatsRef = db.collection('userchats').doc(toUserId);
    batch.set(user1ChatsRef, { chats: admin.firestore.FieldValue.arrayUnion({
      chatId,
      lastMessage: '',
      receiverId: toUserId,
      updatedAt: Date.now(),
      isSeen: true
    }) }, { merge: true });
    batch.set(user2ChatsRef, { chats: admin.firestore.FieldValue.arrayUnion({
      chatId,
      lastMessage: '',
      receiverId: fromUserId,
      updatedAt: Date.now(),
      isSeen: false
    }) }, { merge: true });
    await batch.commit();
    // --- End chat creation logic ---

    res.json({ success: true, chatId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decline friend request
router.post('/decline', async (req, res) => {
  const { requestId } = req.body;
  try {
    await db.collection('friendRequests').doc(requestId).update({ status: 'declined' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
