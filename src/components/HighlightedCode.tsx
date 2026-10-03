import { read, type Bind } from '@motifx/core';
import { highlight } from './highlight';

/** A `<code>` element whose tokens are coloured; re-tokenised whenever `source` changes. */
export function HighlightedCode(props: { source: Bind<string> }) {
    return (
        <code class="code-highlight">
            {() => highlight(read(props.source)).map((token, index) => (
                <span key={index} class={`tok-${token.type}`}>{token.text}</span>
            ))}
        </code>
    );
}
