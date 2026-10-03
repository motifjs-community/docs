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
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public int Order { get; set; }
}

public sealed record DocHeading(string Id, string Text, int Level);

public sealed record RenderedDoc(DocFrontMatter Meta, string Html, IReadOnlyList<DocHeading> Headings);

/// <summary>A content problem, reported with the file and line so it can be fixed at the source.</summary>
public sealed class DocContentException(string file, int line, string message)
    : Exception($"{file}:{line}: {message}")
{
    public string File { get; } = file;
    public int Line { get; } = line;
}

/// <summary>
/// Turns a docs markdown file into HTML. Consecutive code fences with the same <c>file=</c> become one
/// example group; their <c>variant=</c> values let the site show the one that matches the reader's code style.
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

    public static RenderedDoc Render(string markdown, string file)
    {
        var document = Markdown.Parse(markdown, Pipeline);
        var meta = ReadFrontMatter(document, file);

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
        return new RenderedDoc(meta, writer.ToString(), headings);
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
            return $"unknown field '{unknown.Groups[1].Value}' (use title, description, category, order)";
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

            var duplicate = variants.GroupBy(g => g.Fence.Variant).FirstOrDefault(g => g.Count() > 1);
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

            if (variant is not null && !IsVariant(variant))
                throw new DocContentException(file, block.Line + 1, $"variant '{variant}' is not one of declarative|imperative, class|function|options or writing/component");
            if (variant is not null && name is null)
                throw new DocContentException(file, block.Line + 1, "a block with a variant needs file= so its siblings can be grouped");

            return new CodeFence(string.IsNullOrEmpty(block.Info) ? null : block.Info, name, variant);
        }

        public bool Matches(string writing, string component) =>
            Variant == $"{writing}/{component}" || Variant == writing || Variant == component;

        private static bool IsVariant(string value) => value.Split('/') switch
        {
            [var one] => WritingStyles.Contains(one) || ComponentStyles.Contains(one),
            [var writing, var component] => WritingStyles.Contains(writing) && ComponentStyles.Contains(component),
            _ => false
        };
    }
}
