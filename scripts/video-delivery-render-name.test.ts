import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickWebRender, webRenderCandidates } from './video-delivery-render-name.ts';

await test('курсовой ролик: имя web-рендера прежнее, с суффиксом -720p', () => {
  assert.deepEqual(webRenderCandidates('block-0'), ['block-0-720p.mp4']);
});

await test('для landing-* особого правила нет: скрипт их не обрабатывает', () => {
  assert.deepEqual(webRenderCandidates('landing-overview'), ['landing-overview-720p.mp4']);
});

await test('явное поле webFile манифеста задаёт имя файла без правил', () => {
  assert.deepEqual(webRenderCandidates('block-0', { webFile: 'block-0-accepted.mp4' }), [
    'block-0-accepted.mp4',
  ]);
});

await test('пустое или нестроковое webFile отклоняется с понятной ошибкой', () => {
  for (const webFile of ['', 42, null]) {
    assert.throws(
      () => webRenderCandidates('block-0', { webFile }),
      /block-0: invalid manifest webFile/,
      `webFile=${String(webFile)}`,
    );
  }
});

await test('webFile выигрывает у имени по умолчанию, когда существуют оба файла', () => {
  const picked = pickWebRender(
    'block-0',
    { webFile: 'block-0-accepted.mp4' },
    (name) => name === 'block-0-720p.mp4' || name === 'block-0-accepted.mp4',
  );
  assert.equal(picked, 'block-0-accepted.mp4');
});

await test('нет ни одного web-рендера: ошибка перечисляет проверенные имена', () => {
  assert.throws(
    () => pickWebRender('block-0', {}, () => false),
    /block-0: нет web-рендера \(block-0-720p\.mp4\)/,
  );
});
