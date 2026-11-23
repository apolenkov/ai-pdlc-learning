import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readVideoManifest, verifyVideoAsset } from './video-manifest.ts';
import { publishedVideos } from './landing-video.ts';

// Use the same publication list as video:fetch and build:site; other films also have manifests.
for (const spec of publishedVideos()) {
  const manifest = await readVideoManifest(process.cwd(), spec);
  const file = resolve(process.argv[2] || 'public', spec.outputDir, manifest.file);
  const bytes = await readFile(file);
  verifyVideoAsset(bytes, manifest);
  process.stdout.write(`Pages video verified: ${manifest.file} (${spec.page})\n`);
}
