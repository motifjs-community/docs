import { useNavigation } from '@motifx/core';
import { adjacentDocs, findCategory, findDoc, type DocsLocale } from '../content/docs/catalog';
import { resolveCode } from '../preferences/code-style';
import { localeState, t } from '../i18n';
import { CodeBlock } from '../components/CodeBlock';

/** The article column of the docs reader; DocsLayout keeps the toolbar, sidebar and TOC around it. */
export default function DocsArticlePage() {
    const navigation = useNavigation();
    const doc = () => findDoc(navigation.params.slug);
    const previousDoc = () => adjacentDocs(navigation.params.slug).previous;
    const nextDoc = () => adjacentDocs(navigation.params.slug).next;

    return (
        <article class="docs-article">
            <div class="docs-article-eyebrow">{() => findCategory(navigation.params.slug).title[localeState.current as DocsLocale]}</div>
            <h1>{() => doc().title[localeState.current as DocsLocale]}</h1>
            <p class="docs-article-lead">{() => doc().description[localeState.current as DocsLocale]}</p>
            <div class="docs-article-rule"></div>

            <div class="docs-article-sections">
                {() => doc().sections.map((section) => (
                    <section class="docs-content-section" id={section.id} key={section.id}>
                        <h2>{section.title[localeState.current as DocsLocale]}</h2>
                        {section.paragraphs[localeState.current as DocsLocale].map((paragraph, index) => <p key={`${section.id}-p-${index}`}>{paragraph}</p>)}
                        {section.code && <CodeBlock file={section.code.file} source={() => resolveCode(section.code!.source)} />}
                    </section>
                ))}
            </div>

            <nav class="docs-page-pagination" aria-label="Document pages">
                <a class={() => previousDoc() ? 'docs-pagination-card' : 'docs-pagination-card is-disabled'} href={() => previousDoc() ? `/docs/${previousDoc()!.slug}` : '/docs'} rel="router">
                    <span>← {() => t('docs.detail.previous')}</span>
                    <strong>{() => previousDoc()?.title[localeState.current as DocsLocale] ?? t('docs.detail.root')}</strong>
                </a>
                <a class={() => nextDoc() ? 'docs-pagination-card is-next' : 'docs-pagination-card is-next is-disabled'} href={() => nextDoc() ? `/docs/${nextDoc()!.slug}` : '/docs'} rel="router">
                    <span>{() => t('docs.detail.next')} →</span>
                    <strong>{() => nextDoc()?.title[localeState.current as DocsLocale] ?? t('docs.detail.root')}</strong>
                </a>
            </nav>
        </article>
    );
}
