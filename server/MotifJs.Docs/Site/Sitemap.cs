using System.Text;
using System.Xml.Linq;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>sitemap.xml and robots.txt, so crawlers find every page in every language without running the app.</summary>
public static class Sitemap
{
    private static readonly XNamespace Ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private static readonly XNamespace Xhtml = "http://www.w3.org/1999/xhtml";

    /// <summary>App pages that are not docs articles.</summary>
    public static readonly string[] StaticRoutes = ["/", "/docs", "/about"];

    public static void MapSitemap(this IEndpointRouteBuilder app)
    {
        app.MapGet("/sitemap.xml", (HttpContext context, DocsStore store, SiteLinks links) =>
        {
            context.Response.Headers.CacheControl = "public, max-age=3600";
            return Results.Text(Build(links.BaseUrl(context), store, links), "application/xml", Encoding.UTF8);
        });

        app.MapGet("/robots.txt", (HttpContext context, SiteLinks links) =>
            Results.Text(Robots(links.BaseUrl(context)), "text/plain", Encoding.UTF8));
    }

    public static string Build(string baseUrl, DocsStore store, SiteLinks links)
    {
        var urls = new List<XElement>();

        foreach (var route in StaticRoutes)
            urls.AddRange(Entries(baseUrl, links, route, links.Locales.ToDictionary(l => l, _ => (DateTimeOffset?)null)));

        foreach (var (slug, updated) in store.GetSitemap())
            urls.AddRange(Entries(baseUrl, links, $"/docs/{slug}", updated.ToDictionary(u => u.Key, u => (DateTimeOffset?)u.Value)));

        var document = new XDocument(new XDeclaration("1.0", "utf-8", null),
            new XElement(Ns + "urlset", new XAttribute(XNamespace.Xmlns + "xhtml", Xhtml), urls));
        return document.Declaration + "\n" + document.Root;
    }

    public static string Robots(string baseUrl) => $"User-agent: *\nAllow: /\n\nSitemap: {baseUrl}/sitemap.xml\n";

    /// <summary>One &lt;url&gt; per language the route exists in, each listing all of them as alternates.</summary>
    private static IEnumerable<XElement> Entries(string baseUrl, SiteLinks links, string route, IReadOnlyDictionary<string, DateTimeOffset?> updatedByLocale)
    {
        var locales = links.Locales.Where(updatedByLocale.ContainsKey).ToList();
        XElement Link(string hreflang, string locale) =>
            new(Xhtml + "link", new XAttribute("rel", "alternate"), new XAttribute("hreflang", hreflang), new XAttribute("href", baseUrl + links.Localize(route, locale)));

        var alternates = locales.Select(l => Link(l, l)).ToList();
        if (locales.Contains(links.DefaultLocale)) alternates.Add(Link("x-default", links.DefaultLocale));

        foreach (var locale in locales)
        {
            yield return new XElement(Ns + "url",
                new XElement(Ns + "loc", baseUrl + links.Localize(route, locale)),
                updatedByLocale[locale] is { } updated ? new XElement(Ns + "lastmod", updated.ToString("yyyy-MM-dd")) : null,
                alternates);
        }
    }
}
