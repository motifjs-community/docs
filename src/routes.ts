import type { RouteItem } from '@motifx/core';
import DocsArticlePage from './pages/DocsArticlePage';

export const routes: RouteItem[] = [
    {
        path: '/',
        // Turkish pages live under /tr. Same routes, so switching language keeps every component.
        alias: '/tr',
        control: () => import('./layout/mainlayout'),
        childs: [
            {
                path: '/',
                control: () => import('./pages/HomePage')
            },
            {
                path: '/about',
                control: () => import("./pages/AboutPage")
            },
            {
                path: '/docs',
                control: () => import('./pages/DocsHomePage')
            },
            {
                // Docs reader: the layout (toolbar, sidebar, TOC) stays mounted; only the article changes.
                path: '/docs',
                control: () => import('./layout/DocsLayout'),
                childs: [
                    {
                        // Loaded with the app: a lazy import leaves the article column empty for a
                        // couple of frames on every page change, which makes the footer jump.
                        path: '/{slug}',
                        control: DocsArticlePage
                    }
                ]
            }
        ]
    }
];
