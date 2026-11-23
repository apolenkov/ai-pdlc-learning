// The site as it is uploaded to Pages, players and subtitles included: it loads nothing outside itself and the
// media release, and its text keeps no build marker, other owner route or internal name.
// Usage: node --experimental-strip-types scripts/check-published-site.ts <built site directory>
import { resolve } from 'node:path';

import { publishedTextProblems } from './published-text.ts';
import { outsideRequests } from './site-requests.ts';

const siteDir = process.argv[2];
if (!siteDir) throw new Error('usage: check-published-site.ts <built site directory>');
const requests = await outsideRequests(resolve(siteDir));
const text = await publishedTextProblems(resolve(siteDir));
for (const line of requests) process.stderr.write(`outside request: ${line}\n`);
for (const line of text) process.stderr.write(`published text: ${line}\n`);
process.stdout.write(
  `check-published-site: ${requests.length} outside request(s), ${text.length} text problem(s) in ${siteDir}\n`,
);
if (requests.length + text.length > 0) process.exitCode = 1;
