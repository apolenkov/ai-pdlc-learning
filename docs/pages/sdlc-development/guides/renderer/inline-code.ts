/**
 * Inline-code typography for the guide body (runs once after the body is rendered).
 * - A command flag («--tools», or a bare «--») may not wrap between its two dashes: the browser treats «-|-» as a break point.
 *   The flag is wrapped in a nowrap span, so the copied text stays byte-for-byte the same.
 * - A code chip followed by punctuation («AGENTS.md:») drops its right padding, so the colon does not read as a space.
 */
const FLAG = /(?<![\w-])--(?:[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)?(?!-)/gu;
const PUNCTUATION_AFTER_CODE = /^[:;,.!?)»]/u;

/** Split text into alternating plain and flag parts: even indexes are plain text, odd ones are flags. */
export const splitFlags = (text: string): string[] => {
  const parts: string[] = [];
  let last = 0;
  for (const match of text.matchAll(FLAG)) {
    parts.push(text.slice(last, match.index), match[0]);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
};

const TEXT_NODE = 3;
const FLAG_HOSTS = '*';

export const keepFlagsTogether = (root: ParentNode): void => {
  root.querySelectorAll(FLAG_HOSTS).forEach((host) => {
    if (host.closest('svg, script, style')) return;
    for (const node of [...host.childNodes]) {
      if (node.nodeType !== TEXT_NODE || !node.nodeValue?.includes('--')) continue;
      const parts = splitFlags(node.nodeValue);
      if (parts.length < 3) continue;
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (index % 2 === 0) {
          if (part) fragment.append(part);
          return;
        }
        const span = document.createElement('span');
        span.className = 'nobr-flag';
        span.textContent = part;
        fragment.append(span);
      });
      node.replaceWith(fragment);
    }
  });
};

export const tightenCodePunctuation = (root: ParentNode): void => {
  root.querySelectorAll('code').forEach((code) => {
    if (code.closest('pre')) return;
    const next = code.nextSibling;
    if (next?.nodeType === TEXT_NODE && PUNCTUATION_AFTER_CODE.test(next.nodeValue ?? '')) {
      code.classList.add('code--tight');
    }
  });
};
