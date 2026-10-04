import { localeOfPath, type LocaleCode } from '../../i18n';

export interface DocLink { slug: string; title: string }
export interface DocHeading { id: string; text: string; level: number }
export interface NavPage { slug: string; title: string; description: string }
export interface NavCategory { id: string; title: string; description: string; pages: NavPage[] }

export interface DocPage {
    slug: string;
    /** The locale the page belongs to; every language has its own pages. */
    locale: LocaleCode;
    title: string;
    description: string;
    category: { id: string; title: string };
    html: string;
    headings: DocHeading[];
    previous: DocLink | null;
    next: DocLink | null;
    updatedAt: string;
}

/** The page was removed without a successor; its old address leads to the docs home. */
export interface MovedToHome { movedToHome: true }

const requests = new Map<string, Promise<unknown>>();

/**
 * GET with one request per URL for the lifetime of the page; a failed request is forgotten so it can be retried.
 * A 404 resolves to its JSON body when it has one (the server explains a removed page there), otherwise null.
 */
function getJson<T>(url: string): Promise<T | null> {
    let request = requests.get(url) as Promise<T | null> | undefined;
    if (!request) {
        request = fetch(url, { headers: { Accept: 'application/json' } }).then((response) => {
            if (response.status === 404) return response.json().catch(() => null) as Promise<T | null>;
            if (!response.ok) throw new Error(`${url}: ${response.status}`);
            return response.json() as Promise<T>;
        });
        request.catch(() => requests.delete(url));
        requests.set(url, request);
    }
    return request;
}

const pageUrl = (slug: string, locale: LocaleCode) => `/api/docs/pages/${encodeURIComponent(slug)}?locale=${locale}`;

// The server embeds the page it was asked for, so the first render needs no request.
const embedded = document.getElementById('doc-data');
if (embedded?.textContent) {
    try {
        const page = JSON.parse(embedded.textContent) as DocPage;
        requests.set(pageUrl(page.slug, localeOfPath(location.pathname)), Promise.resolve(page));
    } catch {
        // A broken embed only costs one request.
    }
}

export function loadNav(locale: LocaleCode): Promise<NavCategory[]> {
    return getJson<NavCategory[]>(`/api/docs/nav?locale=${locale}`).then((nav) => nav ?? []);
}

/**
 * A page by address. A moved page arrives under its new slug (the server redirects), so callers compare
 * `page.slug` with what they asked for; a removed one comes back as {@link MovedToHome}.
 */
export function loadPage(slug: string, locale: LocaleCode): Promise<DocPage | MovedToHome | null> {
    return getJson<DocPage | MovedToHome | { movedToHome?: undefined }>(pageUrl(slug, locale)).then((result) => {
        if (!result) return null;
        if ('movedToHome' in result && result.movedToHome) return result as MovedToHome;
        if (!('slug' in result)) return null;
        // Moved: remember it under its new address too, so following the redirect costs no second request.
        if (result.slug !== slug) requests.set(pageUrl(result.slug, locale), Promise.resolve(result));
        return result;
    });
}

/** Starts loading a page ahead of a click; errors are left for the real load to report. */
export function prefetchPage(slug: string, locale: LocaleCode): void {
    loadPage(slug, locale).catch(() => undefined);
}
