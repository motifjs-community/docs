using System.Text.RegularExpressions;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>
/// Addresses of the site: the default locale lives at the root, every other locale under its own
/// prefix (/tr/docs/routing). Shared by the app shell and the sitemap so both agree.
/// </summary>
public sealed partial class SiteLinks(DocsOptions options, IConfiguration configuration)
{
    [GeneratedRegex("(<a\\s[^>]*?href=\")(/(?!/)[^\"]*)\"")]
    private static partial Regex SiteLinkInHtml();

    public string DefaultLocale => options.DefaultLocale;
    public IReadOnlyList<string> Locales => options.Locales;

    /// <summary>Absolute base, from Site:Url when set (behind a proxy), otherwise from the request.</summary>
    public string BaseUrl(HttpContext context) =>
        (configuration["Site:Url"] ?? $"{context.Request.Scheme}://{context.Request.Host}").TrimEnd('/');

    /// <summary>"/tr/docs/routing" → ("tr", "/docs/routing"); unprefixed paths are the default locale.</summary>
    public (string Locale, string Route) Split(string path)
    {
        foreach (var locale in options.Locales.Where(l => l != options.DefaultLocale))
        {
            if (path == $"/{locale}" || path == $"/{locale}/") return (locale, "/");
            if (path.StartsWith($"/{locale}/", StringComparison.Ordinal)) return (locale, path[(locale.Length + 1)..]);
        }
        return (options.DefaultLocale, path);
    }

    /// <summary>"/docs/routing" in "tr" → "/tr/docs/routing"; a "#section" or "?query" stays at the end.</summary>
    public string Localize(string route, string locale)
    {
        if (locale == options.DefaultLocale) return route;
        var split = route.IndexOfAny(['#', '?']);
        var path = split < 0 ? route : route[..split];
        var suffix = split < 0 ? "" : route[split..];
        return (path == "/" ? $"/{locale}" : $"/{locale}{path}") + suffix;
    }

    /// <summary>Points site links in rendered markdown (written as "/docs/x") at the reader's locale.</summary>
    public string LocalizeHtml(string html, string locale) =>
        locale == options.DefaultLocale ? html : SiteLinkInHtml().Replace(html, m => $"{m.Groups[1].Value}{Localize(m.Groups[2].Value, locale)}\"");
}
