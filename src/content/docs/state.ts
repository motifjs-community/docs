import { reactive } from '@motifx/core';
import type { LocaleCode } from '../../i18n';
import { loadNav, loadPage, type DocPage, type NavCategory } from './api';

export type DocStatus = 'loading' | 'ready' | 'missing' | 'error';

/** What the docs pages show. The previous page stays on screen until the next one has arrived. */
export const docsState = reactive({
    nav: [] as NavCategory[],
    page: null as DocPage | null,
    status: 'loading' as DocStatus
});

let navKey = '';
let navRequest = 0;

export function showNav(locale: LocaleCode): void {
    if (navKey === locale) return;
    navKey = locale;
    const request = ++navRequest;
    loadNav(locale)
        .then((nav) => {
            if (request === navRequest) docsState.nav = nav;
        })
        .catch(() => {
            if (request === navRequest) navKey = ''; // try again on the next navigation
        });
}

let pageKey = '';
let pageRequest = 0;

// Plain variables on purpose: callers run inside watchers, which must not depend on docsState.
export function showPage(slug: string, locale: LocaleCode): void {
    const key = `${locale}/${slug}`;
    if (pageKey === key) return;
    pageKey = key;
    const request = ++pageRequest;

    loadPage(slug, locale)
        .then((page) => {
            if (request !== pageRequest) return;
            docsState.page = page;
            docsState.status = page ? 'ready' : 'missing';
        })
        .catch(() => {
            if (request !== pageRequest) return;
            pageKey = ''; // the next navigation tries again
            docsState.status = 'error';
        });
}
