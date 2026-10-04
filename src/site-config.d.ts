/** site.config.json, checked and prepared at build time by vite.site.mjs. */
declare module 'virtual:site-config' {
    const site: {
        name: string;
        url: string;
        logo: {
            mark: string;
            /** The logo file's viewBox and inner markup, inlined so the mark can follow the theme. */
            viewBox: string;
            markup: string;
            wordmark: string;
            wordmarkAccent?: string;
        };
        defaultLocale: string;
        locales: { code: string; label: string }[];
        links: { repository: string; issues: string };
        /** Choices readers make about code examples; empty when the site has none. The first choice is the default. */
        codeOptions: {
            id: string;
            label: string | Record<string, string>;
            choices: { id: string; label: string | Record<string, string> }[];
        }[];
    };
    export default site;
}
