// Translation service for frontend
class TranslationService {
  constructor() {
    this.baseUrl = 'http://localhost:5000/api/translation';
    this.cache = new Map();
  }

  // Get supported languages
  async getSupportedLanguages() {
    try {
      const response = await fetch(`${this.baseUrl}/languages`);
      const data = await response.json();
      return data.languages || {};
    } catch (error) {
      console.error('Error fetching supported languages:', error);
      return {};
    }
  }

  // Translate text
  async translateText(text, targetLang, sourceLang = 'auto') {
    if (!text || !targetLang) return text;

    // Check cache first
    const cacheKey = `${sourceLang}-${targetLang}-${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLang,
          sourceLang
        })
      });

      const data = await response.json();
      
      if (data.translatedText) {
        // Cache the translation
        this.cache.set(cacheKey, data.translatedText);
        return data.translatedText;
      }
      
      return text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  }

  // Translate to multiple languages
  async translateToMultiple(text, targetLanguages, sourceLang = 'auto') {
    try {
      const response = await fetch(`${this.baseUrl}/translate-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguages,
          sourceLang
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error translating to multiple languages:', error);
      return { originalText: text, translations: {} };
    }
  }

  // Detect language
  async detectLanguage(text) {
    try {
      const response = await fetch(`${this.baseUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      return data.detectedLanguage || 'auto';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'auto';
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }
}

// Create singleton instance
const translationService = new TranslationService();

export default translationService;

