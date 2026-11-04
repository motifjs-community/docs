import { localePath, localeState, t } from '../i18n';
import site from 'virtual:site-config';
import { BrandMark } from '../components/Brand';
import { openSearch, searchShortcut } from '../components/SearchDialog';
import { codeExamples, writingStyles, componentStyles } from '../content/docs/code-examples';
import type { NavPage } from '../content/docs/api';
import { docsState, showNav } from '../content/docs/state';
import { HighlightedCode } from '../components/HighlightedCode';
import { codeChoices, resolveCode, setCodeChoice } from '../preferences/code-style';

// The docs preview in the hero shows the real documentation: its menu, and the Getting Started page
// (the first page when a site has none) with the counter example that page explains.
const previewSlug = 'getting-started';

function docsPages(): NavPage[] {
    return docsState.nav.flatMap((category) => category.pages);
}

function previewPage(): NavPage | null {
    const pages = docsPages();
    return pages.find((page) => page.slug === previewSlug) ?? pages[0] ?? null;
}

function pageAfterPreview(): NavPage | null {
    const pages = docsPages();
    const at = pages.findIndex((page) => page.slug === previewPage()?.slug);
    return at >= 0 ? pages[at + 1] ?? null : null;
}

const docsLink = (page: NavPage | null) => localePath(page ? `/docs/${page.slug}` : '/docs');

const primaryRibbons = Array.from({ length: 17 }, (_, index) => {
    const offset = index * 13;
    return {
        id: index,
        d: `M -120 ${300 + offset} C 110 ${135 + offset} 280 ${120 + offset} 440 ${270 + offset} S 710 ${510 + offset} 895 ${325 + offset} S 1210 ${95 + offset} 1570 ${270 + offset}`
    };
});

const secondaryRibbons = Array.from({ length: 12 }, (_, index) => {
    const offset = index * 15;
    return {
        id: index,
        d: `M -100 ${570 + offset} C 180 ${700 + offset} 405 ${620 + offset} 575 ${405 + offset} S 980 ${140 + offset} 1550 ${405 + offset}`
    };
});

// Only the featured card animates; the other cards use static patterns (.explore-pattern-*).
type RibbonVariant = 'state';

function CardRibbons(props: { variant: RibbonVariant }) {
    const gradientA = `card-ribbon-${props.variant}-a`;
    const gradientB = `card-ribbon-${props.variant}-b`;

    return (
        <svg class={`card-ribbon-art card-ribbon-art-${props.variant}`} viewBox="0 0 1440 800" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id={gradientA} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" class="ribbon-stop-1" />
                    <stop offset="32%" class="ribbon-stop-2" />
                    <stop offset="66%" class="ribbon-stop-3" />
                    <stop offset="100%" class="ribbon-stop-4" />
                </linearGradient>
                <linearGradient id={gradientB} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" class="ribbon-stop-5" />
                    <stop offset="45%" class="ribbon-stop-6" />
                    <stop offset="100%" class="ribbon-stop-7" />
                </linearGradient>
            </defs>
            <g class="card-ribbon-group-a" stroke={`url(#${gradientA})`}>
                {primaryRibbons.map((ribbon) => <path key={`card-a-${props.variant}-${ribbon.id}`} d={ribbon.d} />)}
            </g>
            <g class="card-ribbon-group-b" stroke={`url(#${gradientB})`}>
                {secondaryRibbons.map((ribbon) => <path key={`card-b-${props.variant}-${ribbon.id}`} d={ribbon.d} />)}
            </g>
        </svg>
    );
}

const installLines = site.installCommands ?? ['npm install @motifx/core', 'npm install -D @motifx/compiler'];

