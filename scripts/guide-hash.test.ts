import assert from 'node:assert/strict';
import test from 'node:test';
import { hashAnchorId } from '../docs/pages/sdlc-development/guides/guide-hash.ts';

await test('course-map anchors decode the hash before the DOM lookup', () => {
  assert.equal(hashAnchorId('#step-05'), 'step-05');
  assert.equal(hashAnchorId('#%D1%88%D0%B0%D0%B3-5'), 'шаг-5', 'percent-encoded Cyrillic id');
  assert.equal(hashAnchorId('#'), '', 'an empty hash targets nothing');
  assert.equal(hashAnchorId(''), '', 'a page without a hash targets nothing');
  assert.equal(
    hashAnchorId('#100%'),
    '100%',
    'a malformed escape stays literal instead of throwing',
  );
});
