import { localeState, setPageTitle, t } from '../i18n';
import site from 'virtual:site-config';
import { showNav } from '../content/docs/state';

const org = 'https://github.com/motifjs-community';

export default function CommunityPage() {
    return (
        <main
            class="docs-home community-page"
            onconfig={(c) => {
                c.bindings.watch(() => showNav(localeState.current));
                c.bindings.watch(() => setPageTitle(t('community.title')));
                c.motif.setDisposable(() => setPageTitle());
            }}
        >
            <section class="docs-home-hero">
                <div class="docs-home-hero-inner">
                    <span class="docs-eyebrow"><i></i>{() => t('community.eyebrow')}</span>
                    <h1>{() => t('community.title')}</h1>
                    <p>{() => t('community.description')}</p>
                    <div class="docs-home-actions">
                        <a class="docs-start-link" href={org} target="_blank" rel="noreferrer">
                            {() => t('community.organization')} <span aria-hidden="true">↗</span>
                        </a>
                    </div>
                </div>
            </section>

            <section class="section-wrap community-packages" aria-labelledby="community-packages-title">
                <div class="section-heading">
                    <h2 id="community-packages-title">{() => t('community.packagesTitle')}</h2>
                    <p>{() => t('community.packagesDescription')}</p>
                </div>
                <div class="explore-grid">
                    <a class="explore-card explore-card-large" href="https://ui.motifjs.com" target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-virtualization" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-virtualization" aria-hidden="true"><i></i><i></i><i></i></span>
                        <div><span class="mini-label">@motifx-community/ui</span><h3>{() => t('community.uiTitle')}</h3><p>{() => t('community.uiDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a class="explore-card" href={`${org}/motifjs-design-system`} target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-routing" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-reactive" aria-hidden="true"><i></i><i></i><i></i></span>
                        <div><span class="mini-label">@motifx-community/design-system</span><h3>{() => t('community.designSystemTitle')}</h3><p>{() => t('community.designSystemDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a class="explore-card" href={`${org}/motifjs-data`} target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-services" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-service" aria-hidden="true"><i></i><i></i></span>
                        <div><span class="mini-label">@motifx-community/data</span><h3>{() => t('community.dataTitle')}</h3><p>{() => t('community.dataDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a class="explore-card" href={`${org}/motifjs-i18n`} target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-lifecycle" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-router" aria-hidden="true"><i></i><i></i><i></i></span>
                        <div><span class="mini-label">@motifx-community/i18n</span><h3>{() => t('community.i18nTitle')}</h3><p>{() => t('community.i18nDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a class="explore-card" href={`${org}/motifjs-devtools`} target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-examples" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-lifecycle" aria-hidden="true"><i></i><i></i></span>
                        <div><span class="mini-label">motifjs-devtools</span><h3>{() => t('community.devtoolsTitle')}</h3><p>{() => t('community.devtoolsDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a class="explore-card explore-card-wide" href={site.links.skills} target="_blank" rel="noreferrer">
                        <span class="explore-pattern explore-pattern-examples" aria-hidden="true"></span>
                        <span class="explore-icon explore-icon-code" aria-hidden="true">&lt;/&gt;</span>
                        <div><span class="mini-label">motifjsdev/skills</span><h3>{() => t('community.skillsTitle')}</h3><p>{() => t('community.skillsDescription')}</p></div>
                        <span class="explore-arrow" aria-hidden="true">↗</span>
                    </a>
                </div>
            </section>

            <section class="section-wrap community-join" aria-labelledby="community-join-title">
                <div class="section-heading">
                    <h2 id="community-join-title">{() => t('community.joinTitle')}</h2>
                    <p>{() => t('community.joinDescription')}</p>
                </div>
                <div class="community-join-actions">
                    <a class="button button-primary" href={site.links.discussions ?? site.links.issues} target="_blank" rel="noreferrer">{() => t('home.community.discussions')} <span aria-hidden="true">↗</span></a>
                    <a class="button button-quiet" href={`${org}/.github/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">{() => t('community.contributing')} <span aria-hidden="true">↗</span></a>
                    <a class="button button-quiet" href={site.links.issues} target="_blank" rel="noreferrer">{() => t('community.issues')} <span aria-hidden="true">↗</span></a>
                </div>
            </section>
        </main>
    );
}
