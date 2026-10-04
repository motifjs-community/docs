using System.Text;
using System.Text.RegularExpressions;
using Markdig;
using Markdig.Extensions.AutoIdentifiers;
using Markdig.Extensions.Yaml;
using Markdig.Renderers;
using Markdig.Renderers.Html;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using YamlDotNet.Core;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace MotifJs.Docs.Docs;

public sealed class DocFrontMatter
{
    /// <summary>The page address (/docs/{slug}); translations share it. Defaults to the file name.</summary>
    public string? Slug { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public int Order { get; set; }
    /// <summary>Old addresses that should lead to this page from now on.</summary>
    public List<string> RedirectFrom { get; set; } = [];
}

public sealed record DocHeading(string Id, string Text, int Level);

/// <summary>A link to another docs file, already rewritten to its address; kept to check the anchor later.</summary>
public sealed record DocLinkRef(string Slug, string? Anchor, int Line, string Written);

public sealed record ParsedDoc(string File, DocFrontMatter Meta, MarkdownDocument Document);

public sealed record RenderedDoc(DocFrontMatter Meta, string Html, IReadOnlyList<DocHeading> Headings, IReadOnlyList<DocLinkRef> Links);

/// <summary>A content problem, reported with the file and line so it can be fixed at the source.</summary>
public sealed class DocContentException(string file, int line, string message)
    : Exception($"{file}:{line}: {message}")
{
    public string File { get; } = file;
    public int Line { get; } = line;
}

/// <summary>
/// Turns a docs markdown file into HTML in two steps: <see cref="Parse"/> reads it (front matter included),
/// <see cref="Render"/> writes HTML once every file's address is known. Links between markdown files
/// (<c>[x](./other.md#part)</c>) work in an editor as they are and become site links (<c>/docs/slug#part</c>).
/// Consecutive code fences with the same <c>file=</c> become one example group; their <c>variant=</c> values let
/// the site show the one that matches the reader's code style.
/// </summary>
public static class DocMarkdown
{
    private static readonly string[] WritingStyles = ["declarative", "imperative"];
    private static readonly string[] ComponentStyles = ["class", "function", "options"];

    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .UseYamlFrontMatter()
        .UseAutoIdentifiers(AutoIdentifierOptions.GitHub)
        .UsePipeTables()
        .UseEmphasisExtras()
        .UseAutoLinks()
        .UseGenericAttributes() // keep last: lets a heading pin its anchor, e.g. "## Routing {#routing}"
        .Build();

    private static readonly IDeserializer Yaml = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .Build();

    public static ParsedDoc Parse(string markdown, string file)
    {
        var document = Markdown.Parse(markdown, Pipeline);
        return new ParsedDoc(file, ReadFrontMatter(document, file), document);
    }

    /// <param name="resolveFile">Maps a linked markdown path, as written, to that page's slug; null when no such file exists.</param>
    public static RenderedDoc Render(ParsedDoc parsed, Func<string, string?> resolveFile)
    {
        var (file, meta, document) = parsed;
        var links = RewriteFileLinks(document, file, resolveFile);

        using var writer = new StringWriter();
        var renderer = new HtmlRenderer(writer);
        Pipeline.Setup(renderer);

        var headings = new List<DocHeading>();
        var blocks = document.ToList();

        for (var i = 0; i < blocks.Count; i++)
        {
            switch (blocks[i])
            {
                case YamlFrontMatterBlock:
                    continue;

                case HeadingBlock { Level: 1 } heading:
                    throw new DocContentException(file, heading.Line + 1, "the page title comes from front matter; start sections at ##");

                case HeadingBlock { Level: 2 or 3 } heading:
                    headings.Add(new DocHeading(heading.GetAttributes().Id ?? "", PlainText(heading.Inline), heading.Level));
                    renderer.Render(heading);
                    break;

                case FencedCodeBlock fence:
                    var group = new List<(FencedCodeBlock Block, CodeFence Fence)> { (fence, CodeFence.Parse(fence, file)) };
                    while (group[0].Fence.File is not null
                        && i + 1 < blocks.Count
                        && blocks[i + 1] is FencedCodeBlock next
                        && CodeFence.Parse(next, file) is { } nextFence
                        && nextFence.File == group[0].Fence.File)
                    {
                        group.Add((next, nextFence));
                        i++;
                    }
                    WriteCodeGroup(renderer, group, file);
                    break;

                default:
                    renderer.Render(blocks[i]);
                    break;
            }
        }

        writer.Flush();
        return new RenderedDoc(meta, writer.ToString(), headings, links);
    }

    /// <summary>Points links to other markdown files at their site address; anything else is left alone.</summary>
    private static List<DocLinkRef> RewriteFileLinks(MarkdownDocument document, string file, Func<string, string?> resolveFile)
    {
        var links = new List<DocLinkRef>();

        foreach (var link in document.Descendants<LinkInline>())
        {
            if (link.IsImage || link.Url is not { Length: > 0 } url) continue;
            if (url.StartsWith('#') || url.StartsWith('/') || Regex.IsMatch(url, "^[a-zA-Z][a-zA-Z0-9+.-]*:")) continue; // anchors, site paths, http:, mailto:

            var hash = url.IndexOf('#');
            var path = Uri.UnescapeDataString(hash < 0 ? url : url[..hash]);
            var anchor = hash < 0 ? null : url[(hash + 1)..];
            if (!path.EndsWith(".md", StringComparison.OrdinalIgnoreCase)) continue;

            var slug = resolveFile(path)
                ?? throw new DocContentException(file, link.Line + 1, $"link '{url}' points to a file that does not exist");

            link.Url = anchor is null ? $"/docs/{slug}" : $"/docs/{slug}#{anchor}";
            links.Add(new DocLinkRef(slug, string.IsNullOrEmpty(anchor) ? null : anchor, link.Line + 1, url));
        }

        return links;
    }

