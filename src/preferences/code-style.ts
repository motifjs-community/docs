import { reactive } from '@motifx/core';
import { writingStyles, componentStyles, type WritingStyle, type ComponentStyle, type CodeVariants } from '../content/docs/code-examples';

const storageKey = 'motifjs-code-style';

function getInitialCodeStyle(): { writingStyle: WritingStyle; componentStyle: ComponentStyle } {
    let saved: { writingStyle?: string; componentStyle?: string } | null = null;

    try {
        saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    } catch {
        saved = null;
    }

    return {
        writingStyle: writingStyles.find(({ value }) => value === saved?.writingStyle)?.value ?? 'declarative',
        componentStyle: componentStyles.find(({ value }) => value === saved?.componentStyle)?.value ?? 'class'
    };
}

/** Site-wide code preference: every styled example on the site follows it. */
export const codeStyle = reactive(getInitialCodeStyle());

function saveCodeStyle(): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify({
            writingStyle: codeStyle.writingStyle,
            componentStyle: codeStyle.componentStyle
        }));
    } catch {
        // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
}

export function setWritingStyle(style: WritingStyle): void {
    codeStyle.writingStyle = style;
    saveCodeStyle();
}

export function setComponentStyle(style: ComponentStyle): void {
    codeStyle.componentStyle = style;
    saveCodeStyle();
}

export function resolveCode(source: string | CodeVariants): string {
    return typeof source === 'string' ? source : source[codeStyle.writingStyle][codeStyle.componentStyle];
}
