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
/// Reads docs for one locale. A page missing in that locale is served in the default locale, and the
/// default locale decides which pages exist and in what order.
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

    /// <summary>Changes whenever a sync changes anything; good enough for an ETag.</summary>
    public string GetVersion()
    {
        using var connection = database.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) || '-' || COALESCE(MAX(updated_at), '') FROM pages";
        return (string)command.ExecuteScalar()!;
    }

    /// <summary>Every page of the default locale, in reading order, with the requested translation where there is one.</summary>
    private List<PageRow> ReadPageRows(SqliteConnection connection, string locale)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT d.slug, COALESCE(t.locale, d.locale), d.category, COALESCE(t.title, d.title),
                   COALESCE(t.description, d.description), d.sort, COALESCE(t.updated_at, d.updated_at)
            FROM pages d
            LEFT JOIN pages t ON t.slug = d.slug AND t.locale = $locale
            LEFT JOIN categories c ON c.id = d.category AND c.locale = d.locale
            WHERE d.locale = $default
            ORDER BY c.sort, d.sort, d.slug
            """;
        command.Parameters.AddWithValue("$locale", locale);
        command.Parameters.AddWithValue("$default", options.DefaultLocale);

        var rows = new List<PageRow>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
            rows.Add(new PageRow(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
                reader.GetString(4), reader.GetInt32(5), DateTimeOffset.Parse(reader.GetString(6))));
        return rows;
    }

    private List<CategoryRow> ReadCategories(SqliteConnection connection, string locale)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT d.id, COALESCE(t.title, d.title), COALESCE(t.description, d.description)
            FROM categories d
            LEFT JOIN categories t ON t.id = d.id AND t.locale = $locale
            WHERE d.locale = $default
            ORDER BY d.sort
            """;
        command.Parameters.AddWithValue("$locale", locale);
        command.Parameters.AddWithValue("$default", options.DefaultLocale);

        var categories = new List<CategoryRow>();
        using var reader = command.ExecuteReader();
        while (reader.Read()) categories.Add(new CategoryRow(reader.GetString(0), reader.GetString(1), reader.GetString(2)));
        return categories;
    }
}
