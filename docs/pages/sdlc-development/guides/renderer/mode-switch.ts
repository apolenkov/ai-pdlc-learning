// Entry-mode А/Б switchers: one remembered choice per guide; without JS both
// variants stay visible as two sections, like figure panes before enhancement.
export const mountModeSwitches = (main: HTMLElement, stageId: string): void => {
  const switches = [...main.querySelectorAll<HTMLElement>('[data-mode-switch]')];
  if (!switches.length) return;
  const key = `guide-mode:${stageId}`;
  const apply = (mode: string): void => {
    main.dataset.mode = mode;
    switches.forEach((sw) =>
      sw
        .querySelectorAll<HTMLButtonElement>('button[data-mode]')
        .forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode))),
    );
  };
  switches.forEach((sw) =>
    sw.addEventListener('click', (event) => {
      const btn =
        event.target instanceof HTMLElement
          ? event.target.closest<HTMLButtonElement>('button[data-mode]')
          : null;
      if (!btn?.dataset.mode) return;
      try {
        localStorage.setItem(key, btn.dataset.mode);
      } catch {
        /* private mode: memory is optional */
      }
      apply(btn.dataset.mode);
    }),
  );
  main.classList.add('mode-enhanced');
  let stored = 'a';
  try {
    stored = localStorage.getItem(key) === 'b' ? 'b' : 'a';
  } catch {
    /* ignore */
  }
  apply(stored);
};
