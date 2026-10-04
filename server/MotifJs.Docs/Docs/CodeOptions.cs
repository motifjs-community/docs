namespace MotifJs.Docs.Docs;

/// <summary>
/// The code choices readers can make ("codeOptions" in site.config.json), such as a writing style and a
/// component style. A code example written in several ways marks each block with <c>variant=</c>: a choice
/// (<c>class</c>), several choices of different options (<c>declarative/class</c>), or a comma-separated list
/// of those (<c>function,options</c>). Every combination of choices needs a block.
/// </summary>
public sealed class CodeOptions(IReadOnlyList<IReadOnlyList<string>> options)
{
    public static readonly CodeOptions None = new([]);

    /// <summary>The choice ids of each option, in order.</summary>
    public IReadOnlyList<IReadOnlyList<string>> Options { get; } = options;

    /// <summary>What a variant may be made of, for error messages.</summary>
    public string Describe() => Options.Count == 0
        ? "this site has no codeOptions in site.config.json"
        : string.Join(", ", Options.Select(o => string.Join("|", o))) + (Options.Count > 1 ? ", or several joined with /" : "");

    /// <summary>Null when the pattern (e.g. "declarative/class") is valid, otherwise what is wrong with it.</summary>
    public string? Check(string pattern)
    {
        if (Options.Count == 0) return Describe();
        var ids = pattern.Split('/');
        if (ids.Any(id => !Options.Any(o => o.Contains(id)))) return $"'{pattern}' is not made of {Describe()}";
        if (ids.Select(id => Options.First(o => o.Contains(id))).Distinct().Count() != ids.Length)
            return $"'{pattern}' names two choices of the same option";
        return null;
    }

    /// <summary>Every way a reader can set the options: one choice per option.</summary>
    public IEnumerable<string[]> Combinations()
    {
        IEnumerable<string[]> combinations = [[]];
        foreach (var option in Options)
            combinations = combinations.SelectMany(c => option.Select(choice => c.Append(choice).ToArray()));
        return combinations;
    }

    public static bool Matches(string pattern, string[] combination) => pattern.Split('/').All(combination.Contains);

    /// <summary>The same pattern however it is ordered: "class/declarative" equals "declarative/class".</summary>
    public static string Normalize(string pattern) => string.Join("/", pattern.Split('/').Order(StringComparer.Ordinal));
}
