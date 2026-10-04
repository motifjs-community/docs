import { reactive, RouterView, useNavigation, type Component } from '@motifx/core';
import { prefetchPage } from '../content/docs/api';
import { docsState, showNav, showPage } from '../content/docs/state';
import { writingStyles, componentStyles } from '../content/docs/code-examples';
import { codeStyle, setComponentStyle, setWritingStyle } from '../preferences/code-style';
import { localePath, localeState, setPageTitle, t } from '../i18n';
import { BrandMark } from '../components/Brand';

/** A heading counts as "current" once its top passes this line (px from the viewport top). */
const activeSectionLine = 140;

function CodeStylePicker() {
    return (
        <section class="docs-code-pref" aria-label={() => t('docs.code.preference')}>
            <div class="docs-code-pref-title">{() => t('docs.code.preference')}</div>
            <div class="docs-code-pref-group">
                <span class="docs-code-pref-label">{() => t('home.preview.writingStyle')}</span>
                <div class="docs-code-pref-segments" role="group" aria-label={() => t('home.preview.writingStyle')}>
                    {writingStyles.map((style) => (
                        <button
                            key={style.value}
                            type="button"
                            class={() => codeStyle.writingStyle === style.value ? 'docs-code-pref-option is-selected' : 'docs-code-pref-option'}
                            aria-pressed={() => codeStyle.writingStyle === style.value}
                            onclick={() => setWritingStyle(style.value)}
                        >{style.label}</button>
                    ))}
                </div>
            </div>
            <div class="docs-code-pref-group">
                <span class="docs-code-pref-label">{() => t('home.preview.componentStyle')}</span>
                <div class="docs-code-pref-segments" role="group" aria-label={() => t('home.preview.componentStyle')}>
                    {componentStyles.map((style) => (
                        <button
                            key={style.value}
                            type="button"
                            class={() => codeStyle.componentStyle === style.value ? 'docs-code-pref-option is-selected' : 'docs-code-pref-option'}
                            aria-pressed={() => codeStyle.componentStyle === style.value}
                            onclick={() => setComponentStyle(style.value)}
                        >{style.label}</button>
                    ))}
                </div>
            </div>
            <p class="docs-code-pref-hint">{() => t('docs.code.preferenceHint')}</p>
        </section>
    );
}

/**
 * Layout route of the docs reader. The toolbar, sidebar, drawer and TOC are built once and stay
 * while the reader moves between pages; only the article in the RouterView is replaced.
 * Pages and the menu come from the docs API, in the language of the address.
 */
