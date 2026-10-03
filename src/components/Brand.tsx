/**
 * MotifJS brand, drawn from the brand kit (motifjs-logo.svg). The mark is inline SVG so its colour
 * comes from tokens and follows the theme; the wordmark is text in the kit's typography.
 */
export function BrandMark() {
    return (
        <svg class="brand-mark" viewBox="0 0 236 236" aria-hidden="true" focusable="false">
            <path d="M118 0 170 52 142 80 118 56 94 80 66 52Z" />
            <path d="m236 118-52 52-28-28 24-24-24-24 28-28Z" />
            <path d="m118 236-52-52 28-28 24 24 24-24 28 28Z" />
            <path d="M0 118 52 66l28 28-24 24 24 24-28 28Z" />
        </svg>
    );
}

export function BrandWordmark() {
    return <span class="brand-name">motif<span>js</span></span>;
}
