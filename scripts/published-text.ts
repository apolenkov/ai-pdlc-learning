// What the published text of the course must not carry, checked on the built site as it is uploaded
// (players, subtitles and scripts included): build markers, other owner routes, internal names.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';

import { walk } from './site-requests.ts';

/* The public edition names no internal Jira project, GitLab group, request system, LLM provider or model.
   The names themselves are not published: the check compares sha256 of every word (whole, by hyphen parts,
   without trailing digits; as written and in lower case). */
const INTERNAL_NAME_SHA256 = new Set([
  '0d1ed1936dd6879e10ac3aff267e42f73bbe427fb398e7bbbc1cd70255bd9acc',
  'e8e450dba8e467d840ba0d4cd9f4b0b2cb4745c61a5e336bfa8b2a8e3ac621e0',
  '67f2d22514622d1be30c14ee9f3cb104503a159a33a656ca91a1953aa9616429',
  'd017f5c6aad2574063e03a591e6b6266fb0e262e883a9b3e4b5302e1faf7d641',
  'fbddf5578c7e71bd0157df771fb7d81ca03f52713b522001918e232e88e937c4',
  '08f956ded58fdf77c7481ba3b31e1393e13db3cc95fa88c531e9367f16820049',
  'b1b6d0dc348317e199ffce708f6d0ac0325285f8e703cc94902256d6b51bb2e8',
  '47b5103385a06fa8b2ed730e9f1e0cad552515d89bdf0ff7dc17dd2953f8d08e',
  '8ff52715fd384584afbdf9abd29bbee884e8b7d8585ae23dcbb1ea263e33a32a',
  '1a83c5f73929c60a313ec9eb8c97e34cb34dde0092246d69a0c6116451eec01c',
  '20d18e0897446e5ea9de66045adabfe83f9b008a48186caa4e1ae3bcd542ac59',
  '98e189757dee2ccb63eb1470560ed5cde56fc14c7ec9edd1f3ada85eb135652e',
  '58f4b5d70c6467ce6e6eeceb7671a82627d627a3166355b10134b60b1329338b',
  'c48a80d1e218e06412132b2d3fd7aa823746d943158574e340ea3216bb169bc8',
  '9ce6a8e923c076eccda675b43b2206583be24f58497e827fcf6bdf42ebbd8d7b',
]);
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const hasInternalName = (text: string): boolean => {
  const seen = new Set<string>();
  for (const token of text.split(/[^\p{L}\p{N}-]+/u))
    for (const part of [token, ...token.split('-')]) {
      const base = part.replace(/\d+$/u, '');
      for (const variant of [base, base.toLowerCase()]) {
        if (!variant || seen.has(variant)) continue;
        seen.add(variant);
        if (INTERNAL_NAME_SHA256.has(sha256(variant))) return true;
      }
    }
  return false;
};

/* Real internal hosts are not named here: corp-guard checks them from the stop list outside Git. */
export const FORBIDDEN_TEXT = [
  /__CUSTOMDEV_ROOT__/u,
  // Public addresses of the course and its example repositories are allowed; any other owner route is not,
  // including a name that continues after dots (`ai-pdlc-learning.archive`, `..archive`). A clone address may end in `.git`.
  /apolenkov(?!\.github\.io\/ai-pdlc-learning\/|\/(?:ai-pdlc-learning|ai-pdlc-learning-stage-(?:1|2|3|4-code|4-requirements)|git-markdown-intent)(?:\.git)?(?![\w-]|\.+[\w-]))/u,
  /enabling-team/u,
  /protected-maps/u,
  /encrypted-payload/u,
] as const;

/* Media and binary documents: their bytes are not text (films and pictures are checked by OCR before release). */
const BINARY = /\.(?:png|webp|jpe?g|gif|ico|docx|pdf|mp4|webm|mp3|m4a|wav|woff2?|ttf|zip|tar)$/iu;

/** Every forbidden marker, route or internal name in the text files of a built site, as «file: rule». */
export const publishedTextProblems = async (siteDir: string): Promise<string[]> => {
  const problems: string[] = [];
  for (const file of (await walk(siteDir)).sort()) {
    if (BINARY.test(file)) continue;
    const text = await readFile(file, 'utf8');
    const name = relative(siteDir, file);
    for (const pattern of FORBIDDEN_TEXT)
      if (pattern.test(text)) problems.push(`${name}: ${pattern}`);
    if (hasInternalName(text)) problems.push(`${name}: internal name`);
  }
  return problems;
};
