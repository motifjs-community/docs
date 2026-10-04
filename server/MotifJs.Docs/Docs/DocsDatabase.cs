using Microsoft.Data.Sqlite;

namespace MotifJs.Docs.Docs;

/// <summary>Opens the docs database and creates its schema.</summary>
public sealed class DocsDatabase(string path)
{
    // Bump when the schema changes; the sync builds a new file anyway, the site only needs to know it is stale.
    public const int SchemaVersion = 2;

    public string Path { get; } = path;

    /// <summary>
    /// No connection pooling: a pooled connection keeps the file open, and the sync replaces the file
    /// while the site is running.
    /// </summary>
    public SqliteConnection Open(string? file = null)
    {
        file ??= Path;
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(file))!);
        var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = file, Pooling = false }.ToString());
        connection.Open();
        return connection;
    }

    public static void EnsureSchema(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE TABLE IF NOT EXISTS categories (
                id          TEXT NOT NULL,
                locale      TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT NOT NULL,
                sort        INTEGER NOT NULL,
                PRIMARY KEY (id, locale)
            );

            CREATE TABLE IF NOT EXISTS pages (
                slug        TEXT NOT NULL,
                locale      TEXT NOT NULL,
                category    TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT NOT NULL,
                sort        INTEGER NOT NULL,
                html        TEXT NOT NULL,
                headings    TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                source_path TEXT NOT NULL,
                PRIMARY KEY (slug, locale)
            );

            -- Addresses that no longer have a page, carried from one sync to the next so old links keep
            -- working; to_slug NULL sends visitors to the docs home of that language.
            CREATE TABLE IF NOT EXISTS redirects (
                locale     TEXT NOT NULL,
                from_slug  TEXT NOT NULL,
                to_slug    TEXT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (locale, from_slug)
            );

            PRAGMA user_version = {SchemaVersion};
            """;
        command.ExecuteNonQuery();
    }

    public static int ReadSchemaVersion(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA user_version";
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public static bool HasColumn(SqliteConnection connection, string table, string column)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM pragma_table_info($table) WHERE name = $column";
        command.Parameters.AddWithValue("$table", table);
        command.Parameters.AddWithValue("$column", column);
        return (long)command.ExecuteScalar()! > 0;
    }
}
