import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { GUIDE_VIDEOS, readVideoManifest, sha256 } from './guide-video.ts';

// Use the same publication list as video:fetch and build:site; other films also have manifests.
for (const spec of GUIDE_VIDEOS) {
  const manifest = await readVideoManifest(process.cwd(), spec);
  const file = resolve(process.argv[2] || 'public', 'guides/assets/video', manifest.file);
  const bytes = await readFile(file);
  assert.equal(bytes.length, manifest.size, `${file}: size differs from ${spec.manifest}`);
  assert.equal(sha256(bytes), manifest.sha256, `${file}: SHA256 differs from ${spec.manifest}`);
  process.stdout.write(`Pages video verified: ${manifest.file} (${spec.page})\n`);
}
