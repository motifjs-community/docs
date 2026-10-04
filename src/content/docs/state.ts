import { reactive } from '@motifx/core';
import type { LocaleCode } from '../../i18n';
import { loadNav, loadPage, type DocPage, type NavCategory } from './api';

/** `moved`: the address no longer has a page and leads to the docs home. */
export type DocStatus = 'loading' | 'ready' | 'missing' | 'moved' | 'error';

/** What the docs pages show. The previous page stays on screen until the next one has arrived. */
export const docsState = reactive({
    nav: [] as NavCategory[],
    page: null as DocPage | null,
    status: 'loading' as DocStatus,
    /** The address `page`/`status` answer; differs from page.slug when the page moved. */
    requestedSlug: ''
});

/** The first page in reading order; where "start here" leads. */
export function firstDocSlug(): string | null {
    return docsState.nav[0]?.pages[0]?.slug ?? null;
}

/**
 * Where switching to `locale` leads from `route`: the same docs page when that language has it, otherwise
 * its docs home. Languages have their own pages, so a slug may exist in one and not the other.
 */
export async function routeInLocale(route: string, locale: LocaleCode): Promise<string> {
    const slug = /^\/docs\/([^/]+)\/?$/.exec(route)?.[1];
    if (!slug) return route;
    try {
        const nav = await loadNav(locale);
        return nav.some((category) => category.pages.some((page) => page.slug === slug)) ? route : '/docs';
    } catch {
        return route; // the page itself will report the problem
    }
}

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
        .then((result) => {
            if (request !== pageRequest) return;
            docsState.requestedSlug = slug;
            if (result && 'movedToHome' in result) {
                docsState.status = 'moved';
                return;
            }
            if (result) pageKey = `${locale}/${result.slug}`; // a moved page is already the one its new address shows
            docsState.page = result;
            docsState.status = result ? 'ready' : 'missing';
        })
        .catch(() => {
            if (request !== pageRequest) return;
            pageKey = ''; // the next navigation tries again
            docsState.status = 'error';
        });
}
