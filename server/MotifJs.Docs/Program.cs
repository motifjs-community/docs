using MotifJs.Docs.Docs;

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

builder.Services.AddSingleton(docsOptions);
builder.Services.AddSingleton(docsDatabase);

var app = builder.Build();

app.MapGet("/", () => "MotifJS docs server");

app.Run();
return 0;
