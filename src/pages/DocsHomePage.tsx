import { localePath, localeState, t } from '../i18n';
import { defaultDocSlug, prefetchPage } from '../content/docs/api';
import { docsState, showNav } from '../content/docs/state';

const categoryIcons: Record<string, string> = {
    start: 'M5.5 3.6v8.8L12.4 8 5.5 3.6Z',
    'ui-state': 'M8 2.3 13.7 5 8 7.7 2.3 5 8 2.3ZM2.3 8 8 10.7 13.7 8M2.3 11 8 13.7 13.7 11',
    application: 'M2.5 2.5h4.25v4.25H2.5zM9.25 2.5h4.25v4.25H9.25zM2.5 9.25h4.25v4.25H2.5zM9.25 9.25h4.25v4.25H9.25z',
    reference: 'M8 4.2C6.6 3.2 4.8 2.9 2.7 3.4v9.1c2.1-.5 3.9-.2 5.3.8 1.4-1 3.2-1.3 5.3-.8V3.4C11.2 2.9 9.4 3.2 8 4.2Zm0 0v9.1'
};
const fallbackIcon = 'M3.5 2.5h6l3 3v8h-9v-11Z';

export default function DocsHomePage() {
    return (
        <main class="docs-home" onconfig={(c) => c.bindings.watch(() => showNav(localeState.current))}>
            <section class="docs-home-hero">
                <div class="docs-home-hero-inner">
                    <span class="docs-eyebrow"><i></i>{() => t('docs.home.eyebrow')}</span>
                    <h1>{() => t('docs.home.title')}</h1>
                    <p>{() => t('docs.home.description')}</p>
                    <a class="docs-start-link" href={() => localePath(`/docs/${defaultDocSlug}`)} rel="router">
                        {() => t('docs.home.startHere')} <span aria-hidden="true">→</span>
                    </a>
                </div>
            </section>

            <section class="docs-category-section" aria-label={() => t('docs.home.topics')}>
                <div class="docs-category-grid">
                    {docsState.nav.map((category, categoryIndex) => (
                        <article class={categoryIndex === 0 ? 'docs-category-card docs-category-card-featured' : 'docs-category-card'} key={category.id}>
                            <div class="docs-category-card-top">
                                <span class="docs-category-icon" aria-hidden="true">
                                    <svg viewBox="0 0 16 16" fill="none"><path d={categoryIcons[category.id] ?? fallbackIcon} /></svg>
                                </span>
                                <span class="docs-category-count">{() => `${category.pages.length} ${t('docs.home.pages')}`}</span>
                            </div>
                            <h2>{category.title}</h2>
                            <p>{category.description}</p>
                            <nav class="docs-category-links" aria-label={category.title}>
                                {category.pages.map((doc) => (
                                    <a href={localePath(`/docs/${doc.slug}`)} rel="router" key={doc.slug} onmouseenter={() => prefetchPage(doc.slug, localeState.current)}>
                                        <span>{doc.title}</span>
                                        <span class="docs-link-arrow" aria-hidden="true">→</span>
                                    </a>
                                ))}
                            </nav>
                            <a class="docs-category-all" href={localePath(`/docs/${category.pages[0].slug}`)} rel="router">
                                {() => t('docs.home.readGuide')} <span aria-hidden="true">→</span>
                            </a>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
