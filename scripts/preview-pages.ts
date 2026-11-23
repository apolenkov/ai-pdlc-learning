import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const DEFAULT_PORT = 4177;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/** Map a request path to a file inside `siteDir`; anything that escapes it is refused. */
export const resolveRequest = (siteDir: string, pathname: string): string | undefined => {
  const decoded = decodeURIComponent(pathname);
  const target = resolve(siteDir, `.${decoded.endsWith('/') ? `${decoded}index.html` : decoded}`);
  return target.startsWith(siteDir + sep) ? target : undefined;
};

export const serve = async (
  siteDir: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const file = resolveRequest(siteDir, new URL(request.url ?? '/', 'http://localhost').pathname);
  const found =
    file &&
    (await stat(file).then(
      (entry) => entry.isFile(),
      () => false,
    ));
  if (!file || !found) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
};

export const startPreview = (siteDir: string, port: number) =>
  createServer((request, response) => {
    serve(siteDir, request, response).catch((error: unknown) => {
      response.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  }).listen(port, '127.0.0.1');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteDir = resolve(ROOT, process.env.PAGES_OUTPUT_DIR || 'dist/site');
  const port = Number(process.env.PORT || DEFAULT_PORT);
  startPreview(siteDir, port);
  process.stdout.write(
    `Preview of ${siteDir}: http://127.0.0.1:${port}/ (run npm run build:site first)\n`,
  );
}
