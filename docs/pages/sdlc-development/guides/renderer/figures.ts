// Enhance only complete figures; all panes remain visible until this point.
const figureSelector = '[data-figure-pick], [data-figure-stepper]';
const owned = <T extends Element>(figure: HTMLElement, selector: string): T[] =>
  [...figure.querySelectorAll<T>(selector)].filter(
    (node) => node.closest(figureSelector) === figure,
  );
const show = (panes: HTMLElement[], key: string): void =>
  panes.forEach((pane) => {
    pane.hidden = pane.dataset.pane !== key;
  });

const enhancePicker = (figure: HTMLElement, panes: HTMLElement[]): void => {
  const picks = owned<HTMLElement>(figure, '[data-pick]');
  if (
    !picks.length ||
    picks.some((pick) => !panes.some((pane) => pane.dataset.pane === pick.dataset.pick))
  )
    return;
  const select = (pick: HTMLElement) => {
    show(panes, pick.dataset.pick!);
    picks.forEach((item) => item.setAttribute('aria-pressed', String(item === pick)));
  };
  picks.forEach((pick) => {
    const visibleLabel = pick.textContent?.trim().replace(/\s+/gu, ' ');
    const description = pick.getAttribute('aria-label');
    if (visibleLabel && description && !description.includes(visibleLabel)) {
      pick.setAttribute('aria-label', `${visibleLabel} · ${description}`);
    }
    if (!(pick instanceof HTMLButtonElement)) {
      pick.setAttribute('role', 'button');
      pick.setAttribute('tabindex', '0');
      pick.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(pick);
        }
      });
    }
    pick.addEventListener('click', () => select(pick));
  });
  figure.classList.add('is-enhanced');
  select(picks.find((pick) => pick.getAttribute('aria-pressed') === 'true') ?? picks[0]!);
};

const enhanceStepper = (figure: HTMLElement, panes: HTMLElement[]): void => {
  const prev = owned<HTMLButtonElement>(figure, 'button[data-step-prev]')[0];
  const next = owned<HTMLButtonElement>(figure, 'button[data-step-next]')[0];
  const count = owned<HTMLElement>(figure, '[data-step-count]')[0];
  const ordered = [...panes].sort((a, b) => Number(a.dataset.pane) - Number(b.dataset.pane));
  if (
    !prev ||
    !next ||
    !count ||
    ordered.some((pane, index) => pane.dataset.pane !== String(index + 1))
  )
    return;
  let index = 0;
  const update = () => {
    show(panes, ordered[index]!.dataset.pane!);
    count.textContent = `${index + 1} из ${ordered.length}`;
    prev.disabled = index === 0;
    next.disabled = index === ordered.length - 1;
  };
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  prev.addEventListener('click', () => {
    index = Math.max(0, index - 1);
    update();
  });
  next.addEventListener('click', () => {
    index = Math.min(ordered.length - 1, index + 1);
    update();
  });
  figure.classList.add('is-enhanced');
  update();
};

export const enhanceFigures = (main: HTMLElement): void => {
  main.querySelectorAll<HTMLElement>(figureSelector).forEach((figure) => {
    const panes = owned<HTMLElement>(figure, '[data-pane]');
    if (!panes.length) return;
    if (figure.hasAttribute('data-figure-pick')) enhancePicker(figure, panes);
    else enhanceStepper(figure, panes);
  });
};
