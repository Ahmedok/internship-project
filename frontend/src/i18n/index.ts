import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import ruCommon from './locales/ru/common.json';

export const defaultNS = 'common';
export const resources = {
    en: {
        common: enCommon as Record<string, any>,
    },
    ru: {
        common: ruCommon as Record<string, any>,
    },
} as const;

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        defaultNS,
        fallbackLng: 'en',
        supportedLngs: Object.keys(resources),
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
