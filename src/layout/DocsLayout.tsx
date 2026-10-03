import { reactive, RouterView, useNavigation, type Component } from '@motifx/core';
import { docsCategories, findCategory, findDoc, type DocsLocale } from '../content/docs/catalog';
import { writingStyles, componentStyles } from '../content/docs/code-examples';
import { codeStyle, setComponentStyle, setWritingStyle } from '../preferences/code-style';
import { localeState, t } from '../i18n';
import { BrandMark } from '../components/Brand';

/** A section counts as "current" once its top passes this line (px from the viewport top). */
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
 */
export default function DocsLayout() {
    const navigation = useNavigation();
    const sidebar = reactive({ mobileOpen: false });
    const toc = reactive({ activeId: '' });

    const currentDoc = () => findDoc(navigation.params.slug);
    const currentCategory = () => findCategory(navigation.params.slug);

    // Only the group holding the current page starts open; the reader can still open others.
    const expanded = reactive<Record<string, boolean>>({});
    const expandCurrentGroup = () => {
        const currentId = currentCategory().id;
        for (const category of docsCategories) expanded[category.id] = category.id === currentId;
    };
    expandCurrentGroup();

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

    // Scroll spy: the TOC follows the section being read. A TOC click pins its target until the
    // smooth scroll ends, so sections that cannot reach the top of the viewport still get selected.
    let root: HTMLElement | null = null;
    let frame = 0;
    let pinnedUntil = 0;

    const updateActiveSection = () => {
        frame = 0;
        if (!root || Date.now() < pinnedUntil) return;

        const sections = Array.from(root.querySelectorAll<HTMLElement>('.docs-content-section'));
        if (sections.length === 0) return;

        const scroller = document.documentElement;
        const atBottom = window.innerHeight + window.scrollY >= scroller.scrollHeight - 2;
        let activeId = sections[0].id;

        if (atBottom) {
            activeId = sections[sections.length - 1].id;
        } else {
            for (const section of sections) {
                if (section.getBoundingClientRect().top > activeSectionLine) break;
                activeId = section.id;
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
            root = null;
        });
        layout.context.onRouterChanged(() => {
            if (navigation.params.slug !== shownSlug) {
                shownSlug = navigation.params.slug;
                if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
            }
            setDrawer(false);
            expandCurrentGroup();
            pinnedUntil = 0;
            scheduleUpdate();
        });
        scheduleUpdate();
    };

    return (
        <main class="docs-detail-shell" onmounted={setUpReader}>
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
                <a class="docs-toolbar-brand" href="/docs" rel="router">
                    <BrandMark />
                    <span>{() => t('docs.detail.root')}</span>
                </a>
                <div class="docs-toolbar-path">
                    <span>{() => currentCategory().title[localeState.current as DocsLocale]}</span>
                    <b>/</b>
                    <span class="docs-toolbar-current">{() => currentDoc().title[localeState.current as DocsLocale]}</span>
                </div>
            </div>

            <div class={() => sidebar.mobileOpen ? 'docs-drawer-backdrop is-visible' : 'docs-drawer-backdrop'} aria-hidden="true" onclick={() => setDrawer(false, true)}></div>

            <div class="docs-three-column">
                <aside id="docs-sidebar" class={() => sidebar.mobileOpen ? 'docs-sidebar is-mobile-open' : 'docs-sidebar'} aria-label={() => t('docs.detail.navigation')}>
                    <div class="docs-drawer-header">
                        <a class="docs-toolbar-brand" href="/docs" rel="router">
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
                        {docsCategories.map((category) => (
                            <section class="docs-tree-group" key={category.id}>
                                <button
                                    class="docs-tree-heading"
                                    type="button"
                                    aria-expanded={() => expanded[category.id]}
                                    onclick={() => expanded[category.id] = !expanded[category.id]}
                                >
                                    <svg class="docs-tree-group-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5.2V3.6h4.1l1.25 1.5h5.65v7.3h-11V5.2Z" /></svg>
                                    <span>{() => category.title[localeState.current as DocsLocale]}</span>
                                    <svg class="docs-tree-chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
                                </button>
                                <div class={() => expanded[category.id] ? 'docs-tree-items is-expanded' : 'docs-tree-items'}>
                                    <div class="docs-tree-items-inner">
                                        {category.pages.map((doc) => (
                                            <a
                                                href={`/docs/${doc.slug}`}
                                                rel="router"
                                                key={doc.slug}
                                                class={() => navigation.params.slug === doc.slug ? 'docs-tree-link is-active' : 'docs-tree-link'}
                                                aria-current={() => navigation.params.slug === doc.slug ? 'page' : null}
                                                onclick={() => { setDrawer(false); }}
                                            >
                                                <span class="docs-tree-active-mark"></span>
                                                <span>{() => doc.title[localeState.current as DocsLocale]}</span>
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
                        {() => currentDoc().sections.map((section) => (
                            <a
                                href={`#${section.id}`}
                                key={`toc-${section.id}`}
                                class={() => toc.activeId === section.id ? 'is-active' : ''}
                                aria-current={() => toc.activeId === section.id ? 'location' : null}
                                onclick={() => goToSection(section.id)}
                            >{section.title[localeState.current as DocsLocale]}</a>
                        ))}
                    </nav>
                </aside>
            </div>
        </main>
    );
}
