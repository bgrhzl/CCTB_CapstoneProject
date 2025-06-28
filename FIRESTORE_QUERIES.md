# 💻 Firestore Veri Sorgulama - Kod Örnekleri

## 🔧 JavaScript/React ile Firestore Sorguları

### 📦 Gerekli Import'lar
```javascript
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase'; // Firebase config dosyanız
```

## 👤 Kullanıcı Bilgilerini Sorgulama

### 1. Tek Kullanıcı Bilgisi Getirme
```javascript
// Kullanıcı ID'si ile kullanıcı bilgilerini getir
async function getUserById(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log('Kullanıcı Bilgileri:', {
        id: userSnap.id,
        username: userData.username,
        email: userData.email,
        avatar: userData.avatar,
        language: userData.language,
        blocked: userData.blocked,
        createdAt: userData.createdAt
      });
      return userData;
    } else {
      console.log('Kullanıcı bulunamadı!');
      return null;
    }
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error);
  }
}

// Kullanım
getUserById('your-user-id-here');
```

### 2. Tüm Kullanıcıları Listeleme
```javascript
// Tüm kullanıcıları getir
async function getAllUsers() {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Tüm Kullanıcılar:', users);
    return users;
  } catch (error) {
    console.error('Kullanıcıları getirme hatası:', error);
  }
}

// Kullanım
getAllUsers();
```

### 3. Kullanıcı Adına Göre Arama
```javascript
// Username ile kullanıcı arama
async function searchUserByUsername(username) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = {
        id: userDoc.id,
        ...userDoc.data()
      };
      console.log('Bulunan Kullanıcı:', userData);
      return userData;
    } else {
      console.log('Kullanıcı bulunamadı!');
      return null;
    }
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
  }
}

// Kullanım
searchUserByUsername('ahmet_tr');
```

### 4. Dile Göre Kullanıcı Filtreleme
```javascript
// Belirli bir dili kullanan kullanıcıları getir
async function getUsersByLanguage(language) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('language', '==', language));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`${language.toUpperCase()} dili kullanan kullanıcılar:`, users);
    return users;
  } catch (error) {
    console.error('Dil filtreleme hatası:', error);
  }
}

// Kullanım
getUsersByLanguage('tr'); // Türkçe kullanıcılar
getUsersByLanguage('en'); // İngilizce kullanıcılar
```

## 💬 Chat Geçmişlerini Sorgulama

### 1. Kullanıcının Chat Listesini Getirme
```javascript
// Kullanıcının tüm chat'lerini getir
async function getUserChats(userId) {
  try {
    const userChatsRef = doc(db, 'userchats', userId);
    const userChatsSnap = await getDoc(userChatsRef);
    
    if (userChatsSnap.exists()) {
      const userChatsData = userChatsSnap.data();
      console.log('Kullanıcının Chat Listesi:', userChatsData.chats);
      return userChatsData.chats;
    } else {
      console.log('Chat listesi bulunamadı!');
      return [];
    }
  } catch (error) {
    console.error('Chat listesi getirme hatası:', error);
  }
}

// Kullanım
getUserChats('your-user-id-here');
```

### 2. Belirli Bir Chat'in Mesajlarını Getirme
```javascript
// Chat ID ile mesajları getir
async function getChatMessages(chatId) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      console.log('Chat Mesajları:', chatData.messages);
      
      // Mesajları tarih sırasına göre sırala
      const sortedMessages = chatData.messages.sort((a, b) => {
        return a.createdAt.toDate() - b.createdAt.toDate();
      });
      
      return sortedMessages;
    } else {
      console.log('Chat bulunamadı!');
      return [];
    }
  } catch (error) {
    console.error('Chat mesajları getirme hatası:', error);
  }
}

// Kullanım
getChatMessages('your-chat-id-here');
```

### 3. Real-time Chat Dinleme
```javascript
// Chat'i gerçek zamanlı dinle
function listenToChat(chatId, callback) {
  const chatRef = doc(db, 'chats', chatId);
  
  const unsubscribe = onSnapshot(chatRef, (doc) => {
    if (doc.exists()) {
      const chatData = doc.data();
      console.log('Chat güncellendi:', chatData.messages);
      callback(chatData.messages);
    }
  }, (error) => {
    console.error('Chat dinleme hatası:', error);
  });
  
  // Dinlemeyi durdurmak için unsubscribe fonksiyonunu döndür
  return unsubscribe;
}

// Kullanım
const stopListening = listenToChat('your-chat-id-here', (messages) => {
  console.log('Yeni mesajlar:', messages);
});

// Dinlemeyi durdur
// stopListening();
```

