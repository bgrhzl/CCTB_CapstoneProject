// Translation service using Google Translate API
const axios = require('axios');

class TranslationService {
  constructor() {
    // Google Translate API endpoint
    this.apiUrl = 'https://translate.googleapis.com/translate_a/single';
    
    // Supported languages
    this.supportedLanguages = {
      'tr': 'Türkçe',
      'en': 'English',
      'ja': '日本語',
      'de': 'Deutsch',
      'fr': 'Français',
      'es': 'Español',
      'it': 'Italiano',
      'ru': 'Русский',
      'zh': '中文',
      'ko': '한국어',
      'ar': 'العربية',
      'pt': 'Português',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk'
    };

    // Cache for translations to avoid repeated API calls
    this.translationCache = new Map();
  }

  // Get cache key for translation
  getCacheKey(text, sourceLang, targetLang) {
    return `${sourceLang}-${targetLang}-${text}`;
  }

  // Detect language of text
  async detectLanguage(text) {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          client: 'gtx',
          sl: 'auto',
          tl: 'en',
          dt: 't',
          q: text
        }
      });

      if (response.data && response.data[2]) {
        return response.data[2];
      }
      return 'auto';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'auto';
    }
  }

  // Translate text from source language to target language
  async translateText(text, targetLang, sourceLang = 'auto') {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      // If source and target are the same, return original text
      if (sourceLang === targetLang) {
        return text;
      }

      const response = await axios.get(this.apiUrl, {
        params: {
          client: 'gtx',
          sl: sourceLang,
          tl: targetLang,
          dt: 't',
          q: text
        }
      });

      if (response.data && response.data[0] && response.data[0][0]) {
        const translatedText = response.data[0][0][0];
        
        // Cache the translation
        this.translationCache.set(cacheKey, translatedText);
        
        return translatedText;
      }

      return text; // Return original if translation fails
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }

  // Translate text to multiple languages
  async translateToMultipleLanguages(text, targetLanguages, sourceLang = 'auto') {
    const translations = {};
    
    // Detect source language if not provided
    if (sourceLang === 'auto') {
      sourceLang = await this.detectLanguage(text);
    }

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      if (targetLang !== sourceLang) {
        translations[targetLang] = await this.translateText(text, targetLang, sourceLang);
      }
    }

    return {
      originalText: text,
      originalLanguage: sourceLang,
      translations: translations
    };
  }

  // Get list of supported languages
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Check if language is supported
  isLanguageSupported(langCode) {
    return langCode in this.supportedLanguages;
  }

  // Get popular language pairs for caching
  getPopularLanguagePairs() {
    return [
      ['en', 'tr'], ['tr', 'en'],
      ['en', 'ja'], ['ja', 'en'],
      ['en', 'de'], ['de', 'en'],
      ['en', 'fr'], ['fr', 'en'],
      ['en', 'es'], ['es', 'en'],
      ['tr', 'de'], ['de', 'tr'],
      ['tr', 'fr'], ['fr', 'tr']
    ];
  }

  // Clear translation cache
  clearCache() {
    this.translationCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.translationCache.size,
      keys: Array.from(this.translationCache.keys()).slice(0, 10) // First 10 keys for debugging
    };
  }
}

module.exports = TranslationService;

