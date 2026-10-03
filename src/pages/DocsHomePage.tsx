import { t } from '../i18n';
import { docsCategories, defaultDocSlug, type DocsLocale } from '../content/docs/catalog';
import { localeState } from '../i18n';

const categoryIcons: Record<string, string> = {
    start: 'M5.5 3.6v8.8L12.4 8 5.5 3.6Z',
    'ui-state': 'M8 2.3 13.7 5 8 7.7 2.3 5 8 2.3ZM2.3 8 8 10.7 13.7 8M2.3 11 8 13.7 13.7 11',
    application: 'M2.5 2.5h4.25v4.25H2.5zM9.25 2.5h4.25v4.25H9.25zM2.5 9.25h4.25v4.25H2.5zM9.25 9.25h4.25v4.25H9.25z',
    reference: 'M8 4.2C6.6 3.2 4.8 2.9 2.7 3.4v9.1c2.1-.5 3.9-.2 5.3.8 1.4-1 3.2-1.3 5.3-.8V3.4C11.2 2.9 9.4 3.2 8 4.2Zm0 0v9.1'
};

export default function DocsHomePage() {
    return (
        <main class="docs-home">
            <section class="docs-home-hero">
                <div class="docs-home-hero-inner">
                    <span class="docs-eyebrow"><i></i>{() => t('docs.home.eyebrow')}</span>
                    <h1>{() => t('docs.home.title')}</h1>
                    <p>{() => t('docs.home.description')}</p>
                    <a class="docs-start-link" href={`/docs/${defaultDocSlug}`} rel="router">
                        {() => t('docs.home.startHere')} <span aria-hidden="true">→</span>
                    </a>
                </div>
            </section>

            <section class="docs-category-section" aria-label={() => t('docs.home.topics')}>
                <div class="docs-category-grid">
                    {docsCategories.map((category, categoryIndex) => (
                        <article class={() => categoryIndex === 0 ? 'docs-category-card docs-category-card-featured' : 'docs-category-card'} key={category.id}>
                            <div class="docs-category-card-top">
                                <span class="docs-category-icon" aria-hidden="true">
                                    <svg viewBox="0 0 16 16" fill="none"><path d={categoryIcons[category.id]} /></svg>
                                </span>
                                <span class="docs-category-count">{() => `${category.pages.length} ${t('docs.home.pages')}`}</span>
                            </div>
                            <h2>{() => category.title[localeState.current as DocsLocale]}</h2>
                            <p>{() => category.description[localeState.current as DocsLocale]}</p>
                            <nav class="docs-category-links" aria-label={() => category.title[localeState.current as DocsLocale]}>
                                {category.pages.map((doc) => (
                                    <a href={`/docs/${doc.slug}`} rel="router" key={doc.slug}>
                                        <span>{() => doc.title[localeState.current as DocsLocale]}</span>
                                        <span class="docs-link-arrow" aria-hidden="true">→</span>
                                    </a>
                                ))}
                            </nav>
                            <a class="docs-category-all" href={`/docs/${category.pages[0].slug}`} rel="router">
                                {() => t('docs.home.readGuide')} <span aria-hidden="true">→</span>
                            </a>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
