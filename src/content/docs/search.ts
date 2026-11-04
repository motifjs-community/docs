import type { LocaleCode } from '../../i18n';

/** One section of a docs page as plain text; `id` and `heading` are empty for the text before the first heading. */
export interface SearchEntry {
    slug: string;
    title: string;
    id: string;
    heading: string;
    level: number;
    text: string;
}

/** A piece of a shown text; `hit` marks the part a search term matched. */
export interface TextPart { text: string; hit: boolean }

export interface SearchResult {
    key: string;
    entry: SearchEntry;
    score: number;
    title: TextPart[];
    heading: TextPart[];
    snippet: TextPart[];
}

/** A text folded for matching (lowercase, no accents) with the position each folded character came from. */
interface Folded { text: string; from: number[] }

interface PreparedEntry {
    entry: SearchEntry;
    order: number;
    title: Folded;
    heading: Folded;
    text: Folded;
}

/** The index of one language, ready to search; built once per language when the search first opens. */
export interface SearchIndex { entries: PreparedEntry[] }

const indexes = new Map<LocaleCode, Promise<SearchIndex>>();

/** Loads a language's index once; a failed load is forgotten so the next search tries again. */
export function loadSearchIndex(locale: LocaleCode): Promise<SearchIndex> {
    let index = indexes.get(locale);
    if (!index) {
        index = fetch(`/api/docs/${locale}/search.json`, { headers: { Accept: 'application/json' } })
            .then((response) => {
                if (!response.ok) throw new Error(`search index: ${response.status}`);
                return response.json() as Promise<SearchEntry[]>;
            })
            .then((entries) => ({
                entries: entries.map((entry, order) => ({ entry, order, title: fold(entry.title), heading: fold(entry.heading), text: fold(entry.text) }))
            }));
        index.catch(() => indexes.delete(locale));
        indexes.set(locale, index);
    }
    return index;
}

/** Lowercase without accents, so "yonlendirme" finds "Yönlendirme" and "routerview" finds "RouterView". */
function foldChar(char: string): string {
    return char.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').toLowerCase();
}

function fold(text: string): Folded {
    let folded = '';
    const from: number[] = [];
    let position = 0;
    for (const char of text) {
        const part = foldChar(char);
        for (let i = 0; i < part.length; i++) from.push(position);
        folded += part;
        position += char.length;
    }
    from.push(text.length);
    return { text: folded, from };
}

/** Where the terms occur in a folded text, as ranges in the original text. */
function hits(folded: Folded, terms: string[]): [number, number][] {
    const ranges: [number, number][] = [];
    for (const term of terms) {
        let at = folded.text.indexOf(term);
        while (at >= 0) {
            ranges.push([folded.from[at], folded.from[at + term.length]]);
            at = folded.text.indexOf(term, at + term.length);
        }
    }
    return ranges.sort((a, b) => a[0] - b[0]);
}

/** Splits `text[start, end)` into plain and matched parts. */
function parts(text: string, ranges: [number, number][], start = 0, end = text.length): TextPart[] {
    const result: TextPart[] = [];
    let at = start;
    for (const [from, to] of ranges) {
        if (to <= at || from >= end) continue;
        const hitStart = Math.max(from, at);
        const hitEnd = Math.min(to, end);
        if (hitStart > at) result.push({ text: text.slice(at, hitStart), hit: false });
        result.push({ text: text.slice(hitStart, hitEnd), hit: true });
        at = hitEnd;
    }
    if (at < end) result.push({ text: text.slice(at, end), hit: false });
    return result;
}

const snippetLength = 150;

/** About 150 characters around the first match, cut at word boundaries, with "…" where text was left out. */
function snippet(text: string, ranges: [number, number][]): TextPart[] {
    if (text.length <= snippetLength) return parts(text, ranges);

    const first = ranges[0]?.[0] ?? 0;
    let start = Math.max(0, first - Math.floor(snippetLength / 3));
    let end = Math.min(text.length, start + snippetLength);
    if (end === text.length) start = Math.max(0, end - snippetLength);
    if (start > 0) start = text.indexOf(' ', start) + 1 || start;
    if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;

    const result = parts(text, ranges, start, end);
    if (start > 0) result.unshift({ text: '… ', hit: false });
    if (end < text.length) result.push({ text: ' …', hit: false });
    return result;
}

/**
 * The sections that contain every word of the query, best first: a word in the page title counts most,
 * then one in the section heading, then how often it appears in the text; ties keep reading order.
 */
export function searchDocs(index: SearchIndex, query: string, limit = 20): SearchResult[] {
    const terms = fold(query).text.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const found: { result: SearchResult; order: number }[] = [];

    for (const prepared of index.entries) {
        let score = 0;
        let matched = true;

        for (const term of terms) {
            const inTitle = prepared.title.text.includes(term);
            const inHeading = prepared.heading.text.includes(term);
            let inText = 0;
            let at = prepared.text.text.indexOf(term);
            while (at >= 0 && inText < 5) {
                inText++;
                at = prepared.text.text.indexOf(term, at + term.length);
            }

            if (!inTitle && !inHeading && inText === 0) {
                matched = false;
                break;
            }
            score += (inTitle ? 10 : 0) + (inHeading ? 8 : 0) + inText;
            if (prepared.heading.text.startsWith(term) || prepared.title.text.startsWith(term)) score += 3;
        }
        if (!matched) continue;
        if (prepared.entry.id === '') score += 1; // the page itself comes before its sections on equal footing

        const { entry } = prepared;
        found.push({
            order: prepared.order,
            result: {
                key: `${entry.slug}#${entry.id}`,
                entry,
                score,
                title: parts(entry.title, hits(prepared.title, terms)),
                heading: parts(entry.heading, hits(prepared.heading, terms)),
                snippet: snippet(entry.text, hits(prepared.text, terms))
            }
        });
    }

    found.sort((a, b) => b.result.score - a.result.score || a.order - b.order);
    return found.slice(0, limit).map(({ result }) => result);
}
