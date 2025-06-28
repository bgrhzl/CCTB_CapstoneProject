const express = require('express');
const cors = require('cors');
const { admin } = require('./firebaseAdmin');
const TranslationService = require('./translationService');
require('dotenv').config();
const path = require('path');

const app = express();
const translationService = new TranslationService();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Firebase Chat Backend is running' });
});

// ==================== ADMIN PANEL ENDPOINTS ====================

// Get all users with detailed info
app.get('/api/admin/users', async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = { id: doc.id, ...doc.data() };
      
      // Get user's chat count
      const userChatsDoc = await admin.firestore().collection('userchats').doc(doc.id).get();
      const chatCount = userChatsDoc.exists() ? (userChatsDoc.data().chats || []).length : 0;
      
      // Get user's message count
      let messageCount = 0;
      if (userChatsDoc.exists()) {
        const chats = userChatsDoc.data().chats || [];
        for (const chat of chats) {
          const chatDoc = await admin.firestore().collection('chats').doc(chat.chatId).get();
          if (chatDoc.exists()) {
            const messages = chatDoc.data().messages || [];
            messageCount += messages.filter(msg => msg.senderId === doc.id).length;
          }
        }
      }
      
      users.push({
        ...userData,
        chatCount,
        messageCount,
        lastSeen: userData.lastSeen || null
      });
    }
    
    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    // User statistics
    const usersSnapshot = await admin.firestore().collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Language distribution
    const languageStats = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const lang = userData.language || 'unknown';
      languageStats[lang] = (languageStats[lang] || 0) + 1;
    });
    
    // Chat statistics
    const chatsSnapshot = await admin.firestore().collection('chats').get();
    const totalChats = chatsSnapshot.size;
    
    let totalMessages = 0;
    let translatedMessages = 0;
    const translationStats = {};
    
    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();
      const messages = chatData.messages || [];
      totalMessages += messages.length;
      
      messages.forEach(msg => {
        if (msg.translations && Object.keys(msg.translations).length > 0) {
          translatedMessages++;
        }
        
        if (msg.originalLanguage) {
          translationStats[msg.originalLanguage] = 
            (translationStats[msg.originalLanguage] || 0) + 1;
        }
      });
    });
    
    // Recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let recentMessages = 0;
    
    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();
      const messages = chatData.messages || [];
      recentMessages += messages.filter(msg => {
        if (msg.createdAt && msg.createdAt.toDate) {
          return msg.createdAt.toDate() > yesterday;
        }
        return false;
      }).length;
    });
    
    const stats = {
      users: {
        total: totalUsers,
        languageDistribution: languageStats
      },
      chats: {
        total: totalChats,
        totalMessages,
        translatedMessages,
        translationPercentage: totalMessages > 0 ? 
          Math.round((translatedMessages / totalMessages) * 100) : 0
      },
      activity: {
        recentMessages,
        translationLanguages: translationStats
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all chats with details
app.get('/api/admin/chats', async (req, res) => {
  try {
    const chatsSnapshot = await admin.firestore().collection('chats').get();
    const chats = [];
    
    for (const doc of chatsSnapshot.docs) {
      const chatData = { id: doc.id, ...doc.data() };
      const messages = chatData.messages || [];
      
      // Get participant info
      const participantIds = [...new Set(messages.map(msg => msg.senderId))];
      const participants = [];
      
      for (const participantId of participantIds) {
        const userDoc = await admin.firestore().collection('users').doc(participantId).get();
        if (userDoc.exists()) {
          participants.push({
            id: participantId,
            username: userDoc.data().username,
            language: userDoc.data().language
          });
        }
      }
      
      chats.push({
        id: doc.id,
        messageCount: messages.length,
        participants,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        createdAt: chatData.createdAt,
        languages: [...new Set(messages.map(msg => msg.originalLanguage).filter(Boolean))]
      });
    }
    
    // Sort by last activity
    chats.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.toDate?.() || new Date(0);
      const bTime = b.lastMessage?.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    
    res.json({ chats, total: chats.length });
  } catch (error) {
    console.error('Error fetching admin chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed chat messages
app.get('/api/admin/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists()) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    const messages = chatData.messages || [];
    
    // Enrich messages with sender info
    const enrichedMessages = [];
    for (const message of messages) {
      const senderDoc = await admin.firestore().collection('users').doc(message.senderId).get();
      const senderInfo = senderDoc.exists() ? senderDoc.data() : null;
      
      enrichedMessages.push({
        ...message,
        sender: senderInfo ? {
          id: message.senderId,
          username: senderInfo.username,
          language: senderInfo.language
        } : null
      });
    }
    
    res.json({ 
      chatId, 
      messages: enrichedMessages,
      messageCount: enrichedMessages.length 
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Delete user document
    await admin.firestore().collection('users').doc(userId).delete();
    
    // Delete userchats document
    await admin.firestore().collection('userchats').doc(userId).delete();
    
    // Remove user from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (authError) {
      console.warn('Could not delete user from Auth:', authError.message);
    }
    
    res.json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user info (admin only)
app.patch('/api/admin/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  
  try {
    // Validate updates
    const allowedFields = ['username', 'email', 'language', 'blocked'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      ...filteredUpdates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update Auth if email changed
    if (filteredUpdates.email) {
      try {
        await admin.auth().updateUser(userId, { email: filteredUpdates.email });
      } catch (authError) {
        console.warn('Could not update email in Auth:', authError.message);
      }
    }
    
    res.json({ message: 'User updated successfully', userId, updates: filteredUpdates });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all data
app.get('/api/admin/export', async (req, res) => {
  try {
    const exportData = {
      timestamp: new Date().toISOString(),
      users: [],
      chats: [],
      userchats: []
    };
    
    // Export users
    const usersSnapshot = await admin.firestore().collection('users').get();
    usersSnapshot.forEach(doc => {
      exportData.users.push({ id: doc.id, ...doc.data() });
    });
    
    // Export chats
    const chatsSnapshot = await admin.firestore().collection('chats').get();
    chatsSnapshot.forEach(doc => {
      exportData.chats.push({ id: doc.id, ...doc.data() });
    });
    
    // Export userchats
    const userchatsSnapshot = await admin.firestore().collection('userchats').get();
    userchatsSnapshot.forEach(doc => {
      exportData.userchats.push({ id: doc.id, ...doc.data() });
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=firebase-chat-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRANSLATION ENDPOINTS ====================

// Get supported languages
app.get('/api/translation/languages', (req, res) => {
  try {
    const languages = translationService.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Translate text
app.post('/api/translation/translate', async (req, res) => {
  const { text, targetLang, sourceLang = 'auto' } = req.body;
  
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'text and targetLang are required' });
  }
  
  try {
    const translatedText = await translationService.translateText(text, targetLang, sourceLang);
    const detectedLang = sourceLang === 'auto' ? await translationService.detectLanguage(text) : sourceLang;
    
    res.json({
      originalText: text,
      translatedText,
      sourceLang: detectedLang,
      targetLang
    });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({ error: error.message });
  }
});

// Translate to multiple languages
app.post('/api/translation/translate-multiple', async (req, res) => {
  const { text, targetLanguages, sourceLang = 'auto' } = req.body;
  
  if (!text || !targetLanguages || !Array.isArray(targetLanguages)) {
    return res.status(400).json({ error: 'text and targetLanguages (array) are required' });
  }
  
  try {
    const result = await translationService.translateToMultipleLanguages(text, targetLanguages, sourceLang);
    res.json(result);
  } catch (error) {
    console.error('Error translating to multiple languages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Detect language
app.post('/api/translation/detect', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  
  try {
    const detectedLang = await translationService.detectLanguage(text);
    res.json({ text, detectedLanguage: detectedLang });
  } catch (error) {
    console.error('Error detecting language:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get translation cache stats
app.get('/api/translation/cache-stats', (req, res) => {
  try {
    const stats = translationService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear translation cache
app.delete('/api/translation/cache', (req, res) => {
  try {
    translationService.clearCache();
    res.json({ message: 'Translation cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER ENDPOINTS ====================

// Get all users (for user search)
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users by username
app.get('/api/users/search/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const usersRef = admin.firestore().collection('users');
    const query = usersRef.where('username', '>=', username)
                          .where('username', '<=', username + '\uf8ff');
    const snapshot = await query.get();
    
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update user
app.post('/api/users', async (req, res) => {
  const { uid, username, email, avatar, language = 'en' } = req.body;
  
  if (!uid || !username || !email) {
    return res.status(400).json({ error: 'uid, username, and email are required' });
  }
  
  try {
    const userData = {
      username,
      email,
      id: uid,
      language,
      blocked: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(avatar && { avatar })
    };
    
    await admin.firestore().collection('users').doc(uid).set(userData, { merge: true });
    
    // Create userchats document if it doesn't exist
    const userChatsRef = admin.firestore().collection('userchats').doc(uid);
    const userChatsDoc = await userChatsRef.get();
    
    if (!userChatsDoc.exists) {
      await userChatsRef.set({ chats: [] });
    }
    
    res.json({ message: 'User created/updated successfully', uid });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user language preference
app.patch('/api/users/:uid/language', async (req, res) => {
  const { uid } = req.params;
  const { language } = req.body;
  
  if (!language || !translationService.isLanguageSupported(language)) {
    return res.status(400).json({ error: 'Valid language code is required' });
  }
  
  try {
    await admin.firestore().collection('users').doc(uid).update({
      language: language,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'User language updated successfully', language });
  } catch (error) {
    console.error('Error updating user language:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHAT ENDPOINTS ====================

// Get user chats
app.get('/api/chats/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const userChatsDoc = await admin.firestore().collection('userchats').doc(uid).get();
    
    if (!userChatsDoc.exists) {
      return res.json({ chats: [] });
    }
    
    const userChatsData = userChatsDoc.data();
    const chats = userChatsData.chats || [];
    
    // Get user details for each chat
    const chatsWithUserDetails = await Promise.all(
      chats.map(async (chat) => {
        try {
          const userDoc = await admin.firestore().collection('users').doc(chat.receiverId).get();
          const userData = userDoc.exists() ? userDoc.data() : null;
          return {
            ...chat,
            user: userData
          };
        } catch (error) {
          console.error('Error fetching user for chat:', error);
          return chat;
        }
      })
    );
    
    res.json({ chats: chatsWithUserDetails });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new chat
app.post('/api/chats', async (req, res) => {
  const { user1Id, user2Id } = req.body;
  
  if (!user1Id || !user2Id) {
    return res.status(400).json({ error: 'user1Id and user2Id are required' });
  }
  
  try {
    // Create new chat document
    const chatRef = admin.firestore().collection('chats').doc();
    await chatRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: []
    });
    
    const chatId = chatRef.id;
    
    // Update both users' userchats
    const batch = admin.firestore().batch();
    
    const user1ChatsRef = admin.firestore().collection('userchats').doc(user1Id);
    const user2ChatsRef = admin.firestore().collection('userchats').doc(user2Id);
    
    batch.update(user1ChatsRef, {
      chats: admin.firestore.FieldValue.arrayUnion({
        chatId,
        lastMessage: '',
        receiverId: user2Id,
        updatedAt: Date.now(),
        isSeen: true
      })
    });
    
    batch.update(user2ChatsRef, {
      chats: admin.firestore.FieldValue.arrayUnion({
        chatId,
        lastMessage: '',
        receiverId: user1Id,
        updatedAt: Date.now(),
        isSeen: false
      })
    });
    
    await batch.commit();
    
    res.json({ message: 'Chat created successfully', chatId });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat messages
app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { userLang } = req.query;
  
  try {
    const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    let messages = chatData.messages || [];
    
    // If user language is specified, translate messages
    if (userLang && translationService.isLanguageSupported(userLang)) {
      messages = await Promise.all(messages.map(async (message) => {
        if (message.text && message.originalLanguage && message.originalLanguage !== userLang) {
          // Check if translation already exists
          if (message.translations && message.translations[userLang]) {
            return {
              ...message,
              displayText: message.translations[userLang],
              isTranslated: true
            };
          } else {
            // Translate on the fly
            try {
              const translatedText = await translationService.translateText(
                message.text, 
                userLang, 
                message.originalLanguage || 'auto'
              );
              return {
                ...message,
                displayText: translatedText,
                isTranslated: true
              };
            } catch (error) {
              console.error('Error translating message:', error);
              return {
                ...message,
                displayText: message.text,
                isTranslated: false
              };
            }
          }
        }
        return {
          ...message,
          displayText: message.text,
          isTranslated: false
        };
      }));
    }
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message with translation
app.post('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { senderId, text, img, senderLanguage = 'auto' } = req.body;
  
  if (!senderId || !text) {
    return res.status(400).json({ error: 'senderId and text are required' });
  }
  
  try {
    // Detect language if not provided
    const detectedLang = senderLanguage === 'auto' ? 
      await translationService.detectLanguage(text) : senderLanguage;
    
    // Get popular languages for pre-translation
    const popularLanguages = ['en', 'tr', 'ja', 'de', 'fr', 'es'];
    const targetLanguages = popularLanguages.filter(lang => lang !== detectedLang);
    
    // Pre-translate to popular languages
    const translations = {};
    for (const targetLang of targetLanguages) {
      try {
        translations[targetLang] = await translationService.translateText(text, targetLang, detectedLang);
      } catch (error) {
        console.error(`Error translating to ${targetLang}:`, error);
      }
    }
    
    const message = {
      senderId,
      text,
      originalLanguage: detectedLang,
      translations,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(img && { img })
    };
    
    // Add message to chat
    await admin.firestore().collection('chats').doc(chatId).update({
      messages: admin.firestore.FieldValue.arrayUnion(message)
    });
    
    res.json({ 
      message: 'Message sent successfully',
      originalLanguage: detectedLang,
      translationsCount: Object.keys(translations).length
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Block/Unblock user
app.post('/api/users/:uid/block', async (req, res) => {
  const { uid } = req.params;
  const { targetUserId, block } = req.body;
  
  if (!targetUserId || typeof block !== 'boolean') {
    return res.status(400).json({ error: 'targetUserId and block (boolean) are required' });
  }
  
  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    
    if (block) {
      await userRef.update({
        blocked: admin.firestore.FieldValue.arrayUnion(targetUserId)
      });
    } else {
      await userRef.update({
        blocked: admin.firestore.FieldValue.arrayRemove(targetUserId)
      });
    }
    
    res.json({ message: `User ${block ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    // Delete user document
    await admin.firestore().collection('users').doc(uid).delete();
    
    // Delete userchats document
    await admin.firestore().collection('userchats').doc(uid).delete();
    
    res.json({ message: 'User deleted successfully', uid });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register route (user + userchat firestore)
const registerRoute = require('./routes/register');
app.use('/api/register', registerRoute);

// Search user by username
const searchUserRoute = require('./routes/searchUser');
app.use('/api/searchUser', searchUserRoute);

// Add chat between users
const addChatRoute = require('./routes/addChat');
app.use('/api/addChat', addChatRoute);

// Chat settings (per user per chat)
const chatSettingsRoute = require('./routes/chatSettings');
app.use('/api/chatSettings', chatSettingsRoute);

// Upload endpoint (background image, etc)
const uploadRoute = require('./routes/upload');
app.use('/api/upload', uploadRoute);
// PUBLIC UPLOADS SERVE
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cloudinary upload endpoint
const cloudinaryUploadRoute = require('./routes/cloudinaryUpload');
app.use('/api/cloudinary-upload', cloudinaryUploadRoute);

// Send message route
const sendMessageRoute = require('./routes/sendMessage');
app.use('/api/message', sendMessageRoute);

// Support message endpoint
const supportRoute = require('./routes/support');
app.use('/api/support', supportRoute);

// Friend request route
const friendRequestRoute = require('./routes/friendRequest');
app.use('/api/friendRequest', friendRequestRoute);

// Unfriend endpoint
const unfriendRoute = require('./routes/unfriend');
app.use('/api/unfriend', unfriendRoute);

// Group routes
const groupRoutes = require('./routes/group');
app.use('/api/group', groupRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Firebase Chat Backend running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Translation service initialized with ${Object.keys(translationService.getSupportedLanguages()).length} languages`);
  console.log(`👨‍💼 Admin panel: http://localhost:${PORT}/api/admin/stats`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

module.exports = app;

