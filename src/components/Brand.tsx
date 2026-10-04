import site from 'virtual:site-config';

/**
 * The site's logo from site.config.json (logo.mark). The mark is inlined so a logo drawn without its
 * own fill takes its colour from the theme tokens; the wordmark is text in the brand typography.
 */
export function BrandMark() {
    return (
        <svg class="brand-mark" viewBox={site.logo.viewBox} aria-hidden="true" focusable="false"
            onbuilt={(c) => (c.element as SVGElement).innerHTML = site.logo.markup} />
    );
}

export function BrandWordmark() {
    return <span class="brand-name">{site.logo.wordmark}<span>{site.logo.wordmarkAccent ?? ''}</span></span>;
}
