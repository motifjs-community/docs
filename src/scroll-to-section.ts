/**
 * Scrolls to a `#section` once it exists. Route pages render after their chunk loads, so the browser
 * cannot find the section from the address on its own; this looks for it over the next frames.
 */
export function scrollToSection(id: string, behavior: ScrollBehavior = 'instant'): void {
    if (!id) return;
    let attempts = 0;
    const look = () => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior, block: 'start' });
        else if (++attempts < 60) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
}
