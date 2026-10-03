using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace MotifJs.Docs.Docs;

/// <summary>
/// Brings the database in line with the markdown files: new pages are added, changed ones re-rendered,
/// pages whose file is gone are removed. Nothing is written unless every file is valid.
/// </summary>
public sealed partial class DocsSync(DocsOptions options, string contentPath, DocsDatabase database, TextWriter output)
{
    // Bump when rendering changes so unchanged files are rendered again on the next sync.
    private const int RenderVersion = 1;

    private sealed record CategoryFile(string Id, Dictionary<string, string> Title, Dictionary<string, string>? Description);
    private sealed record PageRow(string Slug, string Locale, RenderedDoc Doc, string Hash);

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public int Run()
    {
        var errors = new List<string>();
        var categories = ReadCategories(errors);
        var pages = ReadPages(categories, errors);

        if (errors.Count > 0)
        {
            output.WriteLine($"Sync stopped, {errors.Count} problem(s) found. The database was not changed.");
            foreach (var error in errors) output.WriteLine($"  {error}");
            return 1;
        }

        using var connection = database.Open();
        DocsDatabase.EnsureSchema(connection);
        using var transaction = connection.BeginTransaction();

        WriteCategories(connection, categories);
        var (added, updated, unchanged, removed) = WritePages(connection, pages);

        transaction.Commit();
        output.WriteLine($"Docs synced to {database.Path}: {added} added, {updated} updated, {unchanged} unchanged, {removed} removed.");

        foreach (var missing in pages.Where(p => p.Locale == options.DefaultLocale)
                     .SelectMany(p => options.Locales.Where(l => l != options.DefaultLocale && !pages.Any(o => o.Slug == p.Slug && o.Locale == l))
                         .Select(l => $"{l}/{p.Slug}.md")))
            output.WriteLine($"  not translated yet (falls back to {options.DefaultLocale}): {missing}");

        return 0;
    }

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
        foreach (var category in categories)
        {
            if (string.IsNullOrWhiteSpace(category.Id)) errors.Add("categories.json: a category has no id");
            foreach (var locale in options.Locales.Where(l => category.Title?.ContainsKey(l) != true))
                errors.Add($"categories.json: category '{category.Id}' has no {locale} title");
        }
        foreach (var duplicate in categories.GroupBy(c => c.Id).Where(g => g.Count() > 1))
            errors.Add($"categories.json: category '{duplicate.Key}' is listed twice");

        return categories;
    }

    private List<PageRow> ReadPages(List<CategoryFile> categories, List<string> errors)
    {
        var pages = new List<PageRow>();

        foreach (var locale in options.Locales)
        {
            var folder = Path.Combine(contentPath, locale);
            if (!Directory.Exists(folder)) continue;

            foreach (var path in Directory.EnumerateFiles(folder, "*.md").Order(StringComparer.Ordinal))
            {
                var slug = Path.GetFileNameWithoutExtension(path);
                var name = $"{locale}/{Path.GetFileName(path)}";

                if (!SlugPattern().IsMatch(slug))
                {
                    errors.Add($"{name}: file names become URLs, use lowercase letters, digits and dashes");
                    continue;
                }

                var source = File.ReadAllText(path);
                try
                {
                    var doc = DocMarkdown.Render(source, name);
                    if (categories.Count > 0 && !categories.Any(c => c.Id == doc.Meta.Category))
                        errors.Add($"{name}:1: category '{doc.Meta.Category}' is not in categories.json");
                    pages.Add(new PageRow(slug, locale, doc, Hash(source)));
                }
                catch (DocContentException error)
                {
                    errors.Add(error.Message);
                }
            }
        }

        foreach (var orphan in pages.Where(p => p.Locale != options.DefaultLocale
                     && !pages.Any(o => o.Slug == p.Slug && o.Locale == options.DefaultLocale)))
            errors.Add($"{orphan.Locale}/{orphan.Slug}.md: there is no {options.DefaultLocale}/{orphan.Slug}.md to translate");

        return pages;
    }

    private static void WriteCategories(SqliteConnection connection, List<CategoryFile> categories)
    {
        Execute(connection, "DELETE FROM categories");
        for (var i = 0; i < categories.Count; i++)
        {
            foreach (var (locale, title) in categories[i].Title)
            {
                Execute(connection,
                    "INSERT INTO categories (id, locale, title, description, sort) VALUES ($id, $locale, $title, $description, $sort)",
                    ("$id", categories[i].Id), ("$locale", locale), ("$title", title),
                    ("$description", categories[i].Description?.GetValueOrDefault(locale) ?? ""), ("$sort", i));
            }
        }
    }

    private static (int Added, int Updated, int Unchanged, int Removed) WritePages(SqliteConnection connection, List<PageRow> pages)
    {
        var existing = new Dictionary<(string, string), string>();
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT slug, locale, source_hash FROM pages";
            using var reader = command.ExecuteReader();
            while (reader.Read()) existing[(reader.GetString(0), reader.GetString(1))] = reader.GetString(2);
        }

        int added = 0, updated = 0, unchanged = 0;
        var now = DateTime.UtcNow.ToString("O");

        foreach (var page in pages)
        {
            if (existing.Remove((page.Slug, page.Locale), out var hash))
            {
                if (hash == page.Hash) { unchanged++; continue; }
                updated++;
            }
            else added++;

            Execute(connection, """
                INSERT INTO pages (slug, locale, category, title, description, sort, html, headings, source_hash, updated_at)
                VALUES ($slug, $locale, $category, $title, $description, $sort, $html, $headings, $hash, $now)
                ON CONFLICT (slug, locale) DO UPDATE SET
                    category = excluded.category, title = excluded.title, description = excluded.description,
                    sort = excluded.sort, html = excluded.html, headings = excluded.headings,
                    source_hash = excluded.source_hash, updated_at = excluded.updated_at
                """,
                ("$slug", page.Slug), ("$locale", page.Locale), ("$category", page.Doc.Meta.Category),
                ("$title", page.Doc.Meta.Title), ("$description", page.Doc.Meta.Description), ("$sort", page.Doc.Meta.Order),
                ("$html", page.Doc.Html), ("$headings", JsonSerializer.Serialize(page.Doc.Headings, JsonSerializerOptions.Web)),
                ("$hash", page.Hash), ("$now", now));
        }

        foreach (var (slug, locale) in existing.Keys)
            Execute(connection, "DELETE FROM pages WHERE slug = $slug AND locale = $locale", ("$slug", slug), ("$locale", locale));

        return (added, updated, unchanged, existing.Count);
    }

    private static void Execute(SqliteConnection connection, string sql, params (string Name, object Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
        command.ExecuteNonQuery();
    }

    private static string Hash(string source) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{RenderVersion}\n{source}")));
}
