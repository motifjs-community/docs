import { reactive } from '@motifx/core';
import site from 'virtual:site-config';
import type { CodeVariants, ComponentStyle, WritingStyle } from '../content/docs/code-examples';

/** The code choices of site.config.json ("codeOptions"); empty when the site has none. */
export const codeOptions = site.codeOptions;

const storageKey = 'motifjs-code-style';

/** The saved choice of each option, or its first choice. */
function initialChoices(): Record<string, string> {
    let saved: Record<string, string> | null = null;
    try {
        saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    } catch {
        saved = null;
    }

    return Object.fromEntries(codeOptions.map((option) => [
        option.id,
        option.choices.find(({ id }) => id === saved?.[option.id])?.id ?? option.choices[0].id
    ]));
}

/** Site-wide code preference, option id → choice id: every example on the site follows it. */
export const codeChoices: Record<string, string> = reactive(initialChoices());

export function setCodeChoice(optionId: string, choiceId: string): void {
    codeChoices[optionId] = choiceId;
    try {
        localStorage.setItem(storageKey, JSON.stringify(codeChoices));
    } catch {
        // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
}

/** The home page example, written for MotifJS's own writing and component styles. */
export function resolveCode(source: string | CodeVariants): string {
    if (typeof source === 'string') return source;
    const writing = (codeChoices.writing ?? 'declarative') as WritingStyle;
    const component = (codeChoices.component ?? 'class') as ComponentStyle;
    return source[writing]?.[component] ?? source.declarative.class;
}
