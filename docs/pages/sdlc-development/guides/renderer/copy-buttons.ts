/**
 * The caption names the block's own action: the page repeats the «Через терминал» disclosure nine times,
 * so the first command line is the only per-block context the shared layer has (R-3).
 */
const CONTEXT_LIMIT = 44;

/** Cut a long command at a word boundary so a name or a flag never ends mid-token; a single huge token is cut hard. */
export const truncateContext = (action: string): string => {
  if (action.length <= CONTEXT_LIMIT) return action;
  const words = action.split(/\s+/u);
  let kept = '';
  for (const word of words) {
    const next = kept ? `${kept} ${word}` : word;
    if (next.length > CONTEXT_LIMIT) break;
    kept = next;
  }
  return kept ? `${kept}…` : `${action.slice(0, CONTEXT_LIMIT - 3).trimEnd()}…`;
};

const contextLabel = (pre: HTMLElement): string => {
  const firstLine =
    (pre.textContent ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  return truncateContext(firstLine.replace(/^\$\s*/u, '').trim());
};

/**
 * A terminal block is a real command block: a <pre> that carries a <code> child.
 * The R-1 example preview is plain text (no code, aria-hidden) and must stay out of the enhancer —
 * otherwise it gets a second, dead copy button and becomes focusable while hidden.
 */
/** Structural parameter: the enhancer only needs the element's querySelector. */
export const isTerminalBlock = (pre: { querySelector: (selector: string) => unknown }): boolean =>
  pre.querySelector('code') !== null;

/** Static toolbar skeleton: the label goes in through textContent, never through interpolated HTML. */
export const TERMINAL_TOOLBAR_HTML =
  '<div class="example-toolbar"><strong></strong><button type="button" class="copy-example">Скопировать</button></div><span class="copy-status" role="status" aria-live="polite"></span>';

export const addTerminalCopyButtons = (): void => {
  // Terminal command blocks (<pre><code> inside collapsed «Через терминал») get the same copy button as the exercise blocks.
  document.querySelectorAll<HTMLElement>('#guide-content pre:not([tabindex])').forEach((pre) => {
    if (!isTerminalBlock(pre)) return;
    const context = contextLabel(pre);
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-copy';
    wrapper.innerHTML = TERMINAL_TOOLBAR_HTML;
    // The caption repeated the command below, so only the screen-reader name stays (owner, A).
    wrapper
      .querySelector('button')
      ?.setAttribute('aria-label', `Скопировать: ${context || 'текст команды'}`);
    pre.setAttribute('tabindex', '0');
    pre.replaceWith(wrapper);
    wrapper.children[0]?.after(pre);
  });
};

/** How long the button itself says «Скопировано ✓»: the eye is on the button, not on a line under the block. */
export const COPIED_MS = 2000;
export const COPIED_LABEL = 'Скопировано ✓';

const showCopied = (button: HTMLButtonElement): void => {
  const idle = button.dataset['idleLabel'] ?? button.textContent ?? '';
  button.dataset['idleLabel'] = idle;
  button.textContent = COPIED_LABEL;
  button.setAttribute('data-copied', '');
  window.setTimeout(() => {
    button.textContent = idle;
    button.removeAttribute('data-copied');
  }, COPIED_MS);
};

const copyExample = async (button: HTMLButtonElement): Promise<void> => {
  const block = button.closest('.step-example, .terminal-copy');
  const status = block?.querySelector('.copy-status');
  const code = block?.querySelector('code');
  if (!status || !code) return;
  try {
    await navigator.clipboard.writeText(code.textContent ?? '');
    status.removeAttribute('data-copy-state');
    status.textContent = 'Скопировано';
    showCopied(button);
  } catch {
    status.setAttribute('data-copy-state', 'error');
    status.textContent = 'Не удалось скопировать. Выделите текст блока и скопируйте вручную.';
  }
};

export const mountCopyButtons = (): void => {
  document.querySelectorAll<HTMLButtonElement>('.copy-example').forEach((button) => {
    button.addEventListener('click', () => {
      copyExample(button).catch(() => undefined);
    });
  });
};
