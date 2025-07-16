import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en.json';
import azTranslation from '../locales/az.json';

// Configure i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    // Resources
    resources: {
      en: {
        translation: enTranslation
      },
      az: {
        translation: azTranslation
      }
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Translation options
    returnObjects: true,
    returnEmptyString: false,
    returnNull: false,
    
    // Namespace and key separator
    keySeparator: '.',
    nsSeparator: ':',
    
    // React specific options
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Available languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca' }
];

// Language helper functions
export const getCurrentLanguage = () => i18n.language;
export const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
export const getAvailableLanguages = () => LANGUAGES;
export const getLanguageName = (code: string) => {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.nativeName : code;
}; 