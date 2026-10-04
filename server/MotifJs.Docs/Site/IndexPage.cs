using System.Text.RegularExpressions;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>Serves the app shell for every page route, filled in by <see cref="PageShell"/>.</summary>
public sealed partial class IndexPage(IWebHostEnvironment environment, DocsStore store, SiteLinks links, PageShell pageShell)
{
    private string? template;
    private DateTimeOffset templateTime;

    [GeneratedRegex("^/docs/(?<slug>[a-z0-9-]+)/?$")] public static partial Regex DocsPath();

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
        await context.Response.WriteAsync(pageShell.Render(shell, links.BaseUrl(context), locale, route, doc, notFound));
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
