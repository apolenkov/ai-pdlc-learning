import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../examples/product-meta/', import.meta.url);
const [agents, product, services, context, config] = await Promise.all([
  readFile(new URL('AGENTS.md', root), 'utf8'),
  readFile(new URL('product.yaml', root), 'utf8'),
  readFile(new URL('services.lock.yaml', root), 'utf8'),
  readFile(new URL('CONTEXT.md', root), 'utf8'),
  readFile(new URL('openspec/config.yaml', root), 'utf8'),
]);

for (const forbidden of [
  /push or branch protection changes/i,
  /spawning child agents/i,
  /arbitrary network access/i,
]) {
  assert.match(agents, forbidden);
}
assert.match(product, /classification: synthetic-public/);
assert.match(services, /access: read-only/g);
assert.doesNotMatch(services, /token|password|secret/i);
assert.match(context, /No corporate data/);
assert.match(config, /only product-level and cross-service requirements/);
assert.match(config, /remain in each service repository/);

process.stdout.write('SDLC analysis standard contract passed\n');