export default function HomePage() {
    return (
        <main class="home-page" onConfig={(c) => c.bindings.watch(() => showNav(localeState.current))}>
            <section class="hero" aria-labelledby="hero-title">
                <div class="hero-scene" aria-hidden="true">
                    <svg class="hero-ribbons" viewBox="0 0 1440 800" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                            <linearGradient id="ribbon-gradient-a" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" class="ribbon-stop-1" />
                                <stop offset="32%" class="ribbon-stop-2" />
                                <stop offset="66%" class="ribbon-stop-3" />
                                <stop offset="100%" class="ribbon-stop-4" />
                            </linearGradient>
                            <linearGradient id="ribbon-gradient-b" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" class="ribbon-stop-5" />
                                <stop offset="45%" class="ribbon-stop-6" />
                                <stop offset="100%" class="ribbon-stop-7" />
                            </linearGradient>
                            <filter id="ribbon-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="3.5" />
                            </filter>
                        </defs>
                        <g class="ribbon-glow ribbon-group-a" filter="url(#ribbon-soft-glow)">
                            {primaryRibbons.map((ribbon) => <path key={`glow-a-${ribbon.id}`} d={ribbon.d} />)}
                        </g>
                        <g class="ribbon-group-a">
                            {primaryRibbons.map((ribbon) => <path key={`line-a-${ribbon.id}`} d={ribbon.d} />)}
                        </g>
                        <g class="ribbon-glow ribbon-group-b" filter="url(#ribbon-soft-glow)">
                            {secondaryRibbons.map((ribbon) => <path key={`glow-b-${ribbon.id}`} d={ribbon.d} />)}
                        </g>
                        <g class="ribbon-group-b">
                            {secondaryRibbons.map((ribbon) => <path key={`line-b-${ribbon.id}`} d={ribbon.d} />)}
                        </g>
                    </svg>
                </div>

                <div class="hero-inner">
                    <div class="hero-copy">
                        <h1 id="hero-title">{() => t('home.hero.titleStart')}<br /><span>{() => t('home.hero.titleAccent')}</span></h1>
                        <p class="hero-description">{() => t('home.hero.description')}</p>

                        <div class="hero-actions">
                            <a class="button button-primary" href={() => localePath('/docs/getting-started')} rel="router">{() => t('home.hero.getStarted')} <span aria-hidden="true">→</span></a>
                            <a class="button button-quiet" href="#why-motifjs">{() => t('home.hero.why')}</a>
                        </div>
                    </div>

                    <div class="docs-preview" id="examples" aria-label={() => t('home.hero.previewLabel')}>
                        <div class="docs-preview-topbar">
                            <div class="preview-brand">
                                <BrandMark />
                                <span>Motif<span>JS</span></span>
                            </div>
                            <div class="preview-product-nav"><span>{() => t('home.preview.docs')}</span><span>{() => t('home.preview.apiReference')}</span><span>{() => t('header.examples')}</span></div>
                            <button type="button" class="preview-search" onclick={(e) => openSearch(e.currentTarget as HTMLElement)}><span class="search-glyph" aria-hidden="true"></span> {() => t('search.open')} <kbd>{searchShortcut}</kbd></button>
                        </div>

                        <div class="docs-preview-body">
                            <aside class="preview-sidebar" aria-label={() => t('docs.detail.navigation')}>
                                {docsState.nav.slice(0, 2).map((category) => (
                                    <div class="preview-side-group" key={category.id}>
                                        <span class="preview-side-caption">{category.title}</span>
                                        {category.pages.map((doc) => (
                                            <a
                                                key={doc.slug}
                                                class={() => previewPage()?.slug === doc.slug ? 'preview-side-link is-current' : 'preview-side-link'}
                                                href={() => docsLink(doc)}
                                                rel="router"
                                            ><i></i><span>{doc.title}</span></a>
                                        ))}
                                    </div>
                                ))}
                            </aside>

                            <div class="preview-article">
                                <div class="preview-breadcrumb"><span>{() => t('home.preview.docs')}</span><b>/</b><span>{() => previewPage()?.title ?? ''}</span></div>
                                <h2>{() => previewPage()?.title ?? ''}</h2>
                                <p>{() => previewPage()?.description ?? ''}</p>

                                <div class="preview-note"><span class="note-spark">✳</span><span>{() => t('home.preview.note')}</span></div>

                                <div class="code-showcase">
                                    <div class="showcase-topline">
                                        <span class="showcase-file">counter.tsx</span>
                                        <span class="showcase-badge"><span></span> TSX</span>
                                    </div>

                                    <div class="showcase-controls">
                                        <div class="control-group" aria-label="Writing style">
                                            <span class="control-label">{() => t('home.preview.writingStyle')}</span>
                                            <div class="segmented-control">
                                                {writingStyles.map((style) => (
                                                    <button
                                                        key={style.value}
                                                        type="button"
                                                        class={() => codeChoices.writing === style.value ? 'segment is-selected' : 'segment'}
                                                        aria-pressed={() => codeChoices.writing === style.value}
                                                        onclick={() => setCodeChoice('writing', style.value)}
                                                    >{style.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div class="control-group" aria-label="Component style">
                                            <span class="control-label">{() => t('home.preview.componentStyle')}</span>
                                            <div class="segmented-control component-control">
                                                {componentStyles.map((style) => (
                                                    <button
                                                        key={style.value}
                                                        type="button"
                                                        class={() => codeChoices.component === style.value ? 'segment is-selected' : 'segment'}
                                                        aria-pressed={() => codeChoices.component === style.value}
                                                        onclick={() => setCodeChoice('component', style.value)}
                                                    >{style.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <pre class="code-body"><HighlightedCode source={() => resolveCode(codeExamples)} /></pre>
                                    <div class="showcase-foot"><span class="live-indicator"></span> {() => t('home.preview.yourStyle')}</div>
                                </div>

                                <a class="preview-next" href={() => docsLink(pageAfterPreview())} rel="router"><span>{() => t('home.preview.next')}</span><strong>{() => pageAfterPreview()?.title ?? ''} <b aria-hidden="true">→</b></strong></a>
                            </div>
                        </div>
                    </div>
                </div>

                <a class="scroll-cue" href="#why-motifjs" aria-label={() => t('home.scrollCue')}><span></span></a>
            </section>

            <section class="value-section section-wrap" id="why-motifjs">
                <div class="section-heading">
                    <h2>{() => t('home.why.title')}</h2>
                    <p>{() => t('home.why.description')}</p>
                </div>

                <div class="feature-grid">
                    <article class="feature-card">
                        <span class="feature-icon icon-pulse" aria-hidden="true"><i></i></span>
                        <h3>{() => t('home.why.card1Title')}</h3>
                        <p>{() => t('home.why.card1Description')}</p>
                    </article>
                    <article class="feature-card">
                        <span class="feature-icon icon-dom" aria-hidden="true"><i></i><i></i><i></i></span>
                        <h3>{() => t('home.why.card2Title')}</h3>
                        <p>{() => t('home.why.card2Description')}</p>
                    </article>
                    <article class="feature-card">
                        <span class="feature-icon icon-shapes" aria-hidden="true"><i></i><i></i></span>
                        <h3>{() => t('home.why.card3Title')}</h3>
                        <p>{() => t('home.why.card3Description')}</p>
                    </article>
                </div>
            </section>

            <section class="approach-section" id="ways-to-build">
                <div class="section-wrap approach-inner">
                    <div class="approach-intro">
                        <div>
                            <h2>{() => t('home.approach.title')}</h2>
                            <p>{() => t('home.approach.description')}</p>
                        </div>
                        <a class="text-link" href="#examples">{() => t('home.approach.tryExample')} <span aria-hidden="true">↗</span></a>
                    </div>

                    <div class="approach-cards">
                        <article class="approach-card approach-card-featured">
                            <div class="approach-card-copy">
                                <span class="mini-label">{() => t('home.approach.card1Label')}</span>
                                <h3>{() => t('home.approach.card1Title')}</h3>
                                <p>{() => t('home.approach.card1Description')}</p>
                            </div>
                            <div class="style-flow" aria-hidden="true">
                                <div class="flow-pill flow-declarative"><i>&lt;/&gt;</i><span>Declarative</span></div>
                                <div class="flow-connector"><span></span></div>
                                <div class="flow-core"><BrandMark /><b>MotifJS</b><small>{() => t('home.approach.sameRuntime')}</small></div>
                                <div class="flow-connector"><span></span></div>
                                <div class="flow-pill flow-imperative"><i>＋</i><span>Imperative</span></div>
                            </div>
                        </article>

                        <article class="approach-card approach-card-forms">
                            <span class="mini-label">{() => t('home.approach.card2Label')}</span>
                            <h3>{() => t('home.approach.card2Title')}</h3>
                            <p>{() => t('home.approach.card2Description')}</p>
                            <div class="form-chips"><span>Class</span><span>Function</span><span>Options</span></div>
                            <div class="form-decoration" aria-hidden="true"><i></i><i></i><i></i></div>
                        </article>

                        <article class="approach-card approach-card-reactive">
                            <span class="mini-label">{() => t('home.approach.card3Label')}</span>
                            <h3>{() => t('home.approach.card3Title')}</h3>
                            <p>{() => t('home.approach.card3Description')}</p>
                            <div class="binding-visual" aria-hidden="true">
                                <span class="binding-node">state.count</span>
                                <i></i><i></i><i></i>
                                <span class="binding-node binding-target">{() => t('home.approach.textNode')}</span>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section class="runtime-section" id="runtime">
                <div class="section-wrap runtime-inner">
                    <div class="runtime-copy">
                        <h2>{() => t('home.runtime.title')}</h2>
                        <p>{() => t('home.runtime.description')}</p>
                        <ul class="runtime-list">
                            <li><span>✓</span> {() => t('home.runtime.point1')}</li>
                            <li><span>✓</span> {() => t('home.runtime.point2')}</li>
                            <li><span>✓</span> {() => t('home.runtime.point3')}</li>
                        </ul>
                        <a class="text-link" href={() => localePath('/docs/navigation')} rel="router">{() => t('home.runtime.explore')} <span aria-hidden="true">→</span></a>
                    </div>

                    <div class="runtime-visual" aria-label={() => t('home.runtime.visualLabel')}>
                        <div class="runtime-orbit orbit-one"></div>
                        <div class="runtime-orbit orbit-two"></div>
                        <div class="runtime-state-card"><span>{() => t('home.runtime.state')}</span><code>count <b>→</b> 4</code><i></i></div>
                        <div class="runtime-pulse-line"><span></span></div>
                        <div class="runtime-dom-card"><span>{() => t('home.runtime.textNode')}</span><strong>Count: 4</strong><small>{() => t('home.runtime.updated')}</small></div>
                        <span class="runtime-visual-tag">{() => t('home.runtime.binding')}</span>
                    </div>
                </div>
            </section>

            <section class="explore-section" id="explore">
                <div class="section-wrap">
                    <div class="explore-heading">
                        <h2>{() => t('home.explore.title')}</h2>
                        <p>{() => t('home.explore.description')}</p>
                    </div>
                    <div class="explore-grid">
                        <a class="explore-card explore-card-large" href={() => localePath('/docs/reactivity')} rel="router">
                            <CardRibbons variant="state" />
                            <span class="explore-icon explore-icon-reactive" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.reactivityLabel')}</span><h3>{() => t('home.explore.reactivityTitle')}</h3><p>{() => t('home.explore.reactivityDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href={() => localePath('/docs/routing')} rel="router">
                            <span class="explore-pattern explore-pattern-routing" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-router" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.routingLabel')}</span><h3>{() => t('home.explore.routingTitle')}</h3><p>{() => t('home.explore.routingDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href={() => localePath('/docs/dependency-injection')} rel="router">
                            <span class="explore-pattern explore-pattern-services" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-service" aria-hidden="true"><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.diLabel')}</span><h3>{() => t('home.explore.diTitle')}</h3><p>{() => t('home.explore.diDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href={() => localePath('/docs/memory-and-dispose')} rel="router">
                            <span class="explore-pattern explore-pattern-lifecycle" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-lifecycle" aria-hidden="true"><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.memoryLabel')}</span><h3>{() => t('home.explore.memoryTitle')}</h3><p>{() => t('home.explore.memoryDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href={() => localePath('/docs/frame')} rel="router">
                            <span class="explore-pattern explore-pattern-virtualization" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-virtualization" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.contentLabel')}</span><h3>{() => t('home.explore.contentTitle')}</h3><p>{() => t('home.explore.contentDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card explore-card-wide" href={() => localePath('/docs/resilience')} rel="router">
                            <span class="explore-pattern explore-pattern-examples" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-code" aria-hidden="true">&lt;/&gt;</span>
                            <div><span class="mini-label">{() => t('home.explore.queryLabel')}</span><h3>{() => t('home.explore.queryTitle')}</h3><p>{() => t('home.explore.queryDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                    </div>
                </div>
            </section>

            <section class="tooling-section" id="tooling">
                <div class="section-wrap">
                    <h2>{() => t('home.tooling.title')}</h2>
                    <div class="tooling-grid">
                        <a class="tooling-card" href={() => localePath('/docs/jsx#compile-time-diagnostics')} rel="router">
                            <h3>{() => t('home.tooling.card1Title')}</h3>
                            <p>{() => t('home.tooling.card1Description')}</p>
                        </a>
                        <a class="tooling-card" href={() => localePath('/docs/getting-started#dev-helpers')} rel="router">
                            <h3>{() => t('home.tooling.card2Title')}</h3>
                            <p>{() => t('home.tooling.card2Description')}</p>
                        </a>
                        <a class="tooling-card" href={() => localePath('/docs/error-codes')} rel="router">
                            <h3>{() => t('home.tooling.card3Title')}</h3>
                            <p>{() => t('home.tooling.card3Description')}</p>
                        </a>
                        <a class="tooling-card" href={site.links.skills ?? site.links.repository} target="_blank" rel="noreferrer">
                            <h3>{() => t('home.tooling.card4Title')}</h3>
                            <p>{() => t('home.tooling.card4Description')}</p>
                        </a>
                    </div>
                </div>
            </section>

            <section class="community-section">
                <div class="section-wrap community-inner">
                    <div>
                        <h2>{() => t('home.community.title')}</h2>
                    </div>
                    <div class="community-actions">
                        <a class="button button-primary" href={site.links.repository} target="_blank" rel="noreferrer">{() => t('home.community.repository')} <span aria-hidden="true">↗</span></a>
                        <a class="button button-quiet" href={site.links.discussions ?? site.links.issues} target="_blank" rel="noreferrer">{() => t('home.community.discussions')} <span aria-hidden="true">↗</span></a>
                    </div>
                    <div class="community-mark" aria-hidden="true"><BrandMark /><i></i><i></i><i></i></div>
                </div>
            </section>

            <section class="start-section" id="get-started">
                <div class="start-glow" aria-hidden="true"></div>
                <div class="start-inner">
                    <div>
                        <h2>{() => t('home.start.title')}</h2>
                        <p>{() => t('home.start.description')}</p>
                    </div>
                    <div class="install-card">
                        <span class="install-label">{() => t('home.start.install')}</span>
                        <div class="install-lines">
                            {installLines.map((line) => <code key={line}><span class="terminal-prompt">$</span> {line}</code>)}
                        </div>
                        <div class="install-links">
                            <a href={() => localePath('/docs/getting-started#build-setup')} rel="router">{() => t('home.start.buildSetup')} <span aria-hidden="true">→</span></a>
                            <a href={site.links.repository} target="_blank" rel="noreferrer">{() => t('home.start.project')} <span aria-hidden="true">↗</span></a>
                            <a href="#examples">{() => t('home.start.viewExample')} <span aria-hidden="true">→</span></a>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
