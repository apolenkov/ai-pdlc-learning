// The `pages` CI job checks the downloaded site package before it unpacks it: only regular files and directories,
// no absolute or `..` paths, and no more content than the Pages limit. tar is called without a shell, and nothing is
// parsed beyond the first character of the verbose listing, which is the entry type in GNU, bsd and busybox tar alike.
// Sizes are not read from the listing (its columns differ between the three): the content is streamed through
// `tar -xzO` to stdout and counted, and the stream is cut as soon as the limit is passed, so a bomb costs no disk.
// Run: node --experimental-strip-types scripts/check-site-archive.ts <archive>
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_CONTENT_BYTES = 209_715_200;

/** Run tar without a shell; `onData` sees stdout chunks and may return false to stop the process. */
const tar = (
  args: string[],
  onData: (chunk: Buffer) => boolean,
): Promise<{ stopped: boolean; stderr: string }> =>
  new Promise((resolvePromise, reject) => {
    const child = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stopped = false;
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.stdout.on('data', (chunk: Buffer) => {
      if (stopped || onData(chunk)) return;
      stopped = true;
      child.kill('SIGKILL');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (stopped || code === 0) resolvePromise({ stopped, stderr });
      else reject(new Error(`tar ${args.join(' ')} failed (${code}): ${stderr.trim()}`));
    });
  });

const lines = async (args: string[]): Promise<string[]> => {
  const chunks: Buffer[] = [];
  await tar(args, (chunk) => (chunks.push(chunk), true));
  const text = Buffer.concat(chunks).toString('utf8');
  return text === '' ? [] : text.replace(/\n$/u, '').split('\n');
};

/** Names and entry types must be safe and paired; throws with the offending entry. */
export const checkListing = (names: readonly string[], verbose: readonly string[]): void => {
  if (names.length !== verbose.length)
    throw new Error(
      `Archive listings differ: ${names.length} names, ${verbose.length} verbose lines`,
    );
  if (names.length === 0) throw new Error('Archive is empty');
  for (const [i, name] of names.entries()) {
    const type = verbose[i]?.[0];
    if (type !== '-' && type !== 'd')
      throw new Error(`Archive entry is not a regular file or directory (type "${type}"): ${name}`);
    if (name.startsWith('/') || /^[A-Za-z]:/u.test(name) || name.split(/[\\/]/u).includes('..'))
      throw new Error(`Archive entry has an absolute or parent path: ${name}`);
  }
};

/** Throws when the archive holds anything but files and directories, an unsafe path, or more than `maxBytes` of content. */
export const checkSiteArchive = async (
  archive: string,
  maxBytes: number = MAX_CONTENT_BYTES,
): Promise<{ entries: number; contentBytes: number }> => {
  const names = await lines(['-tzf', archive]);
  checkListing(names, await lines(['-tzvf', archive]));
  let contentBytes = 0;
  const { stopped } = await tar(['-xzOf', archive], (chunk) => {
    contentBytes += chunk.length;
    return contentBytes <= maxBytes;
  });
  if (stopped) throw new Error(`Archive content is more than ${maxBytes} bytes`);
  return { entries: names.length, contentBytes };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const archive = process.argv[2];
  if (!archive) throw new Error('Usage: check-site-archive.ts <archive>');
  const { entries, contentBytes } = await checkSiteArchive(resolve(archive));
  process.stdout.write(
    `Archive ${archive}: ${entries} entries, ${contentBytes} bytes of content (limit ${MAX_CONTENT_BYTES})\n`,
  );
}
