import { reactive, RouterView, useNavigation, type Component } from "@motifx/core";
import { localePath, localeState, rememberLocale, stripLocale, supportedLocales, t, type LocaleCode } from '../i18n';
import SiteFooter from './SiteFooter';
import site from 'virtual:site-config';
import { BrandMark, BrandWordmark } from '../components/Brand';
import { routeInLocale } from '../content/docs/state';

export default function MainLayout() {
    const navigation = useNavigation();
    const languageMenu = reactive({ open: false });
    const theme = reactive({
        mode: localStorage.getItem('motifjs-theme') === 'light' ? 'light' : 'dark'
    });
    document.documentElement.setAttribute('data-theme', theme.mode);

    // The language is part of the address: switching it opens the same page under the other prefix,
    // or that language's docs home when it has no such page.
    const switchLocale = async (locale: LocaleCode) => {
        languageMenu.open = false;
        rememberLocale(locale);
        if (locale === localeState.current) return;
        const route = stripLocale(location.pathname);
        const target = await routeInLocale(route, locale);
        navigation.navigate(localePath(target, locale) + (target === route ? location.search + location.hash : ''));
    };

    // The header is fixed: it turns solid once the page moves, and on small screens it slides away
    // while reading down and comes back on the way up. State lives on <html> so other bars can follow it.
    const followScroll = (header: Component) => {
        const root = document.documentElement;
        const smallScreen = window.matchMedia('(max-width: 760px)');
        const revealAbove = 120;
        let lastY = window.scrollY;
        let frame = 0;

        const update = () => {
            frame = 0;
            const y = Math.max(0, window.scrollY);
            root.classList.toggle('header-scrolled', y > 8);

            const delta = y - lastY;
            if (Math.abs(delta) < 6 && y > revealAbove) return; // ignore jitter, keep the reference point
            const hide = smallScreen.matches && y > revealAbove && delta > 0
                && !languageMenu.open && !root.classList.contains('docs-drawer-open');
            root.classList.toggle('header-hidden', hide);
            lastY = y;
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        const reveal = () => root.classList.remove('header-hidden');

        window.addEventListener('scroll', schedule, { passive: true });
        smallScreen.addEventListener('change', schedule);
        header.element.addEventListener('focusin', reveal); // keyboard users must never land on a hidden menu
        header.motif.setDisposable(() => {
            window.removeEventListener('scroll', schedule);
            smallScreen.removeEventListener('change', schedule);
            header.element.removeEventListener('focusin', reveal);
            cancelAnimationFrame(frame);
            root.classList.remove('header-scrolled', 'header-hidden');
        });
        update();
    };

    return (
        <>
            {/* Keyed to the address, not to the rendered page, so the width holds while the next page loads. */}
            <header class={() => stripLocale(navigation.uri).startsWith('/docs/') ? 'site-header is-docs-reader' : 'site-header'} onmounted={followScroll}>
                <div class="header-inner">
                    <a href={() => localePath('/')} class="brand" onclick={() => { navigation.navigate(localePath('/'), { scroll: 'top' }); return false; }} aria-label={() => t('header.home')}>
                        <BrandMark />
                        <BrandWordmark />
                    </a>

                    <nav class="primary-nav" aria-label={() => t('header.navLabel')}>
                        <a class="nav-link" rel="router" href={() => localePath('/#why-motifjs')}>{() => t('header.why')}</a>
                        <a class="nav-link" rel="router" href={() => localePath('/#examples')}>{() => t('header.examples')}</a>
                        <a class="nav-link" href={() => localePath('/docs')} rel="router">{() => t('header.docs')}</a>
                        <a class="nav-link nav-github" href={site.links.repository} target="_blank" rel="noreferrer">
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
                                    onclick={() => switchLocale(locale.code)}
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

                    <a class="header-cta" href={() => localePath('/docs')} rel="router">
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