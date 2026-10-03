namespace MotifJs.Docs.Docs;

public sealed class DocsOptions
{
    public const string Section = "Docs";

    /// <summary>Folder with categories.json and one sub-folder per locale. Relative paths start at the content root.</summary>
    public string ContentPath { get; set; } = "../../content/docs";

    /// <summary>SQLite file the site reads from. Relative paths start at the content root.</summary>
    public string DatabasePath { get; set; } = "App_Data/docs.db";

    /// <summary>Locale used when a page has no translation. Its pages decide which slugs exist.</summary>
    public string DefaultLocale { get; set; } = "en";

    /// <summary>Set in appsettings.json. No default here: the config binder would append to it instead of replacing it.</summary>
    public string[] Locales { get; set; } = [];
}
