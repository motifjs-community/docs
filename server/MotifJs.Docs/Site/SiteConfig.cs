using System.Text.Json;

namespace MotifJs.Docs.Site;

public sealed record SiteLocale(string Code, string Label);
public sealed record SiteLinksConfig(string Repository, string Issues);

/// <summary>
/// site.config.json from the repository root, the one file a fork edits: the site name, address, languages
/// and links. The build copies it next to the server, so the site and the server read the same file.
/// </summary>
public sealed record SiteConfig(string Name, string? Url, string DefaultLocale, IReadOnlyList<SiteLocale> Locales, SiteLinksConfig Links)
{
    public const string FileName = "site.config.json";

    public static SiteConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, FileName);
        if (!File.Exists(path))
            throw new InvalidOperationException($"{FileName} was not found next to the server ({AppContext.BaseDirectory}); build the project again.");

        var config = JsonSerializer.Deserialize<SiteConfig>(File.ReadAllText(path), JsonSerializerOptions.Web)
            ?? throw new InvalidOperationException($"{FileName} is empty.");
        if (config.Locales is not { Count: > 0 } || config.Locales.All(l => l.Code != config.DefaultLocale))
            throw new InvalidOperationException($"{FileName}: \"defaultLocale\" must be one of \"locales\".");
        return config;
    }
}
