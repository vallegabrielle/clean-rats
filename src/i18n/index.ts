import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'pt';
const supportedLocales = ['pt', 'en', 'es', 'de', 'fr', 'it', 'nl'];
const lng = supportedLocales.includes(deviceLocale) ? deviceLocale : 'pt';

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    nl: { translation: nl },
  },
  lng,
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

export default i18n;
