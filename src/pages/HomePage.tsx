import { t } from '../i18n';
import site from 'virtual:site-config';
import { BrandMark } from '../components/Brand';
import { codeExamples, writingStyles, componentStyles } from '../content/docs/code-examples';
import { HighlightedCode } from '../components/HighlightedCode';
import { codeStyle, resolveCode, setComponentStyle, setWritingStyle } from '../preferences/code-style';

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

export default function HomePage() {
    return (
        <main class="home-page">
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
                        <div class="eyebrow"><span class="eyebrow-dot"></span> {() => t('home.hero.eyebrow')}</div>
                        <h1 id="hero-title">{() => t('home.hero.titleStart')}<br />{() => t('home.hero.titleMiddle')} <span>{() => t('home.hero.titleAccent')}</span></h1>
                        <p class="hero-description">
                            {() => t('home.hero.description')}
                        </p>

                        <div class="hero-actions">
                            <a class="button button-primary" href="#get-started">{() => t('home.hero.getStarted')} <span aria-hidden="true">↗</span></a>
                            <a class="button button-quiet" href={site.links.repository} target="_blank" rel="noreferrer">{() => t('home.hero.exploreGithub')} <span aria-hidden="true">↗</span></a>
                        </div>

                    </div>

                    <div class="docs-preview" id="examples" aria-label={() => t('home.hero.previewLabel')}>
                        <div class="docs-preview-topbar">
                            <div class="preview-brand">
                                <BrandMark />
                                <span>motif<span>js</span></span>
                            </div>
                            <div class="preview-product-nav"><span>{() => t('home.preview.docs')}</span><span>{() => t('home.preview.apiReference')}</span><span>{() => t('header.examples')}</span></div>
                            <div class="preview-search"><span class="search-glyph" aria-hidden="true"></span> {() => t('home.hero.search')} <kbd>⌘ K</kbd></div>
                        </div>

                        <div class="docs-preview-body">
                            <aside class="preview-sidebar" aria-label="Preview documentation navigation">
                                <span class="preview-side-caption">{() => t('home.preview.gettingStarted')}</span>
                                <span class="preview-side-link is-current"><i></i> {() => t('home.preview.introduction')}</span>
                                <span class="preview-side-link">{() => t('home.preview.quickstart')}</span>
                                <span class="preview-side-link">{() => t('home.preview.installation')}</span>
                                <span class="preview-side-caption preview-side-spaced">{() => t('home.preview.coreConcepts')}</span>
                                <span class="preview-side-link">{() => t('home.preview.components')}</span>
                                <span class="preview-side-link">{() => t('home.preview.reactivity')}</span>
                                <span class="preview-side-link">{() => t('home.preview.bindings')}</span>
                                <span class="preview-side-caption preview-side-spaced">{() => t('home.preview.guides')}</span>
                                <span class="preview-side-link">{() => t('home.preview.routing')}</span>
                                <span class="preview-side-link">{() => t('home.preview.services')}</span>
                            </aside>

                            <div class="preview-article">
                                <div class="preview-breadcrumb"><span>{() => t('home.preview.docs')}</span><b>/</b><span>{() => t('home.preview.introduction')}</span></div>
                                <h2>{() => t('home.preview.articleTitle')}</h2>
                                <p>{() => t('home.preview.articleDescription')}</p>

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
                                                        class={() => codeStyle.writingStyle === style.value ? 'segment is-selected' : 'segment'}
                                                        aria-pressed={() => codeStyle.writingStyle === style.value}
                                                        onclick={() => setWritingStyle(style.value)}
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
                                                        class={() => codeStyle.componentStyle === style.value ? 'segment is-selected' : 'segment'}
                                                        aria-pressed={() => codeStyle.componentStyle === style.value}
                                                        onclick={() => setComponentStyle(style.value)}
                                                    >{style.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <pre class="code-body"><HighlightedCode source={() => resolveCode(codeExamples)} /></pre>
                                    <div class="showcase-foot"><span class="live-indicator"></span> {() => t('home.preview.yourStyle')}</div>
                                </div>

                                <div class="preview-next"><span>{() => t('home.preview.next')}</span><strong>{() => t('home.preview.nextTopic')} <b aria-hidden="true">→</b></strong></div>
                            </div>
                        </div>
                    </div>
                </div>

                <a class="scroll-cue" href="#why-motifjs" aria-label={() => t('home.scrollCue')}><span></span></a>
            </section>

            <section class="value-section section-wrap" id="why-motifjs">
                <div class="section-heading">
                    <span class="section-kicker">{() => t('home.value.kicker')}</span>
                    <h2>{() => t('home.value.titleStart')} <span>{() => t('home.value.titleEnd')}</span></h2>
                    <p>{() => t('home.value.description')}</p>
                </div>

                <div class="feature-grid">
                    <article class="feature-card">
                        <span class="feature-icon icon-pulse" aria-hidden="true"><i></i></span>
                        <h3>{() => t('home.feature1.title')}</h3>
                        <p>{() => t('home.feature1.description')}</p>
                        <span class="feature-caption">{() => t('home.feature1.caption')}</span>
                    </article>
                    <article class="feature-card">
                        <span class="feature-icon icon-dom" aria-hidden="true"><i></i><i></i><i></i></span>
                        <h3>{() => t('home.feature2.title')}</h3>
                        <p>{() => t('home.feature2.description')}</p>
                        <span class="feature-caption">{() => t('home.feature2.caption')}</span>
                    </article>
                    <article class="feature-card">
                        <span class="feature-icon icon-shapes" aria-hidden="true"><i></i><i></i></span>
                        <h3>{() => t('home.feature3.title')}</h3>
                        <p>{() => t('home.feature3.description')}</p>
                        <span class="feature-caption">{() => t('home.feature3.caption')}</span>
                    </article>
                </div>
            </section>

            <section class="approach-section" id="ways-to-build">
                <div class="section-wrap approach-inner">
                    <div class="approach-intro">
                        <div>
                            <span class="section-kicker">{() => t('home.approach.kicker')}</span>
                            <h2>{() => t('home.approach.titleStart')}<br /><span>{() => t('home.approach.titleEnd')}</span></h2>
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
                        <span class="section-kicker">{() => t('home.runtime.kicker')}</span>
                        <h2>{() => t('home.runtime.titleStart')}<br /><span>{() => t('home.runtime.titleEnd')}</span></h2>
                        <p>{() => t('home.runtime.description')}</p>
                        <ul class="runtime-list">
                            <li><span>✓</span> {() => t('home.runtime.point1')}</li>
                            <li><span>✓</span> {() => t('home.runtime.point2')}</li>
                            <li><span>✓</span> {() => t('home.runtime.point3')}</li>
                        </ul>
                        <p class="runtime-ssr-note"><strong>SSR</strong><span>{() => t('home.runtime.ssrNote')}</span></p>
                        <a class="text-link" href="#get-started">{() => t('home.runtime.explore')} <span aria-hidden="true">→</span></a>
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
                        <div>
                            <span class="section-kicker">{() => t('home.explore.kicker')}</span>
                            <h2>{() => t('home.explore.titleStart')}<br /><span>{() => t('home.explore.titleEnd')}</span></h2>
                        </div>
                        <p>{() => t('home.explore.description')}</p>
                    </div>
                    <div class="explore-grid">
                        <a class="explore-card explore-card-large" href="#get-started">
                            <CardRibbons variant="state" />
                            <span class="explore-icon explore-icon-reactive" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.reactivityLabel')}</span><h3>{() => t('home.explore.reactivityTitle')}</h3><p>{() => t('home.explore.reactivityDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href="#get-started">
                            <span class="explore-pattern explore-pattern-routing" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-router" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.routingLabel')}</span><h3>{() => t('home.explore.routingTitle')}</h3><p>{() => t('home.explore.routingDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href="#get-started">
                            <span class="explore-pattern explore-pattern-services" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-service" aria-hidden="true"><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.servicesLabel')}</span><h3>{() => t('home.explore.servicesTitle')}</h3><p>{() => t('home.explore.servicesDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href="#runtime">
                            <span class="explore-pattern explore-pattern-lifecycle" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-lifecycle" aria-hidden="true"><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.lifecycleLabel')}</span><h3>{() => t('home.explore.lifecycleTitle')}</h3><p>{() => t('home.explore.lifecycleDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card" href="#get-started">
                            <span class="explore-pattern explore-pattern-virtualization" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-virtualization" aria-hidden="true"><i></i><i></i><i></i></span>
                            <div><span class="mini-label">{() => t('home.explore.virtualizationLabel')}</span><h3>{() => t('home.explore.virtualizationTitle')}</h3><p>{() => t('home.explore.virtualizationDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                        <a class="explore-card explore-card-wide" href="#examples">
                            <span class="explore-pattern explore-pattern-examples" aria-hidden="true"></span>
                            <span class="explore-icon explore-icon-code" aria-hidden="true">&lt;/&gt;</span>
                            <div><span class="mini-label">{() => t('home.explore.examplesLabel')}</span><h3>{() => t('home.explore.examplesTitle')}</h3><p>{() => t('home.explore.examplesDescription')}</p></div>
                            <span class="explore-arrow" aria-hidden="true">↗</span>
                        </a>
                    </div>
                </div>
            </section>

            <section class="principles-section">
                <div class="section-wrap principles-inner">
                    <div class="principles-heading">
                        <span class="section-kicker">{() => t('home.principles.kicker')}</span>
                        <h2>{() => t('home.principles.titleStart')}<br /><span>{() => t('home.principles.titleEnd')}</span></h2>
                    </div>
                    <div class="principle-stats">
                        <article><strong>2</strong><span>{() => t('home.principles.stat1')}</span><small>{() => t('home.principles.stat1Detail')}</small></article>
                        <article><strong>3</strong><span>{() => t('home.principles.stat2')}</span><small>{() => t('home.principles.stat2Detail')}</small></article>
                        <article><strong>1</strong><span>{() => t('home.principles.stat3')}</span><small>{() => t('home.principles.stat3Detail')}</small></article>
                    </div>
                    <div class="principles-ribbon" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
                </div>
            </section>

            <section class="community-section">
                <div class="section-wrap community-inner">
                    <div>
                        <span class="section-kicker">{() => t('home.community.kicker')}</span>
                        <h2>{() => t('home.community.titleStart')}<br /><span>{() => t('home.community.titleEnd')}</span></h2>
                        <p>{() => t('home.community.description')}</p>
                    </div>
                    <div class="community-actions">
                        <a class="button button-primary" href={site.links.repository} target="_blank" rel="noreferrer">{() => t('home.community.repository')} <span aria-hidden="true">↗</span></a>
                        <a class="button button-quiet" href={site.links.issues} target="_blank" rel="noreferrer">{() => t('home.community.discussions')} <span aria-hidden="true">↗</span></a>
                    </div>
                    <div class="community-mark" aria-hidden="true"><BrandMark /><i></i><i></i><i></i></div>
                </div>
            </section>

            <section class="start-section" id="get-started">
                <div class="start-glow" aria-hidden="true"></div>
                <div class="start-inner">
                    <div>
                        <span class="section-kicker">{() => t('home.start.kicker')}</span>
                        <h2>{() => t('home.start.titleStart')}<br />{() => t('home.start.titleEnd')}</h2>
                        <p>{() => t('home.start.description')}</p>
                    </div>
                    <div class="install-card">
                        <span class="install-label">{() => t('home.start.install')}</span>
                        <code><span class="terminal-prompt">$</span> npm install @motifx/core @motifx/compiler</code>
                        <div class="install-links">
                            <a href={site.links.repository} target="_blank" rel="noreferrer">{() => t('home.start.project')} <span aria-hidden="true">↗</span></a>
                            <a href="#examples">{() => t('home.start.viewExample')} <span aria-hidden="true">→</span></a>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
