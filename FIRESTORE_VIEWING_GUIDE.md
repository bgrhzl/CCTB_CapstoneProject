# 🔥 Firebase Firestore Database - Veri Görüntüleme Rehberi

## 📍 Firebase Console'da Firestore Database'e Erişim

### Adım 1: Projenizi Seçin
1. Firebase Console'da (https://console.firebase.google.com)
2. **"chattang-92afe"** projenizi seçin
3. Sol menüden **"Firestore Database"** sekmesine tıklayın

### Adım 2: Database Bölümüne Gidin
- Sol sidebar'da **"Build"** bölümünü genişletin
- **"Firestore Database"** seçeneğine tıklayın
- Eğer ilk kez açıyorsanız **"Create database"** butonuna tıklayın

## 📊 Firestore Veri Yapısı

### 🗂️ Ana Koleksiyonlar

#### 1. **users** Koleksiyonu
```
📁 users/
├── 📄 [user_id_1]/
│   ├── username: "ahmet_tr"
│   ├── email: "ahmet@example.com"
│   ├── avatar: "https://firebasestorage.googleapis.com/..."
│   ├── language: "tr"
│   ├── id: "user_id_1"
│   ├── blocked: []
│   └── createdAt: timestamp
├── 📄 [user_id_2]/
│   ├── username: "john_en"
│   ├── email: "john@example.com"
│   ├── avatar: "https://firebasestorage.googleapis.com/..."
│   ├── language: "en"
│   ├── id: "user_id_2"
│   ├── blocked: []
│   └── createdAt: timestamp
```

#### 2. **userchats** Koleksiyonu
```
📁 userchats/
├── 📄 [user_id_1]/
│   └── chats: [
│       {
│         chatId: "chat_id_123",
│         lastMessage: "Merhaba nasılsın?",
│         receiverId: "user_id_2",
│         updatedAt: 1703123456789,
│         isSeen: true
│       }
│     ]
├── 📄 [user_id_2]/
│   └── chats: [
│       {
│         chatId: "chat_id_123",
│         lastMessage: "Merhaba nasılsın?",
│         receiverId: "user_id_1",
│         updatedAt: 1703123456789,
│         isSeen: false
│       }
│     ]
```

#### 3. **chats** Koleksiyonu
```
📁 chats/
├── 📄 [chat_id_123]/
│   ├── createdAt: timestamp
│   └── messages: [
│       {
│         senderId: "user_id_1",
│         text: "Merhaba nasılsın?",
│         originalLanguage: "tr",
│         translations: {
│           "en": "Hello, how are you?",
│           "ja": "こんにちは、元気ですか？"
│         },
│         createdAt: timestamp,
│         img: "https://firebasestorage.googleapis.com/..." (opsiyonel)
│       },
│       {
│         senderId: "user_id_2",
│         text: "I'm fine, thanks!",
│         originalLanguage: "en",
│         translations: {
│           "tr": "İyiyim, teşekkürler!",
│           "ja": "元気です、ありがとう！"
│         },
│         createdAt: timestamp
│       }
│     ]
```

## 🔍 Console'da Veri Görüntüleme

### Kullanıcı Bilgilerini Görme:
1. **"users"** koleksiyonuna tıklayın
2. Her kullanıcı için ayrı bir doküman göreceksiniz
3. Doküman ID'si = Firebase Auth User ID
4. İçeriğinde:
   - ✅ **username**: Kullanıcı adı
   - ✅ **email**: E-posta adresi  
   - ✅ **avatar**: Profil fotoğrafı URL'si
   - ✅ **language**: Seçilen dil (tr, en, ja, vb.)
   - ❌ **password**: Şifreler Firebase Auth'da saklanır (Firestore'da görünmez)

### Chat Geçmişlerini Görme:
1. **"chats"** koleksiyonuna tıklayın
2. Her chat için ayrı bir doküman
3. **"messages"** array'inde tüm mesajları görebilirsiniz:
   - Orijinal mesaj metni
   - Gönderen kişi ID'si
   - Çeviri versiyonları
   - Gönderilme zamanı

### Kullanıcı Chat Listelerini Görme:
1. **"userchats"** koleksiyonuna tıklayın
2. Her kullanıcının chat listesi
3. Hangi chat'lerde olduğu ve son mesajlar

## 🔐 Şifreleri Görme (Firebase Authentication)

**ÖNEMLİ**: Kullanıcı şifreleri Firestore'da DEĞİL, Firebase Authentication'da saklanır.

### Şifreleri görmek için:
1. Sol menüden **"Authentication"** sekmesine gidin
2. **"Users"** tabına tıklayın
3. Burada görebilirsiniz:
   - ✅ User ID
   - ✅ Email
   - ✅ Kayıt tarihi
   - ✅ Son giriş tarihi
   - ❌ Şifreler hash'lenmiş olarak saklanır (güvenlik için görülemez)

## 📱 Mobil/Web'den Erişim

### Firebase Console Mobil:
- Firebase Console mobil uygulamasını indirin
- Aynı Google hesabıyla giriş yapın
- Projelerinizi mobil cihazdan da yönetebilirsiniz

### Doğrudan URL:
```
https://console.firebase.google.com/project/chattang-92afe/firestore/data
```

## 🔧 Filtreleme ve Arama

### Console'da Arama:
1. Koleksiyon içinde **"Filter"** butonuna tıklayın
2. Alan adı, operatör ve değer seçin
3. Örnek: `username == "ahmet_tr"`

### Sıralama:
1. **"Order by"** seçeneğini kullanın
2. Tarih, isim vb. alanlara göre sıralayın

## 📊 Veri İstatistikleri

### Usage Sekmesi:
- Toplam doküman sayısı
- Okuma/yazma işlem sayıları
- Depolama kullanımı
- Maliyet bilgileri

### Indexes Sekmesi:
- Otomatik oluşturulan indexler
- Composite indexler
- Query performansı

## 🚨 Güvenlik Kuralları

### Rules Sekmesi:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kullanıcılar sadece kendi verilerini görebilir
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chat'ler sadece katılımcılar tarafından görülebilir
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    // UserChats sadece kullanıcının kendisi tarafından görülebilir
    match /userchats/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 💡 İpuçları

### 1. Real-time Dinleme:
- Console'da veriler gerçek zamanlı güncellenir
- Yeni mesaj geldiğinde otomatik yenilenir

### 2. Export/Import:
- **"Export"** butonu ile verileri yedekleyebilirsiniz
- JSON formatında indirebilirsiniz

### 3. Backup:
- Otomatik yedekleme ayarlayabilirsiniz
- Scheduled exports oluşturabilirsiniz

### 4. Monitoring:
- **"Monitoring"** sekmesinde performans metrikleri
- Hata logları ve uyarılar

Bu rehberle Firebase Console'da tüm verilerinizi kolayca görüntüleyebilirsiniz! 🎉

