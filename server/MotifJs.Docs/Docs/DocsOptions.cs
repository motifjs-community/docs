namespace MotifJs.Docs.Docs;

public sealed class DocsOptions
{
    public const string Section = "Docs";

    /// <summary>Folder with categories.json and one sub-folder per locale. Relative paths start at the content root.</summary>
    public string ContentPath { get; set; } = "../../content/docs";

    /// <summary>SQLite file the site reads from. Relative paths start at the content root.</summary>
    public string DatabasePath { get; set; } = "App_Data/docs.db";

    /// <summary>Locale of addresses without a language prefix (<c>/docs/x</c>); from site.config.json.</summary>
    public string DefaultLocale { get; set; } = "en";

    /// <summary>The languages, default first; from site.config.json.</summary>
    public string[] Locales { get; set; } = [];
}
