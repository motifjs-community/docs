import { localePath, localeState, t } from '../i18n';
import { defaultDocSlug, type DocLink } from '../content/docs/api';
import { docsState } from '../content/docs/state';
import { articleSegments, pickVariant, type ArticleSegment } from '../content/docs/segments';
import { codeStyle } from '../preferences/code-style';
import { CodeBlock } from '../components/CodeBlock';

/** One piece of an article: prose straight from the rendered markdown, or a code example. */
function Segment(props: { segment: ArticleSegment }) {
    const segment = props.segment;
    if (segment.kind === 'code') {
        return <CodeBlock file={segment.file} source={() => pickVariant(segment.variants, codeStyle.writingStyle, codeStyle.componentStyle)} />;
    }
    return <div class="docs-prose" onbuilt={(c) => (c.element as HTMLElement).innerHTML = segment.html} />;
}

function headline(): { eyebrow: string; title: string; lead: string } {
    const page = docsState.page;
    if (docsState.status === 'missing') return { eyebrow: t('docs.detail.root'), title: t('docs.detail.notFound'), lead: t('docs.detail.notFoundLead') };
    if (docsState.status === 'error') return { eyebrow: t('docs.detail.root'), title: t('docs.detail.loadError'), lead: t('docs.detail.loadErrorLead') };
    return { eyebrow: page?.category.title ?? '', title: page?.title ?? '', lead: page?.description ?? '' };
}

const linkTo = (doc: DocLink | null | undefined) => localePath(doc ? `/docs/${doc.slug}` : '/docs');

/** The article column of the docs reader; DocsLayout loads the page and keeps the chrome around it. */
export default function DocsArticlePage() {
    const visiblePage = () => docsState.status === 'ready' ? docsState.page : null;

    return (
        <article class="docs-article">
            <div class="docs-article-eyebrow">{() => headline().eyebrow}</div>
            <h1>{() => headline().title}</h1>
            <p class="docs-article-lead">{() => headline().lead}</p>
            <div class="docs-article-rule"></div>

            <div class="docs-article-body">
                {() => articleSegments(visiblePage(), localeState.current).map((segment) => <Segment key={segment.key} segment={segment} />)}
            </div>

            <a class="docs-start-link" href={() => localePath(`/docs/${defaultDocSlug}`)} rel="router" x-display={() => docsState.status === 'missing'}>
                {() => t('docs.home.startHere')} <span aria-hidden="true">→</span>
            </a>

            <nav class="docs-page-pagination" aria-label="Document pages" x-display={() => visiblePage() !== null}>
                <a class={() => visiblePage()?.previous ? 'docs-pagination-card' : 'docs-pagination-card is-disabled'} href={() => linkTo(visiblePage()?.previous)} rel="router">
                    <span>← {() => t('docs.detail.previous')}</span>
                    <strong>{() => visiblePage()?.previous?.title ?? t('docs.detail.root')}</strong>
                </a>
                <a class={() => visiblePage()?.next ? 'docs-pagination-card is-next' : 'docs-pagination-card is-next is-disabled'} href={() => linkTo(visiblePage()?.next)} rel="router">
                    <span>{() => t('docs.detail.next')} →</span>
                    <strong>{() => visiblePage()?.next?.title ?? t('docs.detail.root')}</strong>
                </a>
            </nav>
        </article>
    );
}
