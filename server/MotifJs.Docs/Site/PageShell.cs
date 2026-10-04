using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>
/// Fills the app shell (index.html from the Vite build) for one page. MotifJS renders in the browser only,
/// so for crawlers and link previews the shell gets the page's language, title, meta tags and, on docs pages,
/// the article as plain HTML. The browser hides that copy and the app renders as usual. Used per request by
/// <see cref="IndexPage"/> and for every page by the static export.
/// </summary>
public sealed partial class PageShell(DocsStore store, SiteLinks links, SiteConfig site)
{
    // Escape only what HTML needs, so Turkish text stays readable in the page source.
    public static readonly HtmlEncoder Html = HtmlEncoder.Create(UnicodeRanges.All);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All) // still escapes < > & so the JSON cannot close its script tag
    };

    [GeneratedRegex("<html[^>]*>")] private static partial Regex HtmlTag();
    [GeneratedRegex("<title>.*?</title>", RegexOptions.Singleline)] private static partial Regex TitleTag();
    [GeneratedRegex("<meta name=\"description\"[^>]*>")] private static partial Regex DescriptionTag();

    public string Render(string shell, string siteUrl, string locale, string route, DocPageResult? doc, bool notFound)
    {
        var html = HtmlTag().Replace(shell, $"<html lang=\"{locale}\">", 1);

        if (doc is not null)
        {
            html = TitleTag().Replace(html, $"<title>{Html.Encode(doc.Title)} — {Html.Encode(site.Name)}</title>", 1);
            html = DescriptionTag().Replace(html, $"<meta name=\"description\" content=\"{Html.Encode(doc.Description)}\">", 1);
        }

        string UrlFor(string forLocale) => siteUrl + links.Localize(route, forLocale);

        // A docs page lists only the languages that have it; x-default too, only when the default language does.
        var alternates = doc is null ? links.Locales : store.TranslationsOf(doc.Slug);
        var canonicalLocale = doc?.Locale ?? locale;

        var head = new StringBuilder();
        // Lets the stylesheet hide the crawler copy before the app paints.
        head.AppendLine("    <script>document.documentElement.classList.add('js')</script>");
        head.AppendLine("    <style>html.js #prerender{display:none}</style>");

        if (notFound)
        {
            head.AppendLine("    <meta name=\"robots\" content=\"noindex\">");
        }
        else
        {
            head.AppendLine($"    <link rel=\"canonical\" href=\"{Html.Encode(UrlFor(canonicalLocale))}\">");
            foreach (var alternate in alternates)
                head.AppendLine($"    <link rel=\"alternate\" hreflang=\"{alternate}\" href=\"{Html.Encode(UrlFor(alternate))}\">");
            if (alternates.Contains(links.DefaultLocale))
                head.AppendLine($"    <link rel=\"alternate\" hreflang=\"x-default\" href=\"{Html.Encode(UrlFor(links.DefaultLocale))}\">");
            head.AppendLine($"    <meta property=\"og:site_name\" content=\"{Html.Encode(site.Name)}\">");
            head.AppendLine($"    <meta property=\"og:url\" content=\"{Html.Encode(UrlFor(canonicalLocale))}\">");
            head.AppendLine($"    <meta property=\"og:type\" content=\"{(doc is null ? "website" : "article")}\">");
        }

        if (doc is not null)
        {
            head.AppendLine($"    <meta property=\"og:title\" content=\"{Html.Encode(doc.Title)}\">");
            head.AppendLine($"    <meta property=\"og:description\" content=\"{Html.Encode(doc.Description)}\">");
            // The app reads this instead of asking the API again for the page it was opened on.
            head.AppendLine($"    <script type=\"application/json\" id=\"doc-data\">{JsonSerializer.Serialize(doc, Json)}</script>");
        }

        html = html.Replace("</head>", head + "</head>");

        if (doc is not null)
        {
            var article = $"""
                <div id="prerender">
                    <article class="docs-article">
                        <p>{Html.Encode(doc.Category.Title)}</p>
                        <h1>{Html.Encode(doc.Title)}</h1>
                        <p>{Html.Encode(doc.Description)}</p>
                {links.LocalizeHtml(doc.Html, locale)}    </article>
                    </div>
                """;
            html = html.Replace("<div id=\"app\">", article.TrimStart() + "\n    <div id=\"app\">");
        }

        return html;
    }
}
