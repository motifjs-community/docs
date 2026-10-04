using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace MotifJs.Docs.Docs;

public sealed record DocLink(string Slug, string Title);
public sealed record NavPage(string Slug, string Title, string Description);
public sealed record NavCategory(string Id, string Title, string Description, IReadOnlyList<NavPage> Pages);
public sealed record DocCategoryRef(string Id, string Title);

public sealed record DocPageResult(
    string Slug,
    string Locale,
    string Title,
    string Description,
    DocCategoryRef Category,
    string Html,
    IReadOnlyList<DocHeading> Headings,
    DocLink? Previous,
    DocLink? Next,
    DateTimeOffset UpdatedAt);

/// <summary>
/// Reads docs for one locale. Every language has its own pages; pages that share a slug are the same page
/// in different languages.
/// </summary>
public sealed class DocsStore(DocsDatabase database, DocsOptions options)
{
    private sealed record CategoryRow(string Id, string Title, string Description);
    private sealed record PageRow(string Slug, string Locale, string Category, string Title, string Description, int Sort, DateTimeOffset UpdatedAt);

    public IReadOnlyList<string> Locales => options.Locales;
    public string DefaultLocale => options.DefaultLocale;

    public bool IsLocale(string? locale) => locale is not null && options.Locales.Contains(locale);

    public string Normalize(string? locale) => IsLocale(locale) ? locale! : options.DefaultLocale;

    public IReadOnlyList<NavCategory> GetNav(string locale)
    {
        using var connection = database.Open();
        var pages = ReadPageRows(connection, locale);

        return ReadCategories(connection, locale)
            .Select(c => new NavCategory(c.Id, c.Title, c.Description,
                pages.Where(p => p.Category == c.Id).Select(p => new NavPage(p.Slug, p.Title, p.Description)).ToList()))
            .Where(c => c.Pages.Count > 0)
            .ToList();
    }

    public DocPageResult? GetPage(string slug, string locale)
    {
        using var connection = database.Open();
        var pages = ReadPageRows(connection, locale);
        var index = pages.FindIndex(p => p.Slug == slug);
        if (index < 0) return null;

        var row = pages[index];
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT html, headings FROM pages WHERE slug = $slug AND locale = $locale";
        command.Parameters.AddWithValue("$slug", row.Slug);
        command.Parameters.AddWithValue("$locale", row.Locale);
        using var reader = command.ExecuteReader();
        reader.Read();

        var category = ReadCategories(connection, locale).FirstOrDefault(c => c.Id == row.Category);
        return new DocPageResult(
            row.Slug,
            row.Locale,
            row.Title,
            row.Description,
            new DocCategoryRef(row.Category, category?.Title ?? row.Category),
            reader.GetString(0),
            JsonSerializer.Deserialize<List<DocHeading>>(reader.GetString(1), JsonSerializerOptions.Web) ?? [],
            index > 0 ? new DocLink(pages[index - 1].Slug, pages[index - 1].Title) : null,
            index < pages.Count - 1 ? new DocLink(pages[index + 1].Slug, pages[index + 1].Title) : null,
            row.UpdatedAt);
    }

    /// <summary>
    /// Where an address that no longer has a page leads: <c>Found</c> is false when it never redirected,
    /// <c>To</c> is null when it leads to the docs home.
    /// </summary>
    public (bool Found, string? To) FindRedirect(string slug, string locale)
    {
        using var connection = database.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT to_slug FROM redirects WHERE from_slug = $slug AND locale = $locale";
        command.Parameters.AddWithValue("$slug", slug);
        command.Parameters.AddWithValue("$locale", locale);
        using var reader = command.ExecuteReader();
        return reader.Read() ? (true, reader.IsDBNull(0) ? null : reader.GetString(0)) : (false, null);
    }

    /// <summary>Locales that have a page with this slug, in configured order.</summary>
    public IReadOnlyList<string> TranslationsOf(string slug)
    {
        using var connection = database.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT locale FROM pages WHERE slug = $slug";
        command.Parameters.AddWithValue("$slug", slug);

        var found = new HashSet<string>();
        using var reader = command.ExecuteReader();
        while (reader.Read()) found.Add(reader.GetString(0));
        return options.Locales.Where(found.Contains).ToList();
    }

    /// <summary>Every slug, in each language's reading order, with the last change of each language that has it; for the sitemap.</summary>
    public IReadOnlyList<(string Slug, IReadOnlyDictionary<string, DateTimeOffset> Updated)> GetSitemap()
    {
        using var connection = database.Open();
        var updated = new Dictionary<string, Dictionary<string, DateTimeOffset>>();
        var order = new List<string>();

        foreach (var locale in options.Locales)
        foreach (var page in ReadPageRows(connection, locale))
        {
            if (!updated.TryGetValue(page.Slug, out var byLocale))
            {
                updated[page.Slug] = byLocale = [];
                order.Add(page.Slug);
            }
            byLocale[locale] = page.UpdatedAt;
        }

        return order.Select(slug => (slug, (IReadOnlyDictionary<string, DateTimeOffset>)updated[slug])).ToList();
    }

    /// <summary>Changes whenever a sync changes anything; good enough for an ETag.</summary>
    public string GetVersion()
    {
        using var connection = database.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) || '-' || COALESCE(MAX(updated_at), '') FROM pages";
        return (string)command.ExecuteScalar()!;
    }

    /// <summary>The pages of one locale in reading order: by category, then by `order`.</summary>
    private static List<PageRow> ReadPageRows(SqliteConnection connection, string locale)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT p.slug, p.locale, p.category, p.title, p.description, p.sort, p.updated_at
            FROM pages p
            LEFT JOIN categories c ON c.id = p.category AND c.locale = p.locale
            WHERE p.locale = $locale
            ORDER BY c.sort, p.sort, p.slug
            """;
        command.Parameters.AddWithValue("$locale", locale);

        var rows = new List<PageRow>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
            rows.Add(new PageRow(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
                reader.GetString(4), reader.GetInt32(5), DateTimeOffset.Parse(reader.GetString(6))));
        return rows;
    }

    private static List<CategoryRow> ReadCategories(SqliteConnection connection, string locale)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, title, description FROM categories WHERE locale = $locale ORDER BY sort";
        command.Parameters.AddWithValue("$locale", locale);

        var categories = new List<CategoryRow>();
        using var reader = command.ExecuteReader();
        while (reader.Read()) categories.Add(new CategoryRow(reader.GetString(0), reader.GetString(1), reader.GetString(2)));
        return categories;
    }
}
