import { reactive, useNavigation, type Component } from '@motifx/core';
import { localePath, localeState, t } from '../i18n';
import { loadSearchIndex, searchDocs, type SearchIndex, type SearchResult, type TextPart } from '../content/docs/search';
import { scrollToSection } from '../scroll-to-section';

/** Whether the search is on screen; buttons and the keyboard shortcut set it. */
export const searchState = reactive({ open: false });

/** The key combination shown next to search buttons, as the reader's platform writes it. */
export const searchShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

let opener: HTMLElement | null = null;

/** Opens the search; `from` is the button to return focus to when it closes. */
export function openSearch(from?: HTMLElement | null): void {
    opener = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    searchState.open = true;
}

export function closeSearch(): void {
    searchState.open = false;
}

export function isSearchShortcut(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

function Highlighted(props: { parts: TextPart[] }) {
    return <>{props.parts.map((part) => part.hit ? <mark>{part.text}</mark> : <span>{part.text}</span>)}</>;
}

/**
 * The docs search: a dialog over the page, searched in the browser over the language's index. Built when
 * first opened; the index is fetched then, once per language.
 */
export function SearchDialog() {
    const navigation = useNavigation();
    const state = reactive({
        query: '',
        results: [] as SearchResult[],
        activeKey: '',
        status: 'idle' as 'idle' | 'loading' | 'ready' | 'error'
    });

    let input: HTMLInputElement | null = null;
    let index: SearchIndex | null = null;
    let indexLocale = '';

    const run = () => {
        state.results = index ? searchDocs(index, state.query) : [];
        state.activeKey = state.results[0]?.key ?? '';
    };

    const loadIndex = () => {
        const locale = localeState.current;
        if (index && indexLocale === locale) return;
        state.status = 'loading';
        loadSearchIndex(locale)
            .then((loaded) => {
                if (locale !== localeState.current) return;
                index = loaded;
                indexLocale = locale;
                state.status = 'ready';
                run();
            })
            .catch(() => {
                if (locale === localeState.current) state.status = 'error';
            });
    };

    const hrefOf = (result: SearchResult) =>
        localePath(`/docs/${result.entry.slug}` + (result.entry.id ? `#${result.entry.id}` : ''));

    // The router scrolls to the section of a page it opens; on the page already shown it is done here.
    const chosen = (result: SearchResult, navigate: boolean) => {
        closeSearch();
        const samePage = navigation.params.slug === result.entry.slug;
        if (navigate) navigation.navigate(hrefOf(result));
        if (samePage) scrollToSection(result.entry.id, 'smooth');
    };

    const move = (step: number) => {
        const count = state.results.length;
        if (count === 0) return;
        const at = state.results.findIndex((result) => result.key === state.activeKey);
        state.activeKey = state.results[(at + step + count) % count].key;
        requestAnimationFrame(() => document.querySelector('.search-result.is-active')?.scrollIntoView({ block: 'nearest' }));
    };

    const onKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
            case 'Escape': closeSearch(); return { cancel: true };
            case 'ArrowDown': move(1); return { cancel: true };
            case 'ArrowUp': move(-1); return { cancel: true };
            case 'Enter': {
                const active = state.results.find((result) => result.key === state.activeKey);
                if (active) chosen(active, true);
                return { cancel: true };
            }
        }
    };

    const follow = (dialog: Component) => {
        dialog.bindings.watch(() => {
            const open = searchState.open;
            document.documentElement.classList.toggle('search-open', open);
            if (open) {
                loadIndex();
                // On the first open the input is built right after this; later opens focus it at once.
                input?.focus();
                requestAnimationFrame(() => {
                    input?.focus();
                    input?.select();
                });
            } else {
                opener?.focus();
                opener = null;
            }
        });
        dialog.motif.setDisposable(() => document.documentElement.classList.remove('search-open'));
    };

    return (
        <div class="search-layer" x-wait={() => !searchState.open} onConfig={follow} onkeydown={onKeyDown}>
            <div class="search-backdrop" onclick={() => closeSearch()}></div>
            <div class="search-dialog" role="dialog" aria-modal="true" aria-label={() => t('search.open')}>
                <div class="search-field">
                    <span class="search-glyph" aria-hidden="true"></span>
                    <input
                        ref={(c) => input = c.element as HTMLInputElement}
                        onMounted={(c) => (c.element as HTMLInputElement).focus()}
                        class="search-input"
                        type="search"
                        autocomplete="off"
                        spellcheck={false}
                        placeholder={() => t('search.placeholder')}
                        aria-label={() => t('search.placeholder')}
                        oninput={(e) => { state.query = (e.target as HTMLInputElement).value; run(); }}
                    />
                    <button type="button" class="search-close" aria-label={() => t('search.close')} onclick={() => closeSearch()}><kbd>Esc</kbd></button>
                </div>

                <div class="search-results" role="listbox" aria-label={() => t('search.results')}>
                    {state.results.map((result) => (
                        <a
                            key={result.key}
                            class={() => state.activeKey === result.key ? 'search-result is-active' : 'search-result'}
                            role="option"
                            aria-selected={() => state.activeKey === result.key}
                            href={() => hrefOf(result)}
                            rel="router"
                            onmouseenter={() => state.activeKey = result.key}
                            onclick={() => chosen(result, false)}
                        >
                            <span class="search-result-page"><Highlighted parts={result.title} /></span>
                            {result.entry.id !== '' && <span class="search-result-heading"><Highlighted parts={result.heading} /></span>}
                            <span class="search-result-text"><Highlighted parts={result.snippet} /></span>
                        </a>
                    ))}
                </div>

                <p class="search-message" x-display={() => state.status === 'loading'}>{() => t('search.loading')}</p>
                <p class="search-message" x-display={() => state.status === 'error'}>{() => t('search.error')}</p>
                <p class="search-message" x-display={() => state.status === 'ready' && state.query.trim() === ''}>{() => t('search.hint')}</p>
                <p class="search-message" x-display={() => state.status === 'ready' && state.query.trim() !== '' && state.results.length === 0}>{() => t('search.noResults')}</p>
                <div class="search-foot">{() => t('search.keys')}</div>
            </div>
        </div>
    );
}
