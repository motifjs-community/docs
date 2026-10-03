using Microsoft.Data.Sqlite;

namespace MotifJs.Docs.Docs;

/// <summary>Opens the docs database and keeps its schema in place.</summary>
public sealed class DocsDatabase(string path)
{
    public string Path { get; } = path;

    public SqliteConnection Open()
    {
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(Path))!);
        var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path }.ToString());
        connection.Open();
        return connection;
    }

    public static void EnsureSchema(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
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
                PRIMARY KEY (slug, locale)
            );
            """;
        command.ExecuteNonQuery();
    }
}
