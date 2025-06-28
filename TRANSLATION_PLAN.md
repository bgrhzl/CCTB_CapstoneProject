# Otomatik Çeviri Sistemi - Proje Planı

## 🎯 Hedef
Firebase chat uygulamasına otomatik çeviri sistemi eklemek. Her kullanıcı kendi native dilini seçebilecek ve mesajlar otomatik olarak alıcının diline çevrilecek.

## 🏗️ Sistem Mimarisi

### 1. Dil Seçenekleri
- **Türkçe (tr)** - Turkish
- **İngilizce (en)** - English  
- **Japonca (ja)** - Japanese
- **Almanca (de)** - German
- **Fransızca (fr)** - French
- **İspanyolca (es)** - Spanish
- **İtalyanca (it)** - Italian
- **Rusça (ru)** - Russian
- **Çince (zh)** - Chinese
- **Korece (ko)** - Korean

### 2. Çeviri API Seçimi
**Google Translate API** kullanacağız:
- Ücretsiz tier: 500,000 karakter/ay
- Yüksek kaliteli çeviri
- 100+ dil desteği
- Hızlı response time

### 3. Veri Yapısı Değişiklikleri

#### Kullanıcı Koleksiyonu (users)
```javascript
{
  id: "user_id",
  username: "kullanici_adi",
  email: "email@example.com",
  avatar: "avatar_url",
  language: "tr", // YENİ: Kullanıcının seçtiği dil
  blocked: []
}
```

#### Mesaj Yapısı (messages)
```javascript
{
  id: "message_id",
  senderId: "sender_id",
  text: "Merhaba nasılsın?", // Orijinal mesaj
  originalLanguage: "tr", // Gönderenin dili
  translations: { // Çevrilmiş versiyonlar
    "en": "Hello, how are you?",
    "ja": "こんにちは、元気ですか？",
    "de": "Hallo, wie geht es dir?"
  },
  timestamp: "2024-01-01T10:00:00Z",
  img: "image_url" // opsiyonel
}
```

### 4. Çeviri İş Akışı

1. **Mesaj Gönderme:**
   - Kullanıcı mesajı kendi dilinde yazar
   - Sistem mesajı Firebase'e kaydeder (orijinal dil ile)
   - Backend çeviri API'sini çağırır
   - Yaygın dillere çeviri yapılır ve kaydedilir

2. **Mesaj Alma:**
   - Alıcının dil tercihi kontrol edilir
   - Eğer çeviri mevcutsa gösterilir
   - Yoksa anlık çeviri yapılır

3. **Optimizasyon:**
   - Popüler dil çiftleri için cache
   - Batch çeviri işlemleri
   - Rate limiting

### 5. UI/UX Değişiklikleri

#### Dil Seçimi
- Kullanıcı profil ayarlarında dil seçimi
- Bayrak ikonları ile görsel dil seçimi
- Uygulama dilini de değiştirme seçeneği

#### Mesaj Gösterimi
- Çevrilmiş mesajların altında "Çevrildi" etiketi
- Orijinal mesajı gösterme seçeneği
- Çeviri kalitesi göstergesi

#### Ayarlar Paneli
- Otomatik çeviri açma/kapama
- Hangi dillerden çeviri istediği seçimi
- Çeviri hızı vs kalite tercihi

## 📋 Implementasyon Adımları

### Faz 1: Planlama ✅
- [x] Sistem mimarisini belirle
- [x] Dil seçeneklerini listele
- [x] Veri yapısını tasarla

### Faz 2: Backend Geliştirme
- [ ] Google Translate API entegrasyonu
- [ ] Dil ayarları endpoint'leri
- [ ] Çeviri cache sistemi
- [ ] Rate limiting

### Faz 3: Frontend UI
- [ ] Dil seçimi komponenti
- [ ] Ayarlar paneli
- [ ] Dil değiştirme butonu

### Faz 4: Mesaj Sistemi Entegrasyonu
- [ ] Mesaj gönderme sırasında çeviri
- [ ] Mesaj alma sırasında dil kontrolü
- [ ] Realtime çeviri güncellemeleri

### Faz 5: Kullanıcı Profili
- [ ] Dil tercihi kaydetme
- [ ] Profil ayarlarında dil seçimi
- [ ] Varsayılan dil belirleme

### Faz 6: Test
- [ ] Farklı dil çiftleri test
- [ ] Performance test
- [ ] UI/UX test

### Faz 7: Teslim
- [ ] Dokümantasyon
- [ ] Kullanım kılavuzu
- [ ] Demo hazırlama

## 🔧 Teknik Detaylar

### Google Translate API Kullanımı
```javascript
// Çeviri fonksiyonu
async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target: targetLanguage,
      source: sourceLanguage,
      format: 'text'
    })
  });
  
  const data = await response.json();
  return data.data.translations[0].translatedText;
}
```

### Firebase Güvenlik Kuralları
```javascript
// Kullanıcı sadece kendi dil ayarlarını değiştirebilir
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🎨 UI Mockup

### Dil Seçimi Dropdown
```
[🇹🇷 Türkçe    ▼]
 🇺🇸 English
 🇯🇵 日本語
 🇩🇪 Deutsch
 🇫🇷 Français
```

### Mesaj Görünümü
```
Ahmet: Merhaba nasılsın?
       [Çevrildi: Türkçe → İngilizce] [Orijinali Göster]

John: Hello, how are you?
      [Çevrildi: İngilizce → Türkçe] [Orijinali Göster]
```

Bu plan ile kullanıcılar farklı dillerden sorunsuz iletişim kurabilecek!

