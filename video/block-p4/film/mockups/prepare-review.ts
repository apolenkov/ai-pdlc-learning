import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';
const base = fileURLToPath(new URL('.', import.meta.url));
const film = resolve(base, '..');
const outArg = process.argv[2];
if (!outArg)
  throw new Error('Usage: node --experimental-strip-types prepare-review.ts <external OUT>');
const out = resolve(outArg);
const repo = resolve(film, '../../..');
if (!relative(repo, out).startsWith('..'))
  throw new Error('OUT must be outside this source worktree; do not duplicate resources into Git');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const proof: { project: string; source: string; target: string; sha256: string }[] = [];
for (const [folder, project] of [
  ['scene-03', 'scene03'],
  ['scene-05', 'scene05'],
  ['title-05', 'title05'],
]) {
  const dest = join(out, 'projects', project);
  const files = [
    [join(base, folder, 'index.html'), 'index.html'],
    [join(base, folder, 'package.json'), 'package.json'],
    [join(film, 'kit/tokens.css'), 'kit/tokens.css'],
    [join(film, 'assets/gsap.min.js'), 'assets/gsap.min.js'],
    ...[
      'inter-cyrillic.woff2',
      'inter-latin.woff2',
      'jetbrains-mono-cyrillic.woff2',
      'jetbrains-mono-latin.woff2',
    ].map((font) => [join(film, 'assets/fonts', font), `assets/fonts/${font}`]),
  ];
  if (project === 'title05')
    files.push(
      [join(film, 'kit/components.css'), 'kit/components.css'],
      [join(film, 'kit/kit.js'), 'kit/kit.js'],
      [join(film, 'compositions/scene-t5.html'), 'compositions/scene-t5.html'],
    );
  else
    files.push(
      [join(base, 'mockup.css'), 'mockup.css'],
      [join(base, folder, 'timeline.js'), 'timeline.js'],
    );
  for (const [source, local] of files) {
    const target = join(dest, local);
    mkdirSync(resolve(target, '..'), { recursive: true });
    copyFileSync(source, target);
    const hash = sha(source);
    if (hash !== sha(target)) throw new Error(`Copy SHA mismatch: ${target}`);
    proof.push({ project, source, target, sha256: hash });
  }
}
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, 'mockup-source-proof.json'),
  JSON.stringify(
    {
      note: 'Exact local source copies for isolated review; production duration unchanged; no browser/render invoked',
      files: proof,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${join(out, 'projects')}; exact-copy SHA proof ${join(out, 'mockup-source-proof.json')}`,
);
