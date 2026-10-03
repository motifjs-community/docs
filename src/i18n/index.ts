import { reactive } from '@motifx/core';
import en from '../content/locales/en.json';
import tr from '../content/locales/tr.json';

export const supportedLocales = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' }
] as const;

export type LocaleCode = typeof supportedLocales[number]['code'];
export type MessageKey = keyof typeof en;

const catalogs: Record<LocaleCode, Record<MessageKey, string>> = { en, tr };

function getInitialLocale(): LocaleCode {
    const savedLocale = typeof localStorage !== 'undefined'
        ? localStorage.getItem('motifjs-locale')
        : null;

    const savedMatch = supportedLocales.find(({ code }) => code === savedLocale);
    if (savedMatch) return savedMatch.code;

    const browserLanguage = typeof navigator !== 'undefined'
        ? navigator.language.split('-')[0].toLowerCase()
        : 'en';

    return supportedLocales.find(({ code }) => code === browserLanguage)?.code ?? 'en';
}

export const localeState = reactive({ current: getInitialLocale() });

export function t(key: MessageKey): string {
    return catalogs[localeState.current][key];
}

function syncDocumentLocale(): void {
    if (typeof document === 'undefined') return;

    document.documentElement.lang = localeState.current;
    document.title = t('meta.title');
    document.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.setAttribute('content', t('meta.description'));
}

export function setLocale(locale: LocaleCode): void {
    localeState.current = locale;
    localStorage.setItem('motifjs-locale', locale);
    syncDocumentLocale();
}

syncDocumentLocale();
