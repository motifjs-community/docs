import { Application } from '@motifx/core';
import { routes } from './routes';
import { applyLocaleFromPath, defaultLocale, localePath, preferredLocale } from './i18n';
import { scrollToSection } from './scroll-to-section';
import './styles/tokens.css';
import './style.css';

// The server adds a plain copy of docs articles for crawlers; the app renders its own.
document.getElementById('prerender')?.remove();

// Static hosts may answer "/docs" with "/docs/"; the routes have no trailing slash.
if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
    history.replaceState(history.state, '', location.pathname.replace(/\/+$/, '') + location.search + location.hash);
}

// The bare root opens in the language the visitor chose before (or their browser's).
if (location.pathname === '/' && preferredLocale() !== defaultLocale) {
    history.replaceState(history.state, '', localePath('/', preferredLocale()) + location.search + location.hash);
    applyLocaleFromPath(location.pathname);
}

const builder = Application.CreateBuilder();
const app = builder.build();

app.useRouter({ routes, mode: 'history', scrollMemory: true });

// The language lives in the address (/tr/...), so it follows every navigation.
app.onRouterChanged(() => applyLocaleFromPath(location.pathname));

// A `#section` in the address (e.g. "/#why-motifjs" opened from a docs page) is reached once the page has rendered.
app.onRouterChanged(() => scrollToSection(decodeURIComponent(location.hash.slice(1))));

app.run('#app');
