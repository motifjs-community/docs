import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const siteUrl = config.url.replace(/\/$/, '');
const locale = config.defaultLocale;
const docsDir = join(root, 'content', 'docs');
const skillRepo = 'https://github.com/motifjsdev/skills';
const skillRaw = 'https://raw.githubusercontent.com/motifjsdev/skills/main/skills/motifjs';
const localSkill = process.env.MOTIF_SKILL_DIR ?? resolve(root, '..', '..', 'skills', 'skills', 'motifjs');

const frontMatter = (text) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return { meta, body: m[2] };
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : name.endsWith('.md') ? [path] : [];
  });

const readSkill = async (file) => {
  const local = join(localSkill, file);
  if (existsSync(local)) return readFileSync(local, 'utf8');
  const res = await fetch(`${skillRaw}/${file}`);
  if (!res.ok) throw new Error(`${skillRaw}/${file}: ${res.status}`);
  return res.text();
};

const docs = () => {
  const categories = JSON.parse(readFileSync(join(docsDir, 'categories.json'), 'utf8'));
  const pages = walk(join(docsDir, locale)).map((path) => {
    const { meta } = frontMatter(readFileSync(path, 'utf8'));
    const slug = meta.slug ?? path.replace(/\\/g, '/').split('/').pop().replace(/\.md$/, '');
    return { slug, title: meta.title ?? slug, description: meta.description ?? '', category: meta.category ?? '', order: Number(meta.order ?? 0) };
  });
  const lines = [];
  for (const category of categories) {
    const own = pages.filter((p) => p.category === category.id).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    if (own.length === 0) continue;
    lines.push(`### ${category.title[locale] ?? category.id}`, '');
    for (const p of own) lines.push(`- [${p.title}](${siteUrl}/docs/${p.slug})${p.description ? `: ${p.description}` : ''}`);
    lines.push('');
  }
  return lines;
};

const skillSections = (skillMd) => {
  const rows = [...skillMd.matchAll(/^\|\s*(.+?)\s*\|\s*`references\/([a-z0-9-]+\.md)`\s*\|$/gm)];
  return rows.map(([, need, file]) => ({ need, file: `references/${file}` }));
};

const skill = frontMatter(await readSkill('SKILL.md'));
const references = skillSections(skill.body);
const summary = skill.body.split(/\r?\n\r?\n/).find((p) => p.startsWith('MotifJS is')) ?? '';

const index = [
  `# ${config.name}`,
  '',
  `> ${summary.replace(/\s+/g, ' ').trim()}`,
  '',
  'MotifJS is not React, Vue, Solid or Angular, and no model has prior knowledge of it. The agent skill below',
  'is the canonical text for writing MotifJS code: read SKILL.md first, then the reference that matches the task.',
  'The complete skill in one file is at the end of this list.',
  '',
  '## Agent skill',
  '',
  `- [SKILL.md](${skillRaw}/SKILL.md): entry point, Thinking in Motif, minimal project, rules that prevent most bugs`,
  ...references.map((r) => `- [${r.file}](${skillRaw}/${r.file}): ${r.need}`),
  `- [Skill repository](${skillRepo}): install with \`npx skills add motifjsdev/skills\` or the Claude Code plugin marketplace`,
  '',
  '## Documentation',
  '',
  ...docs(),
  '## Source and packages',
  '',
  `- [Source and issues](${config.links.repository})`,
  '- [@motifx/core on npm](https://www.npmjs.com/package/@motifx/core): runtime',
  '- [@motifx/compiler on npm](https://www.npmjs.com/package/@motifx/compiler): JSX compiler, Vite plugin, motif-lint and motif-explain',
  '- [Community projects](https://github.com/motifjs-community): reference apps and wrapper packages',
  '',
  '## Optional',
  '',
  `- [llms-full.txt](${siteUrl}/llms-full.txt): the complete agent skill (SKILL.md and every reference) in one file`,
  ...config.locales.filter((l) => l.code !== locale).map((l) => `- [${l.label} documentation](${siteUrl}/${l.code}/docs)`),
  '',
];

const full = [
  `# ${config.name}: complete agent skill`,
  '',
  `Source: ${skillRepo} (skills/motifjs). Index: ${siteUrl}/llms.txt`,
  '',
  '---',
  '',
  '<!-- SKILL.md -->',
  '',
  skill.body.trim(),
  '',
];
for (const r of references) {
  full.push('---', '', `<!-- ${r.file} -->`, '', (await readSkill(r.file)).trim(), '');
}

writeFileSync(join(root, 'public', 'llms.txt'), index.join('\n'));
writeFileSync(join(root, 'public', 'llms-full.txt'), full.join('\n'));
console.log(`llms.txt: ${references.length + 1} skill files, ${docs().filter((l) => l.startsWith('- ')).length} docs pages (${existsSync(localSkill) ? 'local skill' : 'skill from GitHub'})`);
console.log(`llms-full.txt: ${full.join('\n').length} characters`);
