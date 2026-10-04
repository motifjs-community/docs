import { localeOfPath, type LocaleCode } from '../../i18n';

export interface DocLink { slug: string; title: string }
export interface DocHeading { id: string; text: string; level: number }
export interface NavPage { slug: string; title: string; description: string }
export interface NavCategory { id: string; title: string; description: string; pages: NavPage[] }

export interface DocPage {
    slug: string;
    /** The locale the text is in; differs from the requested one when a page is not translated yet. */
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

export const defaultDocSlug = 'getting-started';

const requests = new Map<string, Promise<unknown>>();

/** GET with one request per URL for the lifetime of the page; a failed request is forgotten so it can be retried. */
function getJson<T>(url: string): Promise<T | null> {
    let request = requests.get(url) as Promise<T | null> | undefined;
    if (!request) {
        request = fetch(url, { headers: { Accept: 'application/json' } }).then((response) => {
            if (response.status === 404) return null;
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

export function loadPage(slug: string, locale: LocaleCode): Promise<DocPage | null> {
    return getJson<DocPage>(pageUrl(slug, locale));
}

/** Starts loading a page ahead of a click; errors are left for the real load to report. */
export function prefetchPage(slug: string, locale: LocaleCode): void {
    loadPage(slug, locale).catch(() => undefined);
}
