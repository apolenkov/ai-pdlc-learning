export const mountScreenshotDialog = (main: HTMLElement): void => {
  // Крупный просмотр снимков: один <dialog>, Esc и кнопка закрывают, фокус возвращается на снимок.
  const shotDialog = document.createElement('dialog');
  shotDialog.className = 'shot-dialog';
  shotDialog.setAttribute('aria-label', 'Снимок крупно');
  shotDialog.innerHTML = '<button type="button" class="shot-dialog__close">Закрыть</button>';
  document.body.append(shotDialog);
  let shotOpener: HTMLElement | null = null;
  main.addEventListener('click', (event) => {
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('.step-reference__image>a')
        : null;
    if (
      !link ||
      typeof shotDialog.showModal !== 'function' ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    shotOpener = link;
    const img = link.querySelector('img');
    if (!img) return;
    // The full-size image exists only once a snapshot is opened, so the page never holds an empty img.
    const big =
      shotDialog.querySelector('img') ?? shotDialog.appendChild(document.createElement('img'));
    big.src = link.href;
    big.alt = img.alt;
    shotDialog.showModal();
    shotDialog.scrollTo(0, 0);
  });
  shotDialog.addEventListener('click', (event) => {
    if (
      event.target === shotDialog ||
      (event.target instanceof Element && event.target.closest('.shot-dialog__close'))
    )
      shotDialog.close();
  });
  shotDialog.addEventListener('close', () => shotOpener?.focus());
};