export default function DocsLayout() {
    const navigation = useNavigation();
    const sidebar = reactive({ mobileOpen: false });
    const toc = reactive({ activeId: '' });

    const currentSlug = (): string => navigation.params.slug ?? '';
    const shownPage = () => docsState.status === 'ready' ? docsState.page : null;

    // Only the group holding the current page starts open; the reader can still open others.
    const expanded = reactive<Record<string, boolean>>({});
    const expandCurrentGroup = () => {
        const currentId = docsState.page?.category.id;
        for (const category of docsState.nav) expanded[category.id] = category.id === currentId;
    };

    // Mobile: the sidebar is an off-canvas drawer opened from the hamburger button.
    let menuButton: HTMLElement | null = null;
    let closeButton: HTMLElement | null = null;

    const setDrawer = (open: boolean, restoreFocus = false) => {
        if (sidebar.mobileOpen === open) return;
        sidebar.mobileOpen = open;
        document.documentElement.classList.toggle('docs-drawer-open', open);
        if (open) requestAnimationFrame(() => closeButton?.focus());
        else if (restoreFocus) menuButton?.focus();
    };

    const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && sidebar.mobileOpen) setDrawer(false, true);
    };

    // Scroll spy: the TOC follows the heading being read. A TOC click pins its target until the
    // smooth scroll ends, so headings that cannot reach the top of the viewport still get selected.
    let root: HTMLElement | null = null;
    let frame = 0;
    let pinnedUntil = 0;

    const updateActiveSection = () => {
        frame = 0;
        if (!root || Date.now() < pinnedUntil) return;

        const headings = Array.from(root.querySelectorAll<HTMLElement>('.docs-prose h2[id], .docs-prose h3[id]'));
        if (headings.length === 0) return;

        const scroller = document.documentElement;
        const atBottom = window.innerHeight + window.scrollY >= scroller.scrollHeight - 2;
        let activeId = headings[0].id;

        if (atBottom) {
            activeId = headings[headings.length - 1].id;
        } else {
            for (const heading of headings) {
                if (heading.getBoundingClientRect().top > activeSectionLine) break;
                activeId = heading.id;
            }
        }

        toc.activeId = activeId;
    };

    const scheduleUpdate = () => {
        if (!frame) frame = requestAnimationFrame(updateActiveSection);
    };

    const releasePin = () => {
        pinnedUntil = 0;
    };

    const goToSection = (id: string) => {
        const target = document.getElementById(id);
        if (!target) return false;

        toc.activeId = id;
        pinnedUntil = Date.now() + 1500;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(history.state, '', `#${id}`);
        return false;
    };

    // Load what the address asks for, and follow page, language and arrival of new content.
    const followContent = (layout: Component) => {
        layout.bindings.watch(() => {
            showNav(localeState.current);
            showPage(currentSlug(), localeState.current);
        });
        layout.bindings.watch(() => {
            expandCurrentGroup();
            const page = shownPage();
            if (page) setPageTitle(page.title);
            scheduleUpdate();
        });
        // An old address: a moved page takes its new one, a removed page leads to the docs home.
        // Replacing the history entry keeps Back from returning to the old address.
        layout.bindings.watch(() => {
            const slug = currentSlug();
            if (docsState.requestedSlug !== slug) return; // still showing the previous page
            const target = docsState.status === 'moved' ? '/docs'
                : docsState.status === 'ready' && docsState.page && docsState.page.slug !== slug ? `/docs/${docsState.page.slug}`
                : null;
            if (target) queueMicrotask(() => navigation.navigate(localePath(target) + location.hash, { replace: true }));
        });
    };

    // The layout outlives page changes, so a new article must start at the top itself
    // (a #section in the address is handled by the router-change hook in main.tsx).
    let shownSlug = navigation.params.slug;

    const setUpReader = (layout: Component) => {
        root = layout.element as HTMLElement;
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scrollend', releasePin);
        window.addEventListener('keydown', closeOnEscape);
        layout.motif.setDisposable(() => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scrollend', releasePin);
            window.removeEventListener('keydown', closeOnEscape);
            document.documentElement.classList.remove('docs-drawer-open');
            cancelAnimationFrame(frame);
            setPageTitle();
            root = null;
        });
        layout.context.onRouterChanged(() => {
            if (navigation.params.slug !== shownSlug) {
                shownSlug = navigation.params.slug;
                if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
            }
            showPage(currentSlug(), localeState.current); // retries a page that failed to load
            setDrawer(false);
            pinnedUntil = 0;
            scheduleUpdate();
        });
        scheduleUpdate();
    };

    return (
        <main class="docs-detail-shell" onconfig={followContent} onmounted={setUpReader}>
            <div class="docs-detail-toolbar">
                <button
                    class="docs-menu-button"
                    type="button"
                    aria-label={() => t('docs.detail.browseTopics')}
                    aria-controls="docs-sidebar"
                    aria-expanded={() => sidebar.mobileOpen}
                    ref={(c) => menuButton = c.element as HTMLElement}
                    onclick={() => setDrawer(true)}
                >
                    <span class="docs-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
                </button>
                <a class="docs-toolbar-brand" href={() => localePath('/docs')} rel="router">
                    <BrandMark />
                    <span>{() => t('docs.detail.root')}</span>
                </a>
                <div class="docs-toolbar-path">
                    <span>{() => shownPage()?.category.title ?? ''}</span>
                    <b>/</b>
                    <span class="docs-toolbar-current">{() => shownPage()?.title ?? ''}</span>
                </div>
            </div>

            <div class={() => sidebar.mobileOpen ? 'docs-drawer-backdrop is-visible' : 'docs-drawer-backdrop'} aria-hidden="true" onclick={() => setDrawer(false, true)}></div>

            <div class="docs-three-column">
                <aside id="docs-sidebar" class={() => sidebar.mobileOpen ? 'docs-sidebar is-mobile-open' : 'docs-sidebar'} aria-label={() => t('docs.detail.navigation')}>
                    <div class="docs-drawer-header">
                        <a class="docs-toolbar-brand" href={() => localePath('/docs')} rel="router">
                            <BrandMark />
                            <span>{() => t('docs.detail.root')}</span>
                        </a>
                        <button
                            class="docs-drawer-close"
                            type="button"
                            aria-label={() => t('docs.detail.closeMenu')}
                            ref={(c) => closeButton = c.element as HTMLElement}
                            onclick={() => setDrawer(false, true)}
                        >
                            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
                        </button>
                    </div>
                    <CodeStylePicker />
                    <div class="docs-tree">
                        {docsState.nav.map((category) => (
                            <section class="docs-tree-group" key={category.id}>
                                <button
                                    class="docs-tree-heading"
                                    type="button"
                                    aria-expanded={() => expanded[category.id] === true}
                                    onclick={() => expanded[category.id] = !expanded[category.id]}
                                >
                                    <svg class="docs-tree-group-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5.2V3.6h4.1l1.25 1.5h5.65v7.3h-11V5.2Z" /></svg>
                                    <span>{category.title}</span>
                                    <svg class="docs-tree-chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
                                </button>
                                <div class={() => expanded[category.id] ? 'docs-tree-items is-expanded' : 'docs-tree-items'}>
                                    <div class="docs-tree-items-inner">
                                        {category.pages.map((doc) => (
                                            <a
                                                href={localePath(`/docs/${doc.slug}`)}
                                                rel="router"
                                                key={doc.slug}
                                                class={() => currentSlug() === doc.slug ? 'docs-tree-link is-active' : 'docs-tree-link'}
                                                aria-current={() => currentSlug() === doc.slug ? 'page' : null}
                                                onmouseenter={() => prefetchPage(doc.slug, localeState.current)}
                                                onclick={() => { setDrawer(false); }}
                                            >
                                                <span class="docs-tree-active-mark"></span>
                                                <span>{doc.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </aside>

                <div class="docs-main">
                    <RouterView />
                </div>

                <aside class="docs-toc" aria-label={() => t('docs.detail.onThisPage')}>
                    <h2>{() => t('docs.detail.onThisPage')}</h2>
                    <nav>
                        {() => (shownPage()?.headings ?? []).map((heading) => (
                            <a
                                href={`#${heading.id}`}
                                key={`toc-${heading.id}`}
                                class={() => (heading.level > 2 ? 'is-sub ' : '') + (toc.activeId === heading.id ? 'is-active' : '')}
                                aria-current={() => toc.activeId === heading.id ? 'location' : null}
                                onclick={() => goToSection(heading.id)}
                            >{heading.text}</a>
                        ))}
                    </nav>
                </aside>
            </div>
        </main>
    );
}
