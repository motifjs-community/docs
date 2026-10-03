import { useNavigation } from '@motifx/core';
import { t } from '../i18n';

export default function SiteFooter() {
    const navigation = useNavigation();

    return (
        <footer class={() => navigation.uri.startsWith('/docs/') ? 'home-footer is-docs-reader' : 'home-footer'}>
            <div class="footer-main">
                <div class="footer-brand-column">
                    <a href="/" class="footer-brand" rel="router" aria-label={() => t('header.home')}>
                        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
                        <span class="brand-name">Motif<span>JS</span></span>
                    </a>
                    <p>{() => t('footer.description')}</p>
                    <a class="footer-github" href="https://github.com/motifjsdev/motifjs" target="_blank" rel="noreferrer">{() => t('footer.openSource')} <span aria-hidden="true">↗</span></a>
                </div>
                <div class="footer-column">
                    <h3>{() => t('footer.explore')}</h3>
                    <a href="/#why-motifjs">{() => t('footer.why')}</a>
                    <a href="/#ways-to-build">{() => t('footer.ways')}</a>
                    <a href="/#runtime">{() => t('footer.runtime')}</a>
                    <a href="/#explore">{() => t('footer.features')}</a>
                </div>
                <div class="footer-column">
                    <h3>{() => t('footer.learn')}</h3>
                    <a href="/docs/getting-started" rel="router">{() => t('footer.gettingStarted')}</a>
                    <a href="/#examples">{() => t('footer.codeExamples')}</a>
                    <a href="/docs/reactivity" rel="router">{() => t('footer.reactivity')}</a>
                    <a href="/docs/routing" rel="router">{() => t('footer.routingServices')}</a>
                </div>
                <div class="footer-column">
                    <h3>{() => t('footer.community')}</h3>
                    <a href="https://github.com/motifjsdev/motifjs" target="_blank" rel="noreferrer">{() => t('footer.repository')} <span aria-hidden="true">↗</span></a>
                    <a href="https://github.com/motifjsdev/motifjs/issues" target="_blank" rel="noreferrer">{() => t('footer.discussions')} <span aria-hidden="true">↗</span></a>
                    <a href="https://www.npmjs.com/package/@motifx/core" target="_blank" rel="noreferrer">{() => t('footer.npm')} <span aria-hidden="true">↗</span></a>
                </div>
            </div>
            <div class="footer-bottom">
                <span>{() => t('footer.copyright')}</span>
                <span>{() => t('footer.madeWith')}</span>
            </div>
        </footer>
    );
}
