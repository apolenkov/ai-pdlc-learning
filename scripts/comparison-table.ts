// The guide index owns the comparison copy. Keep the headings, links and
// both descriptions from each authored row when laying them out as a single table.
export function renderComparisonTable(html: string): string {
  const div = /<!--[\s\S]*?-->|<div\s+((?:[^>"']|"[^"]*"|'[^']*')*)>/giu;
  const attribute = /([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/gu;
  const rowBody =
    /\s*<h3>([^<]+)<\/h3>\s*<div class="comparison-pair">\s*<p><strong>([^<]+)<\/strong>(.*?)<\/p>\s*<p><strong>([^<]+)<\/strong>(.*?)<\/p>\s*<\/div>\s*<\/div>/suy;

  const rows = [];
  for (const tag of html.matchAll(div)) {
    if (!tag[1]) continue; // A comment can contain a disabled row.
    const attributes = [...tag[1].matchAll(attribute)];
    const classes = attributes.find((attr) => attr[1]!.toLowerCase() === 'class');
    if (!(classes?.[2] ?? classes?.[3] ?? classes?.[4])?.split(/\s+/u).includes('comparison-row'))
      continue;
    rowBody.lastIndex = tag.index + tag[0].length;
    const cells = rowBody.exec(html);
    if (!cells) throw new Error('Incomplete comparison row in guides/index.html');
    const id = attributes.find((attr) => attr[1]!.toLowerCase() === 'id');
    rows.push({ start: tag.index, end: rowBody.lastIndex, cells, id: id?.[0] });
  }

  const first = rows[0];
  const last = rows.at(-1);
  if (!first || !last) throw new Error('Incomplete comparison row in guides/index.html');

  const headings = ['Тема', first.cells[2], first.cells[4]].map(
    (text) => `<th scope="col">${text}</th>`,
  );
  const body = rows.map(({ start, cells, id }, index, parsedRows) => {
    const [, topic, leftTitle, left, rightTitle, right] = cells;
    if (leftTitle !== first.cells[2] || rightTitle !== first.cells[4])
      throw new Error(`Comparison column headings differ in row ${index + 1}`);
    const previous = parsedRows[index - 1];
    if (
      previous &&
      (previous.end > start ||
        html
          .slice(previous.end, start)
          .replace(/<!--[\s\S]*?-->/gu, '')
          .trim())
    )
      throw new Error('Unexpected content between comparison rows');
    return `<tr${id ? ' ' + id : ''}><th scope="row">${topic}</th><td>${left}</td><td>${right}</td></tr>`;
  });
  const table = `<div class="comparison-scroll" role="region" aria-labelledby="comparison-title" tabindex="0"><table aria-labelledby="comparison-title"><thead><tr>${headings.join('')}</tr></thead><tbody>${body.join('\n')}</tbody></table></div>`;
  return html.slice(0, first.start) + table + html.slice(last.end);
}
