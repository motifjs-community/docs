using MotifJs.Docs.Docs;
using MotifJs.Docs.Site;

var builder = WebApplication.CreateBuilder(args);

var docsOptions = builder.Configuration.GetSection(DocsOptions.Section).Get<DocsOptions>() ?? new DocsOptions();
docsOptions.Locales = [.. docsOptions.Locales.Prepend(docsOptions.DefaultLocale).Distinct()];
string FromContentRoot(string path) => Path.GetFullPath(path, builder.Environment.ContentRootPath);
var docsDatabase = new DocsDatabase(FromContentRoot(docsOptions.DatabasePath));

// `dotnet run -- sync` updates the database from the markdown files and exits.
if (args.FirstOrDefault() == "sync")
{
    var sync = new DocsSync(docsOptions, FromContentRoot(docsOptions.ContentPath), docsDatabase, Console.Out);
    return sync.Run();
}

using (var connection = docsDatabase.Open()) DocsDatabase.EnsureSchema(connection);

builder.Services.AddSingleton(docsOptions);
builder.Services.AddSingleton(docsDatabase);
builder.Services.AddSingleton<DocsStore>();
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
app.MapFallback((HttpContext context, IndexPage page) => page.Handle(context));

app.Run();
return 0;
