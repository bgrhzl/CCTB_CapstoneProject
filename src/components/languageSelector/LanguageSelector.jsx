import React, { useState, useEffect } from 'react';
import './languageSelector.css';

const LanguageSelector = ({ currentLanguage, onLanguageChange, showLabel = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Supported languages with flags and names
  const supportedLanguages = {
    'tr': { name: 'Türkçe', flag: '🇹🇷' },
    'en': { name: 'English', flag: '🇺🇸' },
    'ja': { name: '日本語', flag: '🇯🇵' },
    'de': { name: 'Deutsch', flag: '🇩🇪' },
    'fr': { name: 'Français', flag: '🇫🇷' },
    'es': { name: 'Español', flag: '🇪🇸' },
    'it': { name: 'Italiano', flag: '🇮🇹' },
    'ru': { name: 'Русский', flag: '🇷🇺' },
    'zh': { name: '中文', flag: '🇨🇳' },
    'ko': { name: '한국어', flag: '🇰🇷' },
    'ar': { name: 'العربية', flag: '🇸🇦' },
    'pt': { name: 'Português', flag: '🇵🇹' },
    'nl': { name: 'Nederlands', flag: '🇳🇱' },
    'sv': { name: 'Svenska', flag: '🇸🇪' },
    'da': { name: 'Dansk', flag: '🇩🇰' },
    'hi': { name: 'हिन्दी', flag: '🇮🇳' }
  };

  const handleLanguageSelect = async (langCode) => {
    if (langCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await onLanguageChange(langCode);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const currentLangData = supportedLanguages[currentLanguage] || supportedLanguages['en'];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.language-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="language-selector">
      {showLabel && <label className="language-label">Language:</label>}
      
      <div className="language-dropdown">
        <button 
          className={`language-button ${isLoading ? 'loading' : ''}`}
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          disabled={isLoading}
          aria-label="Select language"
        >
          <span className="language-flag">{currentLangData.flag}</span>
          <span className="language-name">{currentLangData.name}</span>
          {isLoading ? (
            <span className="language-spinner">⟳</span>
          ) : (
            <span className={`language-arrow ${isOpen ? 'open' : ''}`}>▼</span>
          )}
        </button>

        {isOpen && !isLoading && (
          <div className="language-menu">
            {Object.entries(supportedLanguages).map(([code, lang]) => (
              <button
                key={code}
                className={`language-option ${code === currentLanguage ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(code)}
              >
                <span className="language-flag">{lang.flag}</span>
                <span className="language-name">{lang.name}</span>
                {code === currentLanguage && <span className="checkmark">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="language-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;

