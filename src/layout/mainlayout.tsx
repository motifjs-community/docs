import { reactive, RouterView, useNavigation } from "@motifx/core";
import { localeState, setLocale, supportedLocales, t } from '../i18n';
import SiteFooter from './SiteFooter';
import { BrandMark, BrandWordmark } from '../components/Brand';

export default function MainLayout() {
    const navigation = useNavigation();
    const languageMenu = reactive({ open: false });
    const theme = reactive({
        mode: localStorage.getItem('motifjs-theme') === 'light' ? 'light' : 'dark'
    });
    document.documentElement.setAttribute('data-theme', theme.mode);

    return (
        <>
            {/* Keyed to the address, not to the rendered page, so the width holds while the next page loads. */}
            <header class={() => navigation.uri.startsWith('/docs/') ? 'site-header is-docs-reader' : 'site-header'}>
                <div class="header-inner">
                    <a href="/" class="brand" aria-label={() => t('header.home')}>
                        <BrandMark />
                        <BrandWordmark />
                    </a>

                    <nav class="primary-nav" aria-label={() => t('header.navLabel')}>
                        <a class="nav-link" href="/#why-motifjs">{() => t('header.why')}</a>
                        <a class="nav-link" href="/#examples">{() => t('header.examples')}</a>
                        <a class="nav-link" href="/docs" rel="router">{() => t('header.docs')}</a>
                        <a class="nav-link nav-github" href="https://github.com/motifjsdev/motifjs" target="_blank" rel="noreferrer">
                            {() => t('header.github')} <span aria-hidden="true">↗</span>
                        </a>
                    </nav>

                    <div class="language-menu-wrap">
                        <button
                            class="language-toggle"
                            type="button"
                            aria-label={() => t('header.switchLanguage')}
                            aria-haspopup="menu"
                            aria-expanded={() => languageMenu.open}
                            title={() => t('header.switchLanguage')}
                            onclick={() => languageMenu.open = !languageMenu.open}
                        >
                            <span>{() => localeState.current.toUpperCase()}</span>
                            <span class="language-chevron" aria-hidden="true">⌄</span>
                        </button>
                        <div class="language-menu" role="menu" aria-label={() => t('header.switchLanguage')} x-wait={() => !languageMenu.open}>
                            {supportedLocales.map((locale) => (
                                <button
                                    key={locale.code}
                                    class={() => localeState.current === locale.code ? 'language-option is-selected' : 'language-option'}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={() => localeState.current === locale.code}
                                    onclick={() => {
                                        setLocale(locale.code);
                                        languageMenu.open = false;
                                    }}
                                >
                                    <span>{locale.label}</span>
                                    <span class="language-option-code">{locale.code.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        class="theme-toggle"
                        type="button"
                        aria-label={() => t(theme.mode === 'dark' ? 'header.switchLight' : 'header.switchDark')}
                        title={() => t(theme.mode === 'dark' ? 'header.switchLight' : 'header.switchDark')}
                        onclick={() => {
                            theme.mode = theme.mode === 'dark' ? 'light' : 'dark';
                            document.documentElement.setAttribute('data-theme', theme.mode);
                            localStorage.setItem('motifjs-theme', theme.mode);
                        }}
                    >
                        <span aria-hidden="true">{() => theme.mode === 'dark' ? '☼' : '☾'}</span>
                    </button>

                    <a class="header-cta" href="/docs" rel="router">
                        {() => t('header.readDocs')} <span aria-hidden="true">→</span>
                    </a>
                </div>
            </header>
            {/* Holds at least a screen of height so the footer does not jump up while pages swap. */}
            <div class="site-content">
                <RouterView />
            </div>
            <SiteFooter />
        </>
    );
}