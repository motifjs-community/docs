using System.Net;
using System.Text.RegularExpressions;

namespace MotifJs.Docs.Docs;

/// <summary>One section of a page as plain text; <c>Id</c> and <c>Heading</c> are empty for the text before the first heading.</summary>
public sealed record SearchEntry(string Slug, string Title, string Id, string Heading, int Level, string Text);

/// <summary>
/// The search index of one language: every page split at its headings, code examples left out. The app
/// loads it when the reader opens the search and searches in the browser, so the same file serves the
/// server and the static export. Built once per sync.
/// </summary>
public sealed partial class DocsSearchIndex(DocsStore store)
{
    [GeneratedRegex("<pre[\\s\\S]*?</pre>")] private static partial Regex CodeBlock();
    [GeneratedRegex("<h([23])\\b[^>]*\\bid=\"([^\"]*)\"[^>]*>([\\s\\S]*?)</h\\1>")] private static partial Regex Heading();
    [GeneratedRegex("<[^>]+>")] private static partial Regex Tag();
    [GeneratedRegex("\\s+")] private static partial Regex Spaces();

    private readonly object gate = new();
    private readonly Dictionary<string, IReadOnlyList<SearchEntry>> built = [];
    private string? version;

    public IReadOnlyList<SearchEntry> Get(string locale)
    {
        var current = store.GetVersion();
        lock (gate)
        {
            if (version != current)
            {
                built.Clear();
                version = current;
            }
            if (!built.TryGetValue(locale, out var entries))
                built[locale] = entries = Build(locale);
            return entries;
        }
    }

    private List<SearchEntry> Build(string locale)
    {
        var entries = new List<SearchEntry>();

        foreach (var page in store.GetNav(locale).SelectMany(category => category.Pages))
        {
            if (store.GetPage(page.Slug, locale) is not { } doc) continue;

            var html = CodeBlock().Replace(doc.Html, " ");
            var headings = Heading().Matches(html);

            var intro = PlainText(html[..(headings.Count > 0 ? headings[0].Index : html.Length)]);
            entries.Add(new SearchEntry(doc.Slug, doc.Title, "", "", 1, intro.Length > 0 ? intro : doc.Description));

            for (var i = 0; i < headings.Count; i++)
            {
                var heading = headings[i];
                var start = heading.Index + heading.Length;
                var end = i + 1 < headings.Count ? headings[i + 1].Index : html.Length;
                entries.Add(new SearchEntry(doc.Slug, doc.Title, heading.Groups[2].Value, PlainText(heading.Groups[3].Value),
                    int.Parse(heading.Groups[1].Value), PlainText(html[start..end])));
            }
        }

        return entries;
    }

    private static string PlainText(string html) =>
        Spaces().Replace(WebUtility.HtmlDecode(Tag().Replace(html, " ")), " ").Trim();
}
