import assert from 'node:assert/strict';
import test from 'node:test';
import { renderComparisonTable } from './comparison-table.ts';

const topics = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

for (const attributes of [
  'class="comparison-row"',
  'id="topic-one" class="comparison-row"',
  'class="comparison-row" id=topic-one',
  `class="comparison-row" id='topic>one'`,
]) {
  await test(`renders all six comparison topics in order with ${attributes}`, () => {
    const source = topics
      .map(
        (topic, index) =>
          `<div ${index === 0 ? attributes : 'class="comparison-row"'}><h3>${topic}</h3>
          <div class="comparison-pair"><p><strong>Before</strong>Left</p>
          <p><strong>After</strong>Right</p></div></div>`,
      )
      .join('\n');
    const html = renderComparisonTable(source);
    const commented = source.replaceAll(
      '</div></div>\n',
      '</div></div>\n<!-- omitted: <div class="comparison-row"> -->\n',
    );
    assert.equal(renderComparisonTable(commented), html);
    assert.throws(
      () => renderComparisonTable(commented.replace('<!--', '<p>Text</p><!--')),
      /Unexpected content/u,
    );
    const body = /<tbody>(.*?)<\/tbody>/su.exec(html)?.[1] ?? '';
    assert.deepEqual(
      [...body.matchAll(/<th scope="row">([^<]+)<\/th>/gu)].map((match) => match[1]),
      topics,
    );
    const id = attributes.match(/\bid=\S+/u)?.[0];
    assert.ok(body.startsWith(id ? `<tr ${id}>` : '<tr>'));
    assert.doesNotMatch(html, /<h3>/u);
  });
}
