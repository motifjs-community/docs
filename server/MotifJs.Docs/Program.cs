using MotifJs.Docs.Docs;
using MotifJs.Docs.Site;

var builder = WebApplication.CreateBuilder(args);

var site = SiteConfig.Load();
var docsOptions = builder.Configuration.GetSection(DocsOptions.Section).Get<DocsOptions>() ?? new DocsOptions();
docsOptions.DefaultLocale = site.DefaultLocale;
docsOptions.Locales = [.. site.Locales.Select(l => l.Code).Prepend(site.DefaultLocale).Distinct()];
string FromContentRoot(string path) => Path.GetFullPath(path, builder.Environment.ContentRootPath);
var docsDatabase = new DocsDatabase(FromContentRoot(docsOptions.DatabasePath));

// `dotnet run -- sync` rebuilds the database from the markdown files and exits.
if (args.FirstOrDefault() == "sync")
{
    var sync = new DocsSync(docsOptions, site.ToCodeOptions(), FromContentRoot(docsOptions.ContentPath), docsDatabase, Console.Out);
    return sync.Run();
}

// `dotnet run -- export [folder]` writes the site as static files (default: dist/ in the repository root).
if (args.FirstOrDefault() == "export")
{
    var outDir = FromContentRoot(args.Skip(1).FirstOrDefault(a => !a.StartsWith("--")) ?? "../../dist");
    var store = new DocsStore(docsDatabase, docsOptions);
    var links = new SiteLinks(docsOptions, builder.Configuration, site);
    var export = new StaticExport(store, links, new PageShell(store, links, site),
        Path.Combine(builder.Environment.ContentRootPath, "wwwroot"), Console.Out);
    return export.Run(outDir);
}

var hadDatabase = File.Exists(docsDatabase.Path);
using (var connection = docsDatabase.Open())
{
    if (!hadDatabase) DocsDatabase.EnsureSchema(connection);
    else if (DocsDatabase.ReadSchemaVersion(connection) != DocsDatabase.SchemaVersion)
        Console.Error.WriteLine($"warning: {docsDatabase.Path} was built by an older version; run `npm run docs:sync`.");
}

builder.Services.AddSingleton(site);
builder.Services.AddSingleton(docsOptions);
builder.Services.AddSingleton(docsDatabase);
builder.Services.AddSingleton<DocsStore>();
builder.Services.AddSingleton<SiteLinks>();
builder.Services.AddSingleton<PageShell>();
builder.Services.AddSingleton<IndexPage>();

var app = builder.Build();

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = file =>
    {
        // Vite puts a content hash in every file name under /assets, so those never change.
        if (file.Context.Request.Path.StartsWithSegments("/assets"))
            file.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    }
});

app.MapDocsApi();
app.MapSitemap();
app.MapFallback((HttpContext context, IndexPage page) => page.Handle(context));

app.Run();
return 0;
