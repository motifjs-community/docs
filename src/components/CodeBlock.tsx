import { reactive, read, type Bind } from '@motifx/core';
import { t } from '../i18n';
import { HighlightedCode } from './HighlightedCode';

const copyIconPath = 'M5.75 5.5V3.75c0-.55.45-1 1-1h5.5c.55 0 1 .45 1 1v5.5c0 .55-.45 1-1 1H10.5M3.75 5.75h5.5c.55 0 1 .45 1 1v5.5c0 .55-.45 1-1 1h-5.5c-.55 0-1-.45-1-1v-5.5c0-.55.45-1 1-1Z';
const checkIconPath = 'm3.5 8.5 3 3 6-7';

async function writeClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // navigator.clipboard is missing on insecure origins; fall back to a temporary selection.
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        return copied;
    }
}

/** A documentation snippet: file name, copy action and highlighted source. */
export function CodeBlock(props: { file: string; source: Bind<string> }) {
    const state = reactive({ copied: false });
    let resetTimer = 0;

    const copy = async () => {
        if (!await writeClipboard(read(props.source))) return;
        state.copied = true;
        clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => state.copied = false, 1600);
    };

    return (
        <div class="docs-code" ondisposing={() => clearTimeout(resetTimer)}>
            <div class="docs-code-header">
                <span class="docs-code-file">{props.file}</span>
                <button
                    type="button"
                    class={() => state.copied ? 'docs-code-copy is-copied' : 'docs-code-copy'}
                    aria-label={() => t('docs.code.copyLabel')}
                    onclick={copy}
                >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d={() => state.copied ? checkIconPath : copyIconPath} /></svg>
                    <span aria-live="polite">{() => state.copied ? t('docs.code.copied') : t('docs.code.copy')}</span>
                </button>
            </div>
            <pre><HighlightedCode source={props.source} /></pre>
        </div>
    );
}
