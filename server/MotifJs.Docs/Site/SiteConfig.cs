using System.Text.Json;
using System.Text.RegularExpressions;
using MotifJs.Docs.Docs;

namespace MotifJs.Docs.Site;

public sealed record SiteLocale(string Code, string Label);
public sealed record SiteLinksConfig(string Repository, string Issues);

/// <summary>A choice readers can make about code examples; labels are text or one text per language.</summary>
public sealed record SiteCodeOption(string Id, JsonElement Label, IReadOnlyList<SiteCodeChoice> Choices);
public sealed record SiteCodeChoice(string Id, JsonElement Label);

/// <summary>
/// site.config.json from the repository root, the one file a fork edits: the site name, address, languages,
/// links and code options. The build copies it next to the server, so the site and the server read the same file.
/// </summary>
public sealed partial record SiteConfig(
    string Name,
    string? Url,
    string DefaultLocale,
    IReadOnlyList<SiteLocale> Locales,
    SiteLinksConfig Links,
    IReadOnlyList<SiteCodeOption>? CodeOptions)
{
    public const string FileName = "site.config.json";

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex IdPattern();

    public static SiteConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, FileName);
        if (!File.Exists(path))
            throw new InvalidOperationException($"{FileName} was not found next to the server ({AppContext.BaseDirectory}); build the project again.");

        var config = JsonSerializer.Deserialize<SiteConfig>(File.ReadAllText(path), JsonSerializerOptions.Web)
            ?? throw new InvalidOperationException($"{FileName} is empty.");
        if (config.Locales is not { Count: > 0 } || config.Locales.All(l => l.Code != config.DefaultLocale))
            throw new InvalidOperationException($"{FileName}: \"defaultLocale\" must be one of \"locales\".");

        var options = config.CodeOptions ?? [];
        var ids = options.SelectMany(o => o.Choices ?? []).Select(c => c.Id).ToList();
        if (options.Any(o => o.Choices is not { Count: > 0 }))
            throw new InvalidOperationException($"{FileName}: every code option needs at least one choice.");
        if (ids.FirstOrDefault(id => !IdPattern().IsMatch(id ?? "")) is { } bad)
            throw new InvalidOperationException($"{FileName}: code choice '{bad}' must be lowercase letters, digits and dashes.");
        if (ids.GroupBy(id => id).FirstOrDefault(g => g.Count() > 1) is { } twice)
            throw new InvalidOperationException($"{FileName}: code choice '{twice.Key}' is used twice; choice ids must be unique across options.");

        return config;
    }

    public CodeOptions ToCodeOptions() =>
        new((CodeOptions ?? []).Select(o => (IReadOnlyList<string>)o.Choices.Select(c => c.Id).ToList()).ToList());
}
