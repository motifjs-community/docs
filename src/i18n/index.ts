import { reactive } from '@motifx/core';
import en from '../content/locales/en.json';
import tr from '../content/locales/tr.json';

export const supportedLocales = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' }
] as const;

export type LocaleCode = typeof supportedLocales[number]['code'];
export type MessageKey = keyof typeof en;

/** English lives at the site root; every other locale under its own prefix (/tr/docs/...). */
export const defaultLocale: LocaleCode = 'en';

const storageKey = 'motifjs-locale';
const catalogs: Record<LocaleCode, Record<MessageKey, string>> = { en, tr };

/** The locale an address belongs to: "/tr" and "/tr/..." are Turkish, everything else English. */
export function localeOfPath(path: string): LocaleCode {
    const prefix = path.split('/')[1];
    return supportedLocales.find(({ code }) => code === prefix && code !== defaultLocale)?.code ?? defaultLocale;
}

/** The same address without its locale prefix: "/tr/docs/routing" → "/docs/routing". */
export function stripLocale(path: string): string {
    const locale = localeOfPath(path);
    if (locale === defaultLocale) return path;
    const rest = path.slice(locale.length + 1);
    return rest === '' || rest.startsWith('#') || rest.startsWith('?') ? `/${rest}` : rest;
}

/** A site path in the given locale (the current one by default): "/docs" → "/tr/docs", "/#examples" → "/tr#examples". */
export function localePath(path: string, locale: LocaleCode = localeState.current): string {
    if (locale === defaultLocale) return path;
    const split = path.search(/[?#]/);
    const pathname = split < 0 ? path : path.slice(0, split);
    const suffix = split < 0 ? '' : path.slice(split);
    return (pathname === '/' ? `/${locale}` : `/${locale}${pathname}`) + suffix;
}

/** The language a visitor chose before, or their browser's; used only when they land on the bare root. */
export function preferredLocale(): LocaleCode {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(storageKey);
    } catch {
        // Storage can be blocked; fall back to the browser language.
    }
    const wanted = saved ?? navigator.language.split('-')[0].toLowerCase();
    return supportedLocales.find(({ code }) => code === wanted)?.code ?? defaultLocale;
}

export const localeState = reactive({ current: localeOfPath(location.pathname) });

export function t(key: MessageKey): string {
    return catalogs[localeState.current][key];
}

/** Sets the tab title; pages without their own title get the site title. */
export function setPageTitle(title?: string): void {
    document.title = title ? `${title} — MotifJS` : t('meta.title');
}

function syncDocumentLocale(): void {
    document.documentElement.lang = localeState.current;
    setPageTitle();
    document.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.setAttribute('content', t('meta.description'));
}

/** Follows the address: the router calls this on every navigation. */
export function applyLocaleFromPath(path: string): void {
    const locale = localeOfPath(path);
    if (locale === localeState.current) return;
    localeState.current = locale;
    syncDocumentLocale();
}

/** Remembers a choice made in the language menu, so the bare root opens in that language next time. */
export function rememberLocale(locale: LocaleCode): void {
    try {
        localStorage.setItem(storageKey, locale);
    } catch {
        // Not remembered, but the address already carries the language.
    }
}

// The server only fills in docs pages; bring the title and description of every other page in line.
// A docs article sets its own title right after.
syncDocumentLocale();
