export type CodeTokenType =
    | 'plain'
    | 'keyword'
    | 'literal'
    | 'string'
    | 'number'
    | 'comment'
    | 'function'
    | 'type'
    | 'property'
    | 'tag'
    | 'attribute'
    | 'punctuation'
    | 'text';

export interface CodeToken {
    type: CodeTokenType;
    text: string;
}

type Context =
    | { kind: 'js'; braces: number }
    | { kind: 'tag'; closing: boolean; named: boolean }
    | { kind: 'text' };

const keywords = new Set([
    'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return', 'class', 'extends',
    'new', 'if', 'else', 'for', 'of', 'in', 'while', 'do', 'switch', 'case', 'break', 'continue', 'async',
    'await', 'typeof', 'instanceof', 'type', 'interface', 'as', 'implements', 'private', 'public',
    'protected', 'readonly', 'static', 'get', 'set', 'try', 'catch', 'finally', 'throw', 'void', 'delete', 'yield'
]);
const literals = new Set(['true', 'false', 'null', 'undefined', 'this', 'super']);

const whitespace = /\s+/y;
const lineComment = /\/\/[^\n]*/y;
const blockComment = /\/\*[\s\S]*?(?:\*\/|$)/y;
const stringLiteral = /'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\[\s\S]|[^`\\])*`?/y;
const numberLiteral = /\d[\d_]*(?:\.\d+)?/y;
const identifier = /[A-Za-z_$][\w$]*/y;
const tagName = /[A-Za-z_$][\w$.:-]*/y;
const attributeName = /[A-Za-z_$][\w$:-]*/y;
const jsxText = /[^<{]+/y;

/** Characters after which `<` starts JSX instead of a comparison or a type argument. */
const jsxLeaders = new Set(['(', ',', '=', '{', '[', ':', '?', '&', '|', ';', '>', '!']);

/**
 * A small TS/TSX tokenizer for the documentation snippets. It recognises JSX tags, attributes and
 * text, so `<button onclick={…}>` and `Component<HTMLDivElement>` are coloured differently.
 */
export function highlight(source: string): CodeToken[] {
    const tokens: CodeToken[] = [];
    const stack: Context[] = [{ kind: 'js', braces: 0 }];
    // Updated inside push(); the cast stops TS from narrowing it to `null` for the whole function.
    let lastSignificant = null as CodeToken | null;
    let index = 0;

    const read = (pattern: RegExp) => {
        pattern.lastIndex = index;
        const match = pattern.exec(source);
        return match && match[0].length > 0 ? match[0] : null;
    };

    const push = (type: CodeTokenType, text: string) => {
        index += text.length;
        const last = tokens[tokens.length - 1];
        if (last && last.type === type && (type === 'plain' || type === 'punctuation' || type === 'text')) {
            last.text += text;
        } else {
            tokens.push({ type, text });
        }
        if (type !== 'plain' && type !== 'comment') lastSignificant = tokens[tokens.length - 1];
    };

    const nextNonSpace = (from: number) => {
        let position = from;
        while (position < source.length && /\s/.test(source[position])) position++;
        return source[position];
    };

    const startsJsx = () => {
        const next = source[index + 1];
        if (!next || !/[A-Za-z>]/.test(next)) return false;
        const previous: CodeToken | null = lastSignificant;
        if (!previous) return true;
        if (previous.type === 'keyword') return previous.text === 'return' || previous.text === 'default';
        return previous.type === 'punctuation' && jsxLeaders.has(previous.text[previous.text.length - 1]);
    };

    while (index < source.length) {
        const context = stack[stack.length - 1];
        const char = source[index];

        if (context.kind === 'text') {
            if (char === '<' && source[index + 1] === '/') {
                stack.pop();
                push('punctuation', '</');
                stack.push({ kind: 'tag', closing: true, named: false });
            } else if (char === '<') {
                push('punctuation', '<');
                stack.push({ kind: 'tag', closing: false, named: false });
            } else if (char === '{') {
                push('punctuation', '{');
                stack.push({ kind: 'js', braces: 0 });
            } else {
                push('text', read(jsxText) ?? char);
            }
            continue;
        }

        if (context.kind === 'tag') {
            const space = read(whitespace);
            if (space) { push('plain', space); continue; }

            if (source.startsWith('/>', index)) {
                push('punctuation', '/>');
                stack.pop();
            } else if (char === '>') {
                push('punctuation', '>');
                stack.pop();
                if (!context.closing) stack.push({ kind: 'text' });
            } else if (char === '{') {
                push('punctuation', '{');
                stack.push({ kind: 'js', braces: 0 });
            } else if (!context.named && read(tagName)) {
                const name = read(tagName)!;
                context.named = true;
                push(/^[A-Z]/.test(name) ? 'type' : 'tag', name);
            } else if (context.named && read(attributeName)) {
                push('attribute', read(attributeName)!);
            } else if (char === '"' || char === '\'') {
                push('string', read(stringLiteral) ?? char);
            } else {
                push('punctuation', char);
            }
            continue;
        }

        const space = read(whitespace);
        if (space) { push('plain', space); continue; }

        const comment = read(lineComment) ?? read(blockComment);
        if (comment) { push('comment', comment); continue; }

        if (char === '\'' || char === '"' || char === '`') {
            push('string', read(stringLiteral) ?? char);
            continue;
        }

        const number = /\d/.test(char) ? read(numberLiteral) : null;
        if (number) { push('number', number); continue; }

        const word = read(identifier);
        if (word) {
            const previous: CodeToken | null = lastSignificant;
            const afterDot = previous?.type === 'punctuation' && previous.text.endsWith('.');
            const next = nextNonSpace(index + word.length);
            let type: CodeTokenType = 'plain';

            if (afterDot) type = next === '(' ? 'function' : 'property';
            else if (keywords.has(word)) type = 'keyword';
            else if (literals.has(word)) type = 'literal';
            else if (/^[A-Z]/.test(word)) type = 'type';
            else if (next === '(') type = 'function';
            else if (next === ':') type = 'property';

            push(type, word);
            continue;
        }

        if (char === '<' && startsJsx()) {
            push('punctuation', '<');
            stack.push({ kind: 'tag', closing: false, named: false });
            continue;
        }

        if (char === '{') {
            context.braces++;
        } else if (char === '}') {
            if (context.braces === 0 && stack.length > 1) {
                push('punctuation', '}');
                stack.pop();
                continue;
            }
            context.braces--;
        }

        push('punctuation', char);
    }

    return tokens;
}
