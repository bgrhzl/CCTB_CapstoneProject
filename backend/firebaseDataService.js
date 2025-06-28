// Firebase Data Management Service
class FirebaseDataService {
  constructor(admin) {
    this.admin = admin;
    this.db = admin.firestore();
  }

  // ==================== USER MANAGEMENT ====================

  async getAllUsers() {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      const users = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = { id: doc.id, ...doc.data() };
        
        // Get additional stats
        const stats = await this.getUserStats(doc.id);
        users.push({ ...userData, ...stats });
      }
      
      return users;
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  async getUserById(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      const userData = { id: userDoc.id, ...userDoc.data() };
      const stats = await this.getUserStats(userId);
      
      return { ...userData, ...stats };
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  async getUserStats(userId) {
    try {
      // Get chat count
      const userChatsDoc = await this.db.collection('userchats').doc(userId).get();
      const chatCount = userChatsDoc.exists() ? (userChatsDoc.data().chats || []).length : 0;
      
      // Get message count
      let messageCount = 0;
      let lastMessageTime = null;
      
      if (userChatsDoc.exists()) {
        const chats = userChatsDoc.data().chats || [];
        for (const chat of chats) {
          const chatDoc = await this.db.collection('chats').doc(chat.chatId).get();
          if (chatDoc.exists()) {
            const messages = chatDoc.data().messages || [];
            const userMessages = messages.filter(msg => msg.senderId === userId);
            messageCount += userMessages.length;
            
            // Find last message time
            if (userMessages.length > 0) {
              const lastMsg = userMessages[userMessages.length - 1];
              if (lastMsg.createdAt && lastMsg.createdAt.toDate) {
                const msgTime = lastMsg.createdAt.toDate();
                if (!lastMessageTime || msgTime > lastMessageTime) {
                  lastMessageTime = msgTime;
                }
              }
            }
          }
        }
      }
      
      return {
        chatCount,
        messageCount,
        lastActivity: lastMessageTime
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { chatCount: 0, messageCount: 0, lastActivity: null };
    }
  }

  async searchUsers(query) {
    try {
      const usersRef = this.db.collection('users');
      
      // Search by username
      const usernameQuery = usersRef
        .where('username', '>=', query)
        .where('username', '<=', query + '\uf8ff');
      
      // Search by email
      const emailQuery = usersRef
        .where('email', '>=', query)
        .where('email', '<=', query + '\uf8ff');
      
      const [usernameSnapshot, emailSnapshot] = await Promise.all([
        usernameQuery.get(),
        emailQuery.get()
      ]);
      
      const users = new Map();
      
      // Add username matches
      usernameSnapshot.forEach(doc => {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Add email matches
      emailSnapshot.forEach(doc => {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      return Array.from(users.values());
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  async createUser(userData) {
    try {
      const { uid, username, email, avatar, language = 'en' } = userData;
      
      const newUser = {
        username,
        email,
        id: uid,
        language,
        blocked: [],
        createdAt: this.admin.firestore.FieldValue.serverTimestamp(),
        ...(avatar && { avatar })
      };
      
      await this.db.collection('users').doc(uid).set(newUser);
      
      // Create userchats document
      await this.db.collection('userchats').doc(uid).set({ chats: [] });
      
      return { success: true, userId: uid };
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async updateUser(userId, updates) {
    try {
      const allowedFields = ['username', 'email', 'language', 'avatar', 'blocked'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });
      
      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }
      
      await this.db.collection('users').doc(userId).update({
        ...filteredUpdates,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true, updates: filteredUpdates };
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      // Delete user document
      await this.db.collection('users').doc(userId).delete();
      
      // Delete userchats document
      await this.db.collection('userchats').doc(userId).delete();
      
      // Delete from Firebase Auth
      try {
        await this.admin.auth().deleteUser(userId);
      } catch (authError) {
        console.warn('Could not delete user from Auth:', authError.message);
      }
      
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // ==================== CHAT MANAGEMENT ====================

  async getAllChats() {
    try {
      const chatsSnapshot = await this.db.collection('chats').get();
      const chats = [];
      
      for (const doc of chatsSnapshot.docs) {
        const chatData = { id: doc.id, ...doc.data() };
        const enrichedChat = await this.enrichChatData(chatData);
        chats.push(enrichedChat);
      }
      
      // Sort by last activity
      chats.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.toDate?.() || new Date(0);
        const bTime = b.lastMessage?.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      return chats;
    } catch (error) {
      throw new Error(`Error fetching chats: ${error.message}`);
    }
  }

  async getChatById(chatId) {
    try {
      const chatDoc = await this.db.collection('chats').doc(chatId).get();
      
      if (!chatDoc.exists) {
        return null;
      }
      
      const chatData = { id: chatDoc.id, ...chatDoc.data() };
      return await this.enrichChatData(chatData);
    } catch (error) {
      throw new Error(`Error fetching chat: ${error.message}`);
    }
  }

  async enrichChatData(chatData) {
    try {
      const messages = chatData.messages || [];
      
      // Get participant info
      const participantIds = [...new Set(messages.map(msg => msg.senderId))];
      const participants = [];
      
      for (const participantId of participantIds) {
        const userDoc = await this.db.collection('users').doc(participantId).get();
        if (userDoc.exists()) {
          participants.push({
            id: participantId,
            username: userDoc.data().username,
            language: userDoc.data().language,
            avatar: userDoc.data().avatar
          });
        }
      }
      
      return {
        ...chatData,
        messageCount: messages.length,
        participants,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        languages: [...new Set(messages.map(msg => msg.originalLanguage).filter(Boolean))]
      };
    } catch (error) {
      console.error('Error enriching chat data:', error);
      return chatData;
    }
  }

  async getChatMessages(chatId, options = {}) {
    try {
      const { limit, offset = 0, userLanguage } = options;
      
      const chatDoc = await this.db.collection('chats').doc(chatId).get();
      
      if (!chatDoc.exists) {
        return null;
      }
      
      const chatData = chatDoc.data();
      let messages = chatData.messages || [];
      
      // Apply pagination
      if (limit) {
        messages = messages.slice(offset, offset + limit);
      }
      
      // Enrich messages with sender info
      const enrichedMessages = [];
      for (const message of messages) {
        const senderDoc = await this.db.collection('users').doc(message.senderId).get();
        const senderInfo = senderDoc.exists() ? senderDoc.data() : null;
        
        let displayText = message.text;
        let isTranslated = false;
        
        // Handle translation if user language is specified
        if (userLanguage && message.originalLanguage && message.originalLanguage !== userLanguage) {
          if (message.translations && message.translations[userLanguage]) {
            displayText = message.translations[userLanguage];
            isTranslated = true;
          }
        }
        
        enrichedMessages.push({
          ...message,
          sender: senderInfo ? {
            id: message.senderId,
            username: senderInfo.username,
            language: senderInfo.language,
            avatar: senderInfo.avatar
          } : null,
          displayText,
          isTranslated
        });
      }
      
      return {
        chatId,
        messages: enrichedMessages,
        totalMessages: (chatData.messages || []).length
      };
    } catch (error) {
      throw new Error(`Error fetching chat messages: ${error.message}`);
    }
  }

  async createChat(user1Id, user2Id) {
    try {
      // Create new chat document
      const chatRef = this.db.collection('chats').doc();
      await chatRef.set({
        createdAt: this.admin.firestore.FieldValue.serverTimestamp(),
        messages: []
      });
      
      const chatId = chatRef.id;
      
      // Update both users' userchats
      const batch = this.db.batch();
      
      const user1ChatsRef = this.db.collection('userchats').doc(user1Id);
      const user2ChatsRef = this.db.collection('userchats').doc(user2Id);
      
      batch.update(user1ChatsRef, {
        chats: this.admin.firestore.FieldValue.arrayUnion({
          chatId,
          lastMessage: '',
          receiverId: user2Id,
          updatedAt: Date.now(),
          isSeen: true
        })
      });
      
      batch.update(user2ChatsRef, {
        chats: this.admin.firestore.FieldValue.arrayUnion({
          chatId,
          lastMessage: '',
          receiverId: user1Id,
          updatedAt: Date.now(),
          isSeen: false
        })
      });
      
      await batch.commit();
      
      return { success: true, chatId };
    } catch (error) {
      throw new Error(`Error creating chat: ${error.message}`);
    }
  }

  async deleteChat(chatId) {
    try {
      // Delete chat document
      await this.db.collection('chats').doc(chatId).delete();
      
      // Remove from userchats (this would require knowing the participants)
      // For now, we'll leave this as a cleanup task
      
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting chat: ${error.message}`);
    }
  }

  // ==================== ANALYTICS ====================

  async getSystemStats() {
    try {
      // User statistics
      const usersSnapshot = await this.db.collection('users').get();
      const totalUsers = usersSnapshot.size;
      
      // Language distribution
      const languageStats = {};
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const lang = userData.language || 'unknown';
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      });
      
      // Chat statistics
      const chatsSnapshot = await this.db.collection('chats').get();
      const totalChats = chatsSnapshot.size;
      
      let totalMessages = 0;
      let translatedMessages = 0;
      const translationStats = {};
      const messagesByHour = new Array(24).fill(0);
      
      chatsSnapshot.forEach(doc => {
        const chatData = doc.data();
        const messages = chatData.messages || [];
        totalMessages += messages.length;
        
        messages.forEach(msg => {
          // Translation stats
          if (msg.translations && Object.keys(msg.translations).length > 0) {
            translatedMessages++;
          }
          
          if (msg.originalLanguage) {
            translationStats[msg.originalLanguage] = 
              (translationStats[msg.originalLanguage] || 0) + 1;
          }
          
          // Message timing stats
          if (msg.createdAt && msg.createdAt.toDate) {
            const hour = msg.createdAt.toDate().getHours();
            messagesByHour[hour]++;
          }
        });
      });
      
      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let recentMessages = 0;
      let activeUsers = new Set();
      
      chatsSnapshot.forEach(doc => {
        const chatData = doc.data();
        const messages = chatData.messages || [];
        
        messages.forEach(msg => {
          if (msg.createdAt && msg.createdAt.toDate && msg.createdAt.toDate() > yesterday) {
            recentMessages++;
            activeUsers.add(msg.senderId);
          }
        });
      });
      
      return {
        users: {
          total: totalUsers,
          active24h: activeUsers.size,
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
          messagesByHour,
          translationLanguages: translationStats
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error fetching system stats: ${error.message}`);
    }
  }

  async getUserActivity(userId, days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Get user's chats
      const userChatsDoc = await this.db.collection('userchats').doc(userId).get();
      if (!userChatsDoc.exists) {
        return { messages: [], messagesByDay: [] };
      }
      
      const chats = userChatsDoc.data().chats || [];
      const userMessages = [];
      const messagesByDay = new Array(days).fill(0);
      
      for (const chat of chats) {
        const chatDoc = await this.db.collection('chats').doc(chat.chatId).get();
        if (chatDoc.exists()) {
          const messages = chatDoc.data().messages || [];
          
          messages.forEach(msg => {
            if (msg.senderId === userId && msg.createdAt && msg.createdAt.toDate) {
              const msgDate = msg.createdAt.toDate();
              if (msgDate > startDate) {
                userMessages.push(msg);
                
                // Calculate day index
                const dayIndex = Math.floor((Date.now() - msgDate.getTime()) / (24 * 60 * 60 * 1000));
                if (dayIndex < days) {
                  messagesByDay[days - 1 - dayIndex]++;
                }
              }
            }
          });
        }
      }
      
      return {
        messages: userMessages.sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate()),
        messagesByDay,
        totalMessages: userMessages.length
      };
    } catch (error) {
      throw new Error(`Error fetching user activity: ${error.message}`);
    }
  }

  // ==================== DATA EXPORT ====================

  async exportAllData() {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        users: [],
        chats: [],
        userchats: [],
        stats: await this.getSystemStats()
      };
      
      // Export users
      const usersSnapshot = await this.db.collection('users').get();
      usersSnapshot.forEach(doc => {
        exportData.users.push({ id: doc.id, ...doc.data() });
      });
      
      // Export chats
      const chatsSnapshot = await this.db.collection('chats').get();
      chatsSnapshot.forEach(doc => {
        exportData.chats.push({ id: doc.id, ...doc.data() });
      });
      
      // Export userchats
      const userchatsSnapshot = await this.db.collection('userchats').get();
      userchatsSnapshot.forEach(doc => {
        exportData.userchats.push({ id: doc.id, ...doc.data() });
      });
      
      return exportData;
    } catch (error) {
      throw new Error(`Error exporting data: ${error.message}`);
    }
  }

  async exportUserData(userId) {
    try {
      const userData = await this.getUserById(userId);
      if (!userData) {
        throw new Error('User not found');
      }
      
      const userActivity = await this.getUserActivity(userId, 30);
      
      // Get user's chats
      const userChatsDoc = await this.db.collection('userchats').doc(userId).get();
      const userChats = userChatsDoc.exists ? userChatsDoc.data().chats : [];
      
      const chatDetails = [];
      for (const chat of userChats) {
        const chatData = await this.getChatMessages(chat.chatId);
        if (chatData) {
          chatDetails.push(chatData);
        }
      }
      
      return {
        timestamp: new Date().toISOString(),
        user: userData,
        activity: userActivity,
        chats: chatDetails
      };
    } catch (error) {
      throw new Error(`Error exporting user data: ${error.message}`);
    }
  }

  // ==================== CLEANUP UTILITIES ====================

  async cleanupOrphanedChats() {
    try {
      const chatsSnapshot = await this.db.collection('chats').get();
      const orphanedChats = [];
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const messages = chatData.messages || [];
        
        if (messages.length === 0) {
          // Check if chat is referenced in userchats
          const userchatsSnapshot = await this.db.collection('userchats').get();
          let isReferenced = false;
          
          for (const userChatDoc of userchatsSnapshot.docs) {
            const userChats = userChatDoc.data().chats || [];
            if (userChats.some(chat => chat.chatId === chatDoc.id)) {
              isReferenced = true;
              break;
            }
          }
          
          if (!isReferenced) {
            orphanedChats.push(chatDoc.id);
          }
        }
      }
      
      // Delete orphaned chats
      const batch = this.db.batch();
      orphanedChats.forEach(chatId => {
        batch.delete(this.db.collection('chats').doc(chatId));
      });
      
      if (orphanedChats.length > 0) {
        await batch.commit();
      }
      
      return { deletedChats: orphanedChats.length };
    } catch (error) {
      throw new Error(`Error cleaning up orphaned chats: ${error.message}`);
    }
  }

  // ==================== SUPPORT MESSAGES ====================
  async saveSupportMessage({ email, message, lang, userId, translatedMessage }) {
    try {
      const docRef = this.db.collection('supportMessages').doc();
      await docRef.set({
        email,
        message,
        lang,
        userId,
        translatedMessage: translatedMessage || '',
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error saving support message: ${error.message}`);
    }
  }

  // ==================== FRIEND REQUEST HELPERS ====================
  /**
   * Verilen userId dizisi için kullanıcıların temel bilgilerini (id, username, avatar) döndürür.
   * @param {string[]} userIds
   * @returns {Promise<Array<{id, username, avatar}>>}
   */
  async getBasicUserInfos(userIds) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) return [];
      const usersRef = this.db.collection('users');
      const userDocs = await Promise.all(userIds.map(id => usersRef.doc(id).get()));
      return userDocs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          username: doc.data().username,
          avatar: doc.data().avatar || null
        }));
    } catch (error) {
      throw new Error(`Error fetching basic user infos: ${error.message}`);
    }
  }
}

module.exports = FirebaseDataService;

