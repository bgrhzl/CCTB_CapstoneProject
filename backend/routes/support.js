const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebaseAdmin');
const FirebaseDataService = require('../firebaseDataService');
const TranslationService = require('../translationService');
const dataService = new FirebaseDataService({ firestore: () => db });
const translationService = new TranslationService();

// POST /api/support
router.post('/', async (req, res) => {
  const { email, message, lang, userId } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required.' });
  }
  try {
    let translatedMessage = message;
    let detectedLang = lang;
    if (lang !== 'en') {
      // Detect language if not provided
      detectedLang = lang || (await translationService.detectLanguage(message));
      // Translate to English
      translatedMessage = await translationService.translateText(message, 'en', detectedLang);
    }
    await dataService.saveSupportMessage({ email, message, lang: detectedLang, userId, translatedMessage });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
