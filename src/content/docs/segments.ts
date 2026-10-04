import { localePath, type LocaleCode } from '../../i18n';
import type { DocPage } from './api';

export interface CodeVariant {
    /** "declarative/class", "class", "declarative", or null for a plain snippet. */
    variant: string | null;
    language: string | null;
    code: string;
}

export type ArticleSegment =
    | { kind: 'html'; key: string; html: string }
    | { kind: 'code'; key: string; file: string; variants: CodeVariant[] };

const cache = new Map<string, ArticleSegment[]>();

/**
 * Splits an article into prose and code examples. The server renders each example group as
 * <div class="doc-code">; those become CodeBlock components, the rest stays HTML.
 */
export function articleSegments(page: DocPage | null, readerLocale: LocaleCode): ArticleSegment[] {
    if (!page) return [];
    const id = `${readerLocale}/${page.slug}/${page.updatedAt}`;
    const cached = cache.get(id);
    if (cached) return cached;

    const template = document.createElement('template');
    template.innerHTML = page.html;
    localizeLinks(template.content, readerLocale);
    wrapTables(template.content);

    const segments: ArticleSegment[] = [];
    let prose = '';
    const flushProse = () => {
        if (prose.trim()) segments.push({ kind: 'html', key: `${id}/${segments.length}`, html: prose });
        prose = '';
    };

    for (const node of Array.from(template.content.childNodes)) {
        if (node instanceof HTMLElement && node.classList.contains('doc-code')) {
            flushProse();
            const blocks = Array.from(node.querySelectorAll('pre'));
            segments.push({
                kind: 'code',
                key: `${id}/${segments.length}`,
                file: node.dataset.file ?? blocks[0]?.dataset.lang ?? '',
                variants: blocks.map((pre) => ({
                    variant: pre.dataset.variant ?? null,
                    language: pre.dataset.lang ?? null,
                    code: pre.textContent ?? ''
                }))
            });
        } else {
            prose += node instanceof Element ? node.outerHTML : node.textContent ?? '';
        }
    }
    flushProse();

    cache.set(id, segments);
    return segments;
}

/** Site links in markdown are written as "/docs/x"; route them in place and keep the reader's language. */
function localizeLinks(root: DocumentFragment, locale: LocaleCode): void {
    for (const link of Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]:not([href^="//"])'))) {
        link.setAttribute('href', localePath(link.getAttribute('href')!, locale));
        link.setAttribute('rel', 'router');
    }
}

/**
 * A table wider than the article scrolls inside its own box instead of running under the side columns.
 * Runs like `a`/`b`/`c` have no space to wrap at, so the slashes between the names get a break opportunity.
 */
function wrapTables(root: DocumentFragment): void {
    for (const table of Array.from(root.querySelectorAll('table'))) {
        const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.parentElement?.closest('code') === null) node.textContent = node.textContent!.replace(/\//g, '/​');
        }

        const box = document.createElement('div');
        box.className = 'docs-table';
        table.replaceWith(box);
        box.append(table);
    }
}

/** The example that fits a code style: exact match first, then component style, then writing style. */
export function pickVariant(variants: CodeVariant[], writingStyle: string, componentStyle: string): string {
    const find = (variant: string) => variants.find((v) => v.variant?.split(',').includes(variant));
    return (find(`${writingStyle}/${componentStyle}`) ?? find(componentStyle) ?? find(writingStyle) ?? variants[0])?.code ?? '';
}
