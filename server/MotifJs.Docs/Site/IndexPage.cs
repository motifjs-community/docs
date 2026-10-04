using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>
/// Serves the app shell (index.html from the Vite build) for every page route. MotifJS renders in the
/// browser only, so for crawlers and link previews the shell gets the page's language, title, meta tags and,
/// on docs pages, the article as plain HTML. The browser hides that copy and the app renders as usual.
/// </summary>
public sealed partial class IndexPage(IWebHostEnvironment environment, DocsStore store, SiteLinks links, SiteConfig site)
{
    // Escape only what HTML needs, so Turkish text stays readable in the page source.
    private static readonly HtmlEncoder Html = HtmlEncoder.Create(UnicodeRanges.All);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All) // still escapes < > & so the JSON cannot close its script tag
    };

    private string? template;
    private DateTimeOffset templateTime;

    [GeneratedRegex("<html[^>]*>")] private static partial Regex HtmlTag();
    [GeneratedRegex("<title>.*?</title>", RegexOptions.Singleline)] private static partial Regex TitleTag();
    [GeneratedRegex("<meta name=\"description\"[^>]*>")] private static partial Regex DescriptionTag();
    [GeneratedRegex("^/docs/(?<slug>[a-z0-9-]+)/?$")] private static partial Regex DocsPath();

    public async Task Handle(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "/";
        if (path.StartsWith("/api/", StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var shell = ReadTemplate();
        if (shell is null)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsync("The site has not been built yet. Run `npm run build`.");
            return;
        }

        var (locale, route) = links.Split(path);
        DocPageResult? doc = null;
        var notFound = false;

        if (DocsPath().Match(route) is { Success: true } match)
        {
            var slug = match.Groups["slug"].Value;
            doc = store.GetPage(slug, locale);

            // An address that lost its page answers with a permanent redirect, so old links and
            // search results keep working and crawlers update to the new address.
            if (doc is null && store.FindRedirect(slug, locale) is (true, var to))
            {
                context.Response.Redirect(links.Localize(to is null ? "/docs" : $"/docs/{to}", locale) + context.Request.QueryString, permanent: true);
                return;
            }
            notFound = doc is null;
        }

        context.Response.StatusCode = notFound ? StatusCodes.Status404NotFound : StatusCodes.Status200OK;
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache";
        await context.Response.WriteAsync(Render(shell, context, locale, route, doc, notFound));
    }

    private string Render(string shell, HttpContext context, string locale, string route, DocPageResult? doc, bool notFound)
    {
        var html = HtmlTag().Replace(shell, $"<html lang=\"{locale}\">", 1);

        if (doc is not null)
        {
            html = TitleTag().Replace(html, $"<title>{Html.Encode(doc.Title)} — {Html.Encode(site.Name)}</title>", 1);
            html = DescriptionTag().Replace(html, $"<meta name=\"description\" content=\"{Html.Encode(doc.Description)}\">", 1);
        }

        var siteUrl = links.BaseUrl(context);
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

    /// <summary>index.html from the build; re-read when a new build replaces it.</summary>
    private string? ReadTemplate()
    {
        var file = environment.WebRootFileProvider.GetFileInfo("index.html");
        if (!file.Exists) return null;
        if (template is null || file.LastModified != templateTime)
        {
            using var reader = new StreamReader(file.CreateReadStream());
            template = reader.ReadToEnd();
            templateTime = file.LastModified;
        }
        return template;
    }
}
