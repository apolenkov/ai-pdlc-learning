/** Process figure of the intent guides: rows of boxes, optional arrows inside a row. Markup follows the figures of stage-1.ts (course-figure--process, 1040-unit viewBox so 13 px text never renders smaller). */
export type FigureBox = { title: string; lines: string[] };
type FigureSpec = {
  id: string;
  title: string;
  desc: string;
  caption: string;
  rows: FigureBox[][];
  arrows: boolean;
};

const WIDTH = 1040;
const MARGIN = 8;
const GAP = 44;
const LINE = 22;
const escapeText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const intentFigure = ({ id, title, desc, caption, rows, arrows }: FigureSpec): string => {
  const parts: string[] = [];
  let y = MARGIN;
  for (const row of rows) {
    const gap = arrows ? GAP : 16;
    const width = (WIDTH - 2 * MARGIN - gap * (row.length - 1)) / row.length;
    const height = 52 + LINE * Math.max(...row.map((box) => box.lines.length));
    row.forEach((box, index) => {
      const x = MARGIN + index * (width + gap);
      const lines = box.lines
        .map(
          (line, at) =>
            `<text class="course-figure__small" x="${x + 16}" y="${y + 56 + at * LINE}">${escapeText(line)}</text>`,
        )
        .join('');
      parts.push(
        `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="${x + 16}" y="${y + 30}">${escapeText(box.title)}</text>${lines}</g>`,
      );
      if (arrows && index < row.length - 1) {
        const from = x + width + 6;
        const mid = y + height / 2;
        parts.push(
          `<path d="M${from} ${mid}L${from + gap - 12} ${mid}" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#${id}-arrow)"/>`,
        );
      }
    });
    y += height + 16;
  }
  const total = y - 16 + MARGIN;
  return `<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 ${WIDTH} ${total}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${escapeText(title)}</title><desc id="${id}-d">${escapeText(desc)}</desc><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs>${parts.join('')}</svg></div><figcaption>${escapeText(caption)}</figcaption></figure>`;
};
