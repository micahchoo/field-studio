/**
 * i18n Configuration - Internationalization Foundation
 * 
 * Sets up react-i18next with:
 * - Language detection via browser
 * - RTL support for Arabic, Hebrew, Persian, Urdu
 * - Three initial languages: English, Arabic, Chinese
 * 
 * @see https://react.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import zhTranslations from './locales/zh.json';

/**
 * RTL (Right-to-Left) language codes
 * These languages require document direction to be set to 'rtl'
 */
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Supported language configurations
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', isRTL: false },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'zh', label: 'Chinese', nativeName: '中文', isRTL: false }
];

/**
 * Check if a language is RTL
 */
export function isRTLLanguage(language: string): boolean {
  return RTL_LANGUAGES.includes(language);
}

/**
 * Update document direction based on language
 */
export function updateDocumentDirection(language: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTLLanguage(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }
}

/**
 * Initialize i18n
 * Called once at app startup
 */
export function initializeI18n(): typeof i18n {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      
      interpolation: {
        escapeValue: true,
      },
      
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      
      resources: {
        en: { translation: enTranslations },
        ar: { translation: arTranslations },
        zh: { translation: zhTranslations }
      },
      
      react: {
        useSuspense: false,
      }
    });

  // Set initial document direction
  updateDocumentDirection(i18n.language);

  // Listen for language changes to update document direction
  i18n.on('languageChanged', (lng) => {
    updateDocumentDirection(lng);
  });

  return i18n;
}

/**
 * Change language and persist preference
 */
export async function changeLanguage(language: string): Promise<void> {
  await i18n.changeLanguage(language);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Get translation function (for non-React contexts)
 */
export function getT() {
  return i18n.t;
}

export default i18n;