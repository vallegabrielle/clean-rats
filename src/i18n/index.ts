import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'pt';
const supportedLocales = ['pt', 'en', 'es', 'de'];
const lng = supportedLocales.includes(deviceLocale) ? deviceLocale : 'pt';

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
  },
  lng,
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

export default i18n;