### 4. Kullanıcının Tüm Mesajlarını Getirme
```javascript
// Kullanıcının gönderdiği tüm mesajları bul
async function getUserAllMessages(userId) {
  try {
    // Önce kullanıcının chat'lerini getir
    const userChats = await getUserChats(userId);
    const allMessages = [];
    
    // Her chat'in mesajlarını kontrol et
    for (const chat of userChats) {
      const messages = await getChatMessages(chat.chatId);
      
      // Sadece bu kullanıcının gönderdiği mesajları filtrele
      const userMessages = messages.filter(msg => msg.senderId === userId);
      allMessages.push(...userMessages);
    }
    
    // Tarihe göre sırala
    allMessages.sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate());
    
    console.log('Kullanıcının Tüm Mesajları:', allMessages);
    return allMessages;
  } catch (error) {
    console.error('Kullanıcı mesajları getirme hatası:', error);
  }
}

// Kullanım
getUserAllMessages('your-user-id-here');
```

## 🔍 Gelişmiş Sorgular

### 1. Son 24 Saatteki Mesajlar
```javascript
// Son 24 saatteki mesajları getir
async function getRecentMessages(chatId, hours = 24) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const now = new Date();
      const timeLimit = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      
      const recentMessages = chatData.messages.filter(msg => {
        return msg.createdAt.toDate() > timeLimit;
      });
      
      console.log(`Son ${hours} saatteki mesajlar:`, recentMessages);
      return recentMessages;
    }
  } catch (error) {
    console.error('Son mesajları getirme hatası:', error);
  }
}

// Kullanım
getRecentMessages('your-chat-id-here', 24);
```

### 2. Çevrilmiş Mesajları Analiz Etme
```javascript
// Çeviri istatistiklerini getir
async function getTranslationStats(chatId) {
  try {
    const messages = await getChatMessages(chatId);
    
    const stats = {
      totalMessages: messages.length,
      translatedMessages: 0,
      languageDistribution: {},
      translationPairs: {}
    };
    
    messages.forEach(msg => {
      // Orijinal dil istatistikleri
      if (msg.originalLanguage) {
        stats.languageDistribution[msg.originalLanguage] = 
          (stats.languageDistribution[msg.originalLanguage] || 0) + 1;
      }
      
      // Çeviri sayısı
      if (msg.translations && Object.keys(msg.translations).length > 0) {
        stats.translatedMessages++;
        
        // Çeviri çiftleri
        Object.keys(msg.translations).forEach(targetLang => {
          const pair = `${msg.originalLanguage}-${targetLang}`;
          stats.translationPairs[pair] = 
            (stats.translationPairs[pair] || 0) + 1;
        });
      }
    });
    
    console.log('Çeviri İstatistikleri:', stats);
    return stats;
  } catch (error) {
    console.error('Çeviri istatistikleri hatası:', error);
  }
}

// Kullanım
getTranslationStats('your-chat-id-here');
```

## 🛠️ Utility Fonksiyonlar

### 1. Kullanıcı Profil Özeti
```javascript
// Kullanıcının tam profil özetini getir
async function getUserProfile(userId) {
  try {
    const user = await getUserById(userId);
    const chats = await getUserChats(userId);
    const messages = await getUserAllMessages(userId);
    
    const profile = {
      userInfo: user,
      totalChats: chats.length,
      totalMessages: messages.length,
      preferredLanguage: user.language,
      lastActivity: messages.length > 0 ? 
        messages[messages.length - 1].createdAt.toDate() : null
    };
    
    console.log('Kullanıcı Profil Özeti:', profile);
    return profile;
  } catch (error) {
    console.error('Profil özeti hatası:', error);
  }
}

// Kullanım
getUserProfile('your-user-id-here');
```

### 2. Chat Özeti
```javascript
// Chat'in detaylı özetini getir
async function getChatSummary(chatId) {
  try {
    const messages = await getChatMessages(chatId);
    const translationStats = await getTranslationStats(chatId);
    
    const participants = [...new Set(messages.map(msg => msg.senderId))];
    
    const summary = {
      chatId: chatId,
      totalMessages: messages.length,
      participants: participants,
      participantCount: participants.length,
      firstMessage: messages[0],
      lastMessage: messages[messages.length - 1],
      translationStats: translationStats
    };
    
    console.log('Chat Özeti:', summary);
    return summary;
  } catch (error) {
    console.error('Chat özeti hatası:', error);
  }
}

// Kullanım
getChatSummary('your-chat-id-here');
```

## 🚀 React Hook Örnekleri

### Custom Hook: useUser
```javascript
import { useState, useEffect } from 'react';

function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!userId) return;
    
    getUserById(userId)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [userId]);
  
  return { user, loading, error };
}

// Kullanım
function UserProfile({ userId }) {
  const { user, loading, error } = useUser(userId);
  
  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error.message}</div>;
  if (!user) return <div>Kullanıcı bulunamadı</div>;
  
  return (
    <div>
      <h2>{user.username}</h2>
      <p>Email: {user.email}</p>
      <p>Dil: {user.language}</p>
      <img src={user.avatar} alt="Avatar" />
    </div>
  );
}
```

Bu kod örnekleriyle Firestore'daki tüm verilerinizi programatik olarak sorgulayabilirsiniz! 🎉