    private static DocFrontMatter ReadFrontMatter(MarkdownDocument document, string file)
    {
        if (document.FirstOrDefault() is not YamlFrontMatterBlock block)
            throw new DocContentException(file, 1, "missing front matter (title, description, category, order)");

        DocFrontMatter meta;
        try
        {
            meta = Yaml.Deserialize<DocFrontMatter>(block.Lines.ToString()) ?? new DocFrontMatter();
        }
        catch (YamlException error)
        {
            // The block starts at the opening "---", so its first YAML line is one below it.
            throw new DocContentException(file, block.Line + 2 + (int)error.Start.Line - 1, $"front matter: {DescribeYamlError(error)}");
        }

        if (string.IsNullOrWhiteSpace(meta.Title)) throw new DocContentException(file, 1, "front matter needs a title");
        if (string.IsNullOrWhiteSpace(meta.Category)) throw new DocContentException(file, 1, "front matter needs a category");
        return meta;
    }

    private static string DescribeYamlError(YamlException error)
    {
        var message = error.InnerException?.Message ?? error.Message;

        if (Regex.Match(message, "Property '(.+?)' not found") is { Success: true } unknown)
            return $"unknown field '{unknown.Groups[1].Value}' (use slug, title, description, category, order, redirectFrom)";
        if (message.Contains("deserialize the node", StringComparison.Ordinal) || error.InnerException is FormatException)
            return "a value has the wrong type (title, description and category are text, order is a number)";

        // YamlDotNet prefixes positions we already report; keep the readable part.
        return Regex.Replace(message, @"^\(Line: .*?\): ", "");
    }

    private static void WriteCodeGroup(HtmlRenderer renderer, List<(FencedCodeBlock Block, CodeFence Fence)> group, string file)
    {
        var first = group[0];
        var variants = group.Where(g => g.Fence.Variant is not null).ToList();

        if (variants.Count > 0)
        {
            if (variants.Count != group.Count)
                throw new DocContentException(file, first.Block.Line + 1, $"every block of {first.Fence.File} needs a variant once one of them has it");

            var duplicate = variants.SelectMany(g => g.Fence.Variants.Select(v => (Variant: v, g.Block))).GroupBy(g => g.Variant).FirstOrDefault(g => g.Count() > 1);
            if (duplicate is not null)
                throw new DocContentException(file, duplicate.Last().Block.Line + 1, $"variant {duplicate.Key} appears twice for {first.Fence.File}");

            var missing = (from w in WritingStyles from c in ComponentStyles
                           where !variants.Any(v => v.Fence.Matches(w, c))
                           select $"{w}/{c}").ToList();
            if (missing.Count > 0)
                throw new DocContentException(file, first.Block.Line + 1, $"{first.Fence.File} has no example for {string.Join(", ", missing)}");
        }

        renderer.EnsureLine();
        renderer.Write("<div class=\"doc-code\"");
        if (first.Fence.File is not null) renderer.Write(" data-file=\"").WriteEscape(first.Fence.File).Write("\"");
        renderer.WriteLine(">");

        foreach (var (block, fence) in group)
        {
            renderer.Write("<pre");
            if (fence.Language is not null) renderer.Write(" data-lang=\"").WriteEscape(fence.Language).Write("\"");
            if (fence.Variant is not null) renderer.Write(" data-variant=\"").WriteEscape(fence.Variant).Write("\"");
            renderer.Write("><code>").WriteEscape(block.Lines.ToString()).WriteLine("</code></pre>");
        }

        renderer.WriteLine("</div>");
    }

    private static string PlainText(ContainerInline? inline)
    {
        if (inline is null) return "";
        var text = new StringBuilder();
        foreach (var node in inline.Descendants())
        {
            if (node is LiteralInline literal) text.Append(literal.Content);
            else if (node is CodeInline code) text.Append(code.Content);
        }
        return text.ToString().Trim();
    }

    /// <summary>The info string of a fence: <c>tsx file=counter.tsx variant=declarative/class</c>.</summary>
    private sealed record CodeFence(string? Language, string? File, string? Variant)
    {
        public static CodeFence Parse(FencedCodeBlock block, string file)
        {
            string? name = null, variant = null;

            foreach (var part in (block.Arguments ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var pair = part.Split('=', 2);
                switch (pair[0])
                {
                    case "file" when pair.Length == 2: name = pair[1]; break;
                    case "variant" when pair.Length == 2: variant = pair[1]; break;
                    default: throw new DocContentException(file, block.Line + 1, $"unknown code fence option '{part}' (use file= and variant=)");
                }
            }

            if (variant?.Split(',').FirstOrDefault(v => !IsVariant(v)) is { } wrong)
                throw new DocContentException(file, block.Line + 1, $"variant '{wrong}' is not one of declarative|imperative, class|function|options or writing/component");
            if (variant is not null && name is null)
                throw new DocContentException(file, block.Line + 1, "a block with a variant needs file= so its siblings can be grouped");

            return new CodeFence(string.IsNullOrEmpty(block.Info) ? null : block.Info, name, variant);
        }

        /// <summary>One block can stand for several styles: <c>variant=function,options</c>.</summary>
        public string[] Variants => Variant?.Split(',') ?? [];

        public bool Matches(string writing, string component) =>
            Variants.Any(v => v == $"{writing}/{component}" || v == writing || v == component);

        private static bool IsVariant(string value) => value.Split('/') switch
        {
            [var one] => WritingStyles.Contains(one) || ComponentStyles.Contains(one),
            [var writing, var component] => WritingStyles.Contains(writing) && ComponentStyles.Contains(component),
            _ => false
        };
    }
}
