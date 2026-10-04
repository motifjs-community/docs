import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configFile = resolve('site.config.json');
const virtualId = 'virtual:site-config';

/**
 * Reads site.config.json for the app: `import site from 'virtual:site-config'`. The logo file is inlined so
 * it can take its colour from the theme, and index.html gets the default language's title and description.
 * Any mistake in the config stops the build with a message saying what to fix.
 */
export default function siteConfig() {
    let site;

    const load = () => {
        const config = JSON.parse(readFileSync(configFile, 'utf8'));
        const fail = (message) => { throw new Error(`site.config.json: ${message}`); };

        if (!config.name) fail('"name" is missing');
        if (!Array.isArray(config.locales) || config.locales.length === 0) fail('"locales" needs at least one { "code", "label" }');
        if (!config.locales.some((l) => l.code === config.defaultLocale)) fail(`"defaultLocale" (${config.defaultLocale}) is not one of "locales"`);
        for (const { code } of config.locales) {
            if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(code ?? '')) fail(`"${code}" is not a language code like "en" or "pt-br"`);
            if (!existsSync(resolve(`src/content/locales/${code}.json`))) fail(`"${code}" has no src/content/locales/${code}.json`);
        }

        const logoFile = resolve(config.logo?.mark ?? '');
        if (!config.logo?.mark || !existsSync(logoFile)) fail(`logo.mark "${config.logo?.mark}" not found`);
        const svg = readFileSync(logoFile, 'utf8');
        const viewBox = /<svg[^>]*\sviewBox="([^"]+)"/.exec(svg)?.[1] ?? fail(`${config.logo.mark} needs a viewBox`);
        const markup = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1].trim() ?? '';

        site = { ...config, logo: { ...config.logo, viewBox, markup } };
        return site;
    };

    const messages = (code) => JSON.parse(readFileSync(resolve(`src/content/locales/${code}.json`), 'utf8'));
    const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    return {
        name: 'site-config',
        buildStart() {
            load();
            this.addWatchFile(configFile);
            this.addWatchFile(resolve(site.logo.mark));
        },
        resolveId(id) {
            return id === virtualId ? '\0' + virtualId : null;
        },
        load(id) {
            if (id !== '\0' + virtualId) return null;
            this.addWatchFile(configFile);
            this.addWatchFile(resolve(site.logo.mark));
            return `export default ${JSON.stringify(load())};`;
        },
        transformIndexHtml(html) {
            const { defaultLocale } = site ?? load();
            const meta = messages(defaultLocale);
            return html
                .replace(/<html lang="[^"]*">/, `<html lang="${defaultLocale}">`)
                .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(meta['meta.title'] ?? site.name)}</title>`)
                .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(meta['meta.description'] ?? '')}">`);
        },
        handleHotUpdate({ file, server }) {
            if (resolve(file) === configFile || (site && resolve(file) === resolve(site.logo.mark))) {
                const module = server.moduleGraph.getModuleById('\0' + virtualId);
                if (module) server.moduleGraph.invalidateModule(module);
                server.ws.send({ type: 'full-reload' });
                return [];
            }
        }
    };
}
