/* Полоса PDLC на компонентах курса; Kit владеет озвученными субтитрами. */
window.Landing = function (id, duration) {
  const S = Kit.scene(id), tl = S.tl, n = Number(id);
  const q = (s) => S.root.querySelector(s);
  const all = (s) => [...S.root.querySelectorAll(s)];
  const color = (name) => Kit.token('--k-' + name);
  const reveal = (el, at) => {
    gsap.set(el, { autoAlpha: 0 });
    tl.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'power2.out', immediateRender: false }, at);
  };
  const stops = all('.stop'), nodes = all('.mp-node'), links = all('.mp-track');
  const stars = all('.agent');
  if ([3, 4, 7, 8].includes(n)) reveal(q('.p7'), 2);
  if (n >= 4) gsap.set(q('.rail'), { y: -160 });
  if (n >= 3) {
    gsap.set(nodes, { borderColor: color('ok'), color: color('ok') });
    gsap.set(links, { backgroundColor: color('ok') });
  }
  const focus = (indices, at, off) => indices.forEach((i) => {
    tl.to(nodes[i], { backgroundColor: color('panel-2'), boxShadow: '0 0 0 8px ' + color('ok-tint'), scale: 1.12, duration: .3 }, at);
    if (off) tl.to(nodes[i], { backgroundColor: color('panel-2'), boxShadow: '0 0 0 0px transparent', scale: 1, duration: .3 }, off);
  });
  if (n === 1) {
    const anchors = ['намерение', 'анализ', 'архитектура', 'реализация', 'тестирование', 'выпуск', 'наблюдение'];
    stops.forEach((el, i) => reveal(el, S.t(anchors[i])));
    links.forEach((el, i) => reveal(el, S.t(anchors[i])));
  }
  if (n === 2) {
    stops.forEach((el, i) => tl.to(el, { x: (i - 3) * 16, duration: .8, ease: 'power2.inOut' }, .1));
    links.forEach((el, i) => tl.to(el, { x: (i - 3) * 16, scaleX: 1.1, duration: .8 }, .1));
    all('.wait').forEach((el, i) => reveal(el, S.t(['письма', 'шаблоны', 'шаблоны', 'ожидание', 'согласований'][i])));
    reveal(q('.statement'), S.t('искать') - .2);
  }
  if (n === 3) {
    const at = 2; // Карточка главы покрывает первые 2 с речи.
    stops.forEach((el, i) => tl.fromTo(el, { x: (i - 3) * 16 }, { x: 0, duration: .8, immediateRender: false }, at));
    links.forEach((el, i) => tl.fromTo(el, { x: (i - 3) * 16, scaleX: 1.1, backgroundColor: color('line') }, { x: 0, scaleX: 1, backgroundColor: color('ok'), duration: .8, immediateRender: false }, at));
    nodes.forEach((el, i) => tl.fromTo(el, { borderColor: color('line'), color: color('text-2') }, { borderColor: color('ok'), color: color('ok'), duration: .3, immediateRender: false }, at + i * .16));
    stars.forEach((el, i) => reveal(el, Math.max(at + 1.2, S.t('ИИ-агент')) + i * .08));
    reveal(q('.statement'), at + 1.4);
  }
  if (n === 4) {
    focus([1], 2);
    all('.comment').forEach((el, i) => reveal(el, 2.05 + i * .6));
    reveal(q('.resolved'), Math.max(3.3, S.t('владелец')));
    reveal(q('.checks'), S.t('одобряет'));
    reveal(q('.accepted'), S.t('версия'));
  }
  if (n === 5) {
    const ats = ['Архитектура', 'Реализация', 'Тестирование'].map((s) => S.t(s));
    all('.card').forEach((el, i) => {
      focus([i + 2], ats[i], ats[i + 1]);
      tl.to(el, { borderColor: color('ok'), duration: .3 }, ats[i]);
    });
  }
  if (n === 6) {
    focus([5], 0, S.t('наблюдение')); focus([6], S.t('наблюдение'));
    all('.sc-ok').forEach((el, i) => reveal(el, .2 + i * .25));
    all('.metric').forEach((el, i) => reveal(el, S.t(['частота', 'время до', 'доля', 'время восстановления'][i])));
  }
  if (n === 7) {
    tl.fromTo(q('.rail'), { y: -160 }, { y: -200, duration: .6, immediateRender: false }, 2);
    all('.road-stop').forEach((el, i) => reveal(el, 2.2 + i * .12));
    reveal(q('.mp-pin'), S.t('двух пилотных'));
  }
  if (n === 8) {
    gsap.set(q('.rail'), { y: -200 });
    const ats = [Math.max(2, S.t('Аналитик')), S.t('Для каждого'), S.t('Для каждого') + 1.2, S.t('Для каждого') + 2.4, S.t('Для каждого') + 3.6, S.t('Для каждого') + 4.8];
    const targets = [[1], [0, 6], [2], [3], [4], [5]];
    all('.role').forEach((el, i) => {
      tl.to(el, { borderColor: color('ok'), duration: .25 }, ats[i]);
      if (i < 5) tl.to(el, { borderColor: color('line'), duration: .25 }, ats[i + 1]);
      focus(targets[i], ats[i], ats[i + 1]);
    });
  }
  if (n === 9) gsap.set(q('.rail'), { y: -200 });
  Kit.subtitles(S, {});
  S.finish(duration);
};
