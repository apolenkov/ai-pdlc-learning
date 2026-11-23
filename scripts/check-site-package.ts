// The `pages` CI job unpacks the open site package from the Registry into public/ and runs this check:
// the archive and the unpacked tree stay within the 200 MiB Pages limit, both required pages are there,
// and the headroom left is printed. Run: node --experimental-strip-types scripts/check-site-package.ts <public dir> <archive>
import { lstat, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_ARCHIVE_BYTES = 209_715_200;
export const MAX_UNPACKED_KIB = 204_800;
export const REQUIRED_PAGES = ['index.html', 'course/guides/index.html'];

export interface SitePackageLimits {
  maxArchiveBytes?: number;
  maxUnpackedKib?: number;
  requiredPages?: string[];
}

export interface SitePackageReport {
  archiveBytes: number;
  unpackedKib: number;
  archiveHeadroomBytes: number;
  unpackedHeadroomKib: number;
}

/** Disk usage of `dir` in KiB, counted like `du -sk`: allocated blocks of the directory, its subdirectories and files. */
const diskUsageKib = async (dir: string): Promise<number> => {
  let bytes = (await lstat(dir)).blocks * 512;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    bytes += entry.isDirectory()
      ? (await diskUsageKib(path)) * 1024
      : (await lstat(path)).blocks * 512;
  }
  return Math.ceil(bytes / 1024);
};

const mib = (value: number, unit: 'bytes' | 'kib'): string =>
  `${(unit === 'bytes' ? value / 1_048_576 : value / 1024).toFixed(1)} MiB`;

/** Throws when the archive or the unpacked `publicDir` exceeds its limit or a required page is missing or empty. */
export const checkSitePackage = async (
  publicDir: string,
  archivePath: string,
  limits: SitePackageLimits = {},
): Promise<SitePackageReport> => {
  const maxArchiveBytes = limits.maxArchiveBytes ?? MAX_ARCHIVE_BYTES;
  const maxUnpackedKib = limits.maxUnpackedKib ?? MAX_UNPACKED_KIB;
  const archiveBytes = (await stat(archivePath)).size;
  if (archiveBytes > maxArchiveBytes)
    throw new Error(`Archive ${archivePath} is ${archiveBytes} bytes, limit ${maxArchiveBytes}`);
  for (const page of limits.requiredPages ?? REQUIRED_PAGES) {
    const info = await stat(join(publicDir, page)).catch(() => undefined);
    if (!info?.isFile() || info.size === 0)
      throw new Error(`Required page is missing or empty: ${page}`);
  }
  const unpackedKib = await diskUsageKib(publicDir);
  if (unpackedKib > maxUnpackedKib)
    throw new Error(`Unpacked ${publicDir} is ${unpackedKib} KiB, limit ${maxUnpackedKib}`);
  return {
    archiveBytes,
    unpackedKib,
    archiveHeadroomBytes: maxArchiveBytes - archiveBytes,
    unpackedHeadroomKib: maxUnpackedKib - unpackedKib,
  };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [publicDir, archivePath] = process.argv.slice(2);
  if (!publicDir || !archivePath)
    throw new Error('Usage: check-site-package.ts <public dir> <archive>');
  const report = await checkSitePackage(resolve(publicDir), resolve(archivePath));
  process.stdout.write(
    `Archive ${report.archiveBytes} bytes (${mib(report.archiveBytes, 'bytes')}), headroom ${mib(report.archiveHeadroomBytes, 'bytes')}\n` +
      `Pages artifact ${report.unpackedKib} KiB (${mib(report.unpackedKib, 'kib')}), limit ${MAX_UNPACKED_KIB} KiB, headroom ${mib(report.unpackedHeadroomKib, 'kib')}\n`,
  );
}
