using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

/// <summary>
/// Writes the whole site as static files for hosts that cannot run the server (GitHub Pages, Netlify,
/// Cloudflare Pages): every page with its meta tags and crawler copy, every API response as a .json file,
/// the sitemap, and a small page for every redirect. Reads the built site (wwwroot) and the synced database.
/// </summary>
public sealed class StaticExport(DocsStore store, SiteLinks links, PageShell pageShell, string webRoot, TextWriter output)
{
    // Left in the output so a later export knows the folder is its own and may be emptied.
    private const string Marker = ".static-export";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
    };

    public int Run(string outDir)
    {
        var shellPath = Path.Combine(webRoot, "index.html");
        if (!File.Exists(shellPath))
            return Fail($"{shellPath} not found; run `npm run build` first.");

        var siteUrl = links.ConfiguredUrl ?? "";
        if (!Uri.TryCreate(siteUrl, UriKind.Absolute, out var uri))
            return Fail("set \"url\" in site.config.json: a static site has no request to take its address from.");
        if (uri.AbsolutePath != "/")
            return Fail($"\"url\" ({siteUrl}) has a path; the site has to be served from the root of its domain (a custom domain, or a <name>.github.io repository).");

        if (Directory.Exists(outDir) && Directory.EnumerateFileSystemEntries(outDir).Any())
        {
            if (!File.Exists(Path.Combine(outDir, Marker)))
                return Fail($"{outDir} is not empty and was not made by an export; choose another folder or empty it.");
            Directory.Delete(outDir, recursive: true);
        }

        CopyDirectory(webRoot, outDir);
        File.WriteAllText(Path.Combine(outDir, Marker), "");
        // GitHub Pages would otherwise run Jekyll, which skips files starting with an underscore.
        File.WriteAllText(Path.Combine(outDir, ".nojekyll"), "");

        var shell = File.ReadAllText(shellPath);
        var pages = 0;

        foreach (var locale in links.Locales)
        {
            foreach (var route in Sitemap.StaticRoutes)
                WritePage(outDir, links.Localize(route, locale), pageShell.Render(shell, siteUrl, locale, route, null, notFound: false));

            var nav = store.GetNav(locale);
            WriteJson(outDir, DocsApi.NavPath(locale), nav);

            foreach (var slug in nav.SelectMany(c => c.Pages).Select(p => p.Slug))
            {
                var doc = store.GetPage(slug, locale)!;
                var route = $"/docs/{slug}";
                WriteJson(outDir, DocsApi.PagePath(locale, slug), doc);
                WritePage(outDir, links.Localize(route, locale), pageShell.Render(shell, siteUrl, locale, route, doc, notFound: false));
                pages++;
            }
        }

        // A static host cannot answer 301: the old address gets a page that forwards at once, and the old
        // JSON address holds what the server would have answered (the moved page, or "moved to home").
        var redirects = store.GetRedirects();
        foreach (var (locale, from, to) in redirects)
        {
            var target = links.Localize(to is null ? "/docs" : $"/docs/{to}", locale);
            WritePage(outDir, links.Localize($"/docs/{from}", locale), RedirectPage(locale, siteUrl + target, target));
            if (to is null) WriteJson(outDir, DocsApi.PagePath(locale, from), new { movedToHome = true });
            else if (store.GetPage(to, locale) is { } moved) WriteJson(outDir, DocsApi.PagePath(locale, from), moved);
        }

        File.WriteAllText(Path.Combine(outDir, "404.html"), pageShell.Render(shell, siteUrl, links.DefaultLocale, "/404", null, notFound: true));
        File.WriteAllText(Path.Combine(outDir, "sitemap.xml"), Sitemap.Build(siteUrl, store, links));
        File.WriteAllText(Path.Combine(outDir, "robots.txt"), Sitemap.Robots(siteUrl));
        AddFolderIndexes(outDir);

        output.WriteLine($"Static site written to {Path.GetFullPath(outDir)}: {pages} docs pages in {links.Locales.Count} languages, {redirects.Count} redirects.");
        return 0;
    }

    private int Fail(string message)
    {
        output.WriteLine($"Export stopped: {message}");
        return 1;
    }

    /// <summary>"/tr/docs/routing" → tr/docs/routing.html, which static hosts serve at the address without ".html".</summary>
    private static void WritePage(string outDir, string path, string html)
    {
        var file = path == "/" ? "index.html" : path.TrimStart('/') + ".html";
        Write(outDir, file, html);
    }

    private static void WriteJson(string outDir, string path, object value) =>
        Write(outDir, path.TrimStart('/'), JsonSerializer.Serialize(value, Json));

    private static void Write(string outDir, string relativePath, string content)
    {
        var file = Path.Combine(outDir, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, content);
    }

    /// <summary>
    /// "/docs" is both docs.html and the folder docs/; some hosts answer such an address from docs/index.html
    /// (after adding a slash), so that file gets the same page.
    /// </summary>
    private static void AddFolderIndexes(string outDir)
    {
        foreach (var page in Directory.EnumerateFiles(outDir, "*.html", SearchOption.AllDirectories).ToList())
        {
            var folder = Path.ChangeExtension(page, null);
            if (Directory.Exists(folder) && !File.Exists(Path.Combine(folder, "index.html")))
                File.Copy(page, Path.Combine(folder, "index.html"));
        }
    }

    private static string RedirectPage(string locale, string absoluteTarget, string target)
    {
        var html = PageShell.Html;
        return $"""
            <!DOCTYPE html>
            <html lang="{locale}">
            <head>
                <meta charset="utf-8">
                <title>Moved</title>
                <meta name="robots" content="noindex">
                <link rel="canonical" href="{html.Encode(absoluteTarget)}">
                <meta http-equiv="refresh" content="0; url={html.Encode(target)}">
                <script>location.replace({JsonSerializer.Serialize(target)} + location.hash)</script>
            </head>
            <body><a href="{html.Encode(target)}">{html.Encode(absoluteTarget)}</a></body>
            </html>
            """;
    }

    private static void CopyDirectory(string from, string to)
    {
        Directory.CreateDirectory(to);
        foreach (var directory in Directory.EnumerateDirectories(from, "*", SearchOption.AllDirectories))
            Directory.CreateDirectory(Path.Combine(to, Path.GetRelativePath(from, directory)));
        foreach (var file in Directory.EnumerateFiles(from, "*", SearchOption.AllDirectories))
            File.Copy(file, Path.Combine(to, Path.GetRelativePath(from, file)), overwrite: true);
    }
}
