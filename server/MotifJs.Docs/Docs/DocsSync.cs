using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace MotifJs.Docs.Docs;

/// <summary>
/// Builds the docs database from the markdown files, from scratch, into a new file that then replaces the old
/// one. Every language folder is read on its own: languages need not have the same pages. The only thing
/// taken from the old database is its address history, so an address that loses its page keeps working
/// as a redirect. Nothing is written unless every file is valid.
/// </summary>
public sealed partial class DocsSync(DocsOptions options, CodeOptions codeOptions, string contentPath, DocsDatabase database, TextWriter output)
{
    // Part of every page's hash, so a rendering change reports pages as updated.
    private const int RenderVersion = 2;

    private sealed record CategoryFile(string Id, Dictionary<string, string>? Title, Dictionary<string, string>? Description);
    private sealed record SourceFile(string Name, string FullPath, string Locale, string Slug, string Source, ParsedDoc Parsed);
    private sealed record PageRow(string Slug, string Locale, string SourcePath, RenderedDoc Doc, string Hash);
    private sealed record Redirect(string Locale, string From, string? To);
    private sealed record PreviousPage(string Hash, string UpdatedAt, string SourcePath);

    /// <summary>What the old database held: its pages (to report changes and spot moved files) and its redirects.</summary>
    private sealed record Previous(Dictionary<(string Locale, string Slug), PreviousPage> Pages, List<Redirect> Redirects);

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public int Run()
    {
        var errors = new List<string>();
        var warnings = new List<string>();
        var categories = ReadCategories(errors);
        var pages = ReadPages(categories, errors, warnings);

        if (errors.Count > 0)
        {
            output.WriteLine($"Sync stopped, {errors.Count} problem(s) found. The database was not changed.");
            foreach (var error in errors) output.WriteLine($"  {error}");
            return 1;
        }

        var previous = ReadPrevious(warnings);
        var redirects = PlanRedirects(pages, previous);

        var building = database.Path + ".new";
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(building))!);
        File.Delete(building);
        (int Added, int Updated, int Unchanged, int Removed) counts;
        using (var connection = database.Open(building))
        {
            DocsDatabase.EnsureSchema(connection);
            using var transaction = connection.BeginTransaction();
            WriteCategories(connection, categories);
            counts = WritePages(connection, pages, previous);
            WriteRedirects(connection, redirects);
            transaction.Commit();
        }

        if (!Replace(building, database.Path))
        {
            output.WriteLine($"Sync stopped: {database.Path} is in use and could not be replaced. The new database is in {building}.");
            return 1;
        }

        output.WriteLine($"Docs rebuilt in {database.Path}: {counts.Added} added, {counts.Updated} updated, {counts.Unchanged} unchanged, {counts.Removed} removed.");
        output.WriteLine("  " + string.Join(", ", options.Locales.Select(l => $"{l}: {pages.Count(p => p.Locale == l)} pages")));

        var known = previous.Redirects.ToHashSet();
        foreach (var redirect in redirects.Where(r => !known.Contains(r)))
            output.WriteLine($"  redirect: {Address(redirect.Locale, redirect.From)} -> {Address(redirect.Locale, redirect.To)}");
        foreach (var warning in warnings)
            output.WriteLine($"  warning: {warning}");

        return 0;
    }

    private string Address(string locale, string? slug) =>
        (locale == options.DefaultLocale ? "" : $"/{locale}") + (slug is null ? "/docs" : $"/docs/{slug}");

    private List<CategoryFile> ReadCategories(List<string> errors)
    {
        var path = Path.Combine(contentPath, "categories.json");
        if (!File.Exists(path))
        {
            errors.Add($"categories.json not found in {Path.GetFullPath(contentPath)}");
            return [];
        }

        List<CategoryFile>? categories;
        try
        {
            categories = JsonSerializer.Deserialize<List<CategoryFile>>(File.ReadAllText(path), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch (JsonException error)
        {
            errors.Add($"categories.json:{(error.LineNumber ?? 0) + 1}: {error.Message}");
            return [];
        }

        categories ??= [];
        foreach (var category in categories.Where(c => string.IsNullOrWhiteSpace(c.Id)))
            errors.Add("categories.json: a category has no id");
        foreach (var duplicate in categories.GroupBy(c => c.Id).Where(g => g.Count() > 1))
            errors.Add($"categories.json: category '{duplicate.Key}' is listed twice");

        return categories;
    }

    private List<PageRow> ReadPages(List<CategoryFile> categories, List<string> errors, List<string> warnings)
    {
        if (Directory.Exists(contentPath))
        {
            foreach (var folder in Directory.EnumerateDirectories(contentPath).Select(Path.GetFileName).Where(f => !options.Locales.Contains(f)))
                warnings.Add($"folder '{folder}' was skipped: it is not one of the languages in site.config.json ({string.Join(", ", options.Locales)})");
        }

        // 1. Read every file, so each one's address is known before any link is resolved.
        var files = new List<SourceFile>();
        foreach (var locale in options.Locales)
        {
            var folder = Path.Combine(contentPath, locale);
            if (!Directory.Exists(folder)) continue;

            foreach (var path in Directory.EnumerateFiles(folder, "*.md", SearchOption.AllDirectories).Order(StringComparer.Ordinal))
            {
                var name = Path.GetRelativePath(contentPath, path).Replace('\\', '/');
                var source = File.ReadAllText(path);
                try
                {
                    var parsed = DocMarkdown.Parse(source, name);
                    var slug = string.IsNullOrWhiteSpace(parsed.Meta.Slug) ? Path.GetFileNameWithoutExtension(path) : parsed.Meta.Slug.Trim();
                    if (!SlugPattern().IsMatch(slug))
                    {
                        errors.Add($"{name}:1: '{slug}' cannot be an address; set `slug:` in front matter (lowercase letters, digits and dashes)");
                        continue;
                    }

                    var category = categories.FirstOrDefault(c => c.Id == parsed.Meta.Category);
                    if (category is null)
                        errors.Add($"{name}:1: category '{parsed.Meta.Category}' is not in categories.json");
                    else if (category.Title?.ContainsKey(locale) != true)
                        errors.Add($"{name}:1: category '{category.Id}' has no {locale} title in categories.json");

                    files.Add(new SourceFile(name, Path.GetFullPath(path), locale, slug, source, parsed));
                }
                catch (DocContentException error)
                {
                    errors.Add(error.Message);
                }
            }
        }

        foreach (var clash in files.GroupBy(f => (f.Locale, f.Slug)).Where(g => g.Count() > 1))
            errors.Add($"{string.Join(" and ", clash.Select(f => f.Name))} both use the address '{clash.Key.Slug}'");

        foreach (var file in files)
        foreach (var old in file.Parsed.Meta.RedirectFrom)
        {
            if (!SlugPattern().IsMatch(old)) errors.Add($"{file.Name}:1: redirectFrom '{old}' is not an address");
            else if (files.Any(f => f.Locale == file.Locale && f.Slug == old)) errors.Add($"{file.Name}:1: redirectFrom '{old}' is a page that still exists");
        }
        foreach (var taken in files.SelectMany(f => f.Parsed.Meta.RedirectFrom.Select(old => (f.Locale, Old: old, f.Name)))
                     .GroupBy(r => (r.Locale, r.Old)).Where(g => g.Count() > 1))
            errors.Add($"redirectFrom '{taken.Key.Old}' is claimed by more than one page ({string.Join(", ", taken.Select(r => r.Name))})");

        // 2. Render, turning links between files of the same language into site links.
        var pages = new List<PageRow>();
        foreach (var language in files.GroupBy(f => f.Locale))
        {
            var slugByPath = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var file in language) slugByPath[file.FullPath] = file.Slug;
            // Any address change can alter links in other pages, so it is part of every page's hash.
            var addressMap = string.Join("\n", language.Select(f => $"{f.Name}={f.Slug}").Order(StringComparer.Ordinal));

            foreach (var file in language)
            {
                string? Resolve(string written) =>
                    slugByPath.GetValueOrDefault(Path.GetFullPath(Path.Combine(Path.GetDirectoryName(file.FullPath)!, written)));
                try
                {
                    var doc = DocMarkdown.Render(file.Parsed, Resolve, codeOptions);
                    pages.Add(new PageRow(file.Slug, file.Locale, file.Name, doc, Hash(file, addressMap)));
                }
                catch (DocContentException error)
                {
                    errors.Add(error.Message);
                }
            }
        }

        // 3. A link may name a section; it should exist on the page it leads to.
        foreach (var page in pages)
        foreach (var link in page.Doc.Links.Where(l => l.Anchor is not null))
        {
            var target = pages.FirstOrDefault(p => p.Slug == link.Slug && p.Locale == page.Locale);
            if (target is not null && !target.Doc.Headings.Any(h => h.Id == link.Anchor))
                warnings.Add($"{page.SourcePath}:{link.Line}: link '{link.Written}' — {target.SourcePath} has no heading #{link.Anchor} (add {{#{link.Anchor}}} to it)");
        }

        return pages;
    }

    /// <summary>Reads what the old database knew. Databases from before languages were separate are understood too.</summary>
    private Previous ReadPrevious(List<string> warnings)
    {
        var previous = new Previous([], []);
        if (!File.Exists(database.Path)) return previous;

        try
        {
            using var connection = database.Open();
            if (DocsDatabase.HasColumn(connection, "pages", "slug"))
            {
                var sourcePath = DocsDatabase.HasColumn(connection, "pages", "source_path") ? "source_path" : "''";
                using var command = connection.CreateCommand();
                command.CommandText = $"SELECT slug, locale, source_hash, updated_at, {sourcePath} FROM pages";
                using var reader = command.ExecuteReader();
                while (reader.Read())
                    previous.Pages[(reader.GetString(1), reader.GetString(0))] = new PreviousPage(reader.GetString(2), reader.GetString(3), reader.GetString(4));
            }

            if (DocsDatabase.HasColumn(connection, "redirects", "from_slug"))
            {
                // One redirect used to serve every language.
                var perLocale = DocsDatabase.HasColumn(connection, "redirects", "locale");
                using var command = connection.CreateCommand();
                command.CommandText = perLocale ? "SELECT from_slug, to_slug, locale FROM redirects" : "SELECT from_slug, to_slug FROM redirects";
                using var reader = command.ExecuteReader();
                while (reader.Read())
                {
                    var to = reader.IsDBNull(1) ? null : reader.GetString(1);
                    foreach (var locale in perLocale ? new[] { reader.GetString(2) } : options.Locales)
                        previous.Redirects.Add(new Redirect(locale, reader.GetString(0), to));
                }
            }
        }
        catch (SqliteException error)
        {
            warnings.Add($"the old database could not be read ({error.Message}); old addresses were not carried over");
            return new Previous([], []);
        }

        return previous;
    }

    /// <summary>
    /// Keeps every address that ever had a page working, per language. A vanished address leads to: the page
    /// that lists it in redirectFrom, else the page now built from the same file (its slug changed), else the
    /// docs home of that language.
    /// </summary>
    private static List<Redirect> PlanRedirects(List<PageRow> pages, Previous previous)
    {
        var live = pages.Select(p => (p.Locale, p.Slug)).ToHashSet();
        var plan = new Dictionary<(string Locale, string From), string?>();

        foreach (var redirect in previous.Redirects)
            plan[(redirect.Locale, redirect.From)] = redirect.To;

        foreach (var ((locale, slug), page) in previous.Pages.Where(p => !live.Contains(p.Key)))
            plan[(locale, slug)] = pages.FirstOrDefault(p => p.Locale == locale && p.SourcePath == page.SourcePath)?.Slug;

        // Declared ones win, and count even if this database never had that page (an address from an older site).
        foreach (var page in pages)
        foreach (var old in page.Doc.Meta.RedirectFrom)
            plan[(page.Locale, old)] = page.Slug;

        foreach (var address in live) plan.Remove(address);

        // Older redirects that led to an address that is now redirected itself skip straight to the end;
        // one that leads to an address with neither a page nor a redirect goes to the docs home.
        string? Follow(string locale, string? to)
        {
            var seen = new HashSet<string>();
            while (to is not null && !live.Contains((locale, to)))
                to = plan.TryGetValue((locale, to), out var next) && seen.Add(to) ? next : null;
            return to;
        }

        return plan.Select(r => new Redirect(r.Key.Locale, r.Key.From, Follow(r.Key.Locale, r.Value)))
            .OrderBy(r => r.Locale, StringComparer.Ordinal).ThenBy(r => r.From, StringComparer.Ordinal)
            .ToList();
    }

    private static void WriteCategories(SqliteConnection connection, List<CategoryFile> categories)
    {
        for (var i = 0; i < categories.Count; i++)
        {
            foreach (var (locale, title) in categories[i].Title ?? [])
            {
                Execute(connection,
                    "INSERT INTO categories (id, locale, title, description, sort) VALUES ($id, $locale, $title, $description, $sort)",
                    ("$id", categories[i].Id), ("$locale", locale), ("$title", title),
                    ("$description", categories[i].Description?.GetValueOrDefault(locale) ?? ""), ("$sort", i));
            }
        }
    }

    private static (int Added, int Updated, int Unchanged, int Removed) WritePages(SqliteConnection connection, List<PageRow> pages, Previous previous)
    {
        int added = 0, updated = 0, unchanged = 0;
        var now = DateTime.UtcNow.ToString("O");

        foreach (var page in pages)
        {
            // An unchanged page keeps its date, which the sitemap and the API's ETag rely on.
            var updatedAt = now;
            if (previous.Pages.TryGetValue((page.Locale, page.Slug), out var old))
            {
                if (old.Hash == page.Hash) { unchanged++; updatedAt = old.UpdatedAt; }
                else updated++;
            }
            else added++;

            Execute(connection, """
                INSERT INTO pages (slug, locale, category, title, description, sort, html, headings, source_hash, updated_at, source_path)
                VALUES ($slug, $locale, $category, $title, $description, $sort, $html, $headings, $hash, $updated, $path)
                """,
                ("$slug", page.Slug), ("$locale", page.Locale), ("$category", page.Doc.Meta.Category),
                ("$title", page.Doc.Meta.Title), ("$description", page.Doc.Meta.Description), ("$sort", page.Doc.Meta.Order),
                ("$html", page.Doc.Html), ("$headings", JsonSerializer.Serialize(page.Doc.Headings, JsonSerializerOptions.Web)),
                ("$hash", page.Hash), ("$updated", updatedAt), ("$path", page.SourcePath));
        }

        var live = pages.Select(p => (p.Locale, p.Slug)).ToHashSet();
        return (added, updated, unchanged, previous.Pages.Keys.Count(k => !live.Contains(k)));
    }

    private static void WriteRedirects(SqliteConnection connection, List<Redirect> redirects)
    {
        var now = DateTime.UtcNow.ToString("O");
        foreach (var redirect in redirects)
            Execute(connection, "INSERT INTO redirects (locale, from_slug, to_slug, created_at) VALUES ($locale, $from, $to, $now)",
                ("$locale", redirect.Locale), ("$from", redirect.From), ("$to", (object?)redirect.To ?? DBNull.Value), ("$now", now));
    }

    /// <summary>Swaps in the new file. The site opens the database per request, so a short retry is enough.</summary>
    private static bool Replace(string built, string target)
    {
        for (var attempt = 1; attempt <= 30; attempt++)
        {
            try
            {
                File.Move(built, target, overwrite: true);
                return true;
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException)
            {
                Thread.Sleep(100);
            }
        }
        return false;
    }

    private static void Execute(SqliteConnection connection, string sql, params (string Name, object Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
        command.ExecuteNonQuery();
    }

    private static string Hash(SourceFile file, string addressMap) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{RenderVersion}\n{file.Name}\n{file.Slug}\n{addressMap}\n{file.Source}")));
}
