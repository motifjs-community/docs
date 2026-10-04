using Microsoft.Net.Http.Headers;

namespace MotifJs.Docs.Docs;

public static class DocsApi
{
    public static void MapDocsApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api/docs");

        api.MapGet("/nav", (string? locale, DocsStore store, HttpContext context) =>
        {
            locale = store.Normalize(locale);
            return NotModified(context, store, locale) ?? Results.Ok(store.GetNav(locale));
        });

        api.MapGet("/pages/{slug}", (string slug, string? locale, DocsStore store, HttpContext context) =>
        {
            locale = store.Normalize(locale);
            if (NotModified(context, store, locale, slug) is { } notModified) return notModified;
            if (store.GetPage(slug, locale) is { } page) return Results.Ok(page);

            // A page that moved answers with its new address (fetch follows it and the app updates the URL);
            // one removed without a successor tells the app to show the docs home.
            return store.FindRedirect(slug, locale) switch
            {
                (true, string to) => Results.Redirect($"/api/docs/pages/{Uri.EscapeDataString(to)}?locale={locale}", permanent: true),
                (true, null) => Results.Json(new { movedToHome = true }, statusCode: StatusCodes.Status404NotFound),
                _ => Results.NotFound()
            };
        });
    }

    /// <summary>Sets the ETag for this response and answers 304 when the client already has it.</summary>
    private static IResult? NotModified(HttpContext context, DocsStore store, params string[] key)
    {
        var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(System.Security.Cryptography.SHA1.HashData(
            System.Text.Encoding.UTF8.GetBytes(store.GetVersion() + "|" + string.Join('|', key))))[..16]}\"");

        context.Response.Headers.ETag = etag.ToString();
        context.Response.Headers.CacheControl = "no-cache";

        var sent = context.Request.GetTypedHeaders().IfNoneMatch;
        return sent.Any(tag => tag.Compare(etag, useStrongComparison: false)) ? Results.StatusCode(StatusCodes.Status304NotModified) : null;
    }
}
