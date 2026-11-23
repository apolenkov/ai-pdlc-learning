// Композиции из таймингов озвучки; общие index/sync/captions остаются конвейером курса.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, 'utf8'));
const stages = [
  'Намерение и план',
  'Анализ требований',
  'Архитектура и дизайн',
  'Реализация',
  'Тестирование',
  'Выпуск',
  'Наблюдение',
];
const icons = [
  'flag',
  'file-check',
  'blocks',
  'code-xml',
  'test-tube-diagonal',
  'rocket',
  'activity',
];
const icon = (name: string) =>
  readFileSync(`${root}/assets/icons/${name}.svg`, 'utf8').replace(/<!--.*?-->/gs, '').trim();
const rail = (n: number) =>
  `<div class="rail">${stages
    .slice(1)
    .map((_, i) => `<div class="mp-track" style="left:${240 + i * 240}px;width:240px"></div>`)
    .join(
      '',
    )}${stages.map((s, i) => `<div class="stop" style="left:${128 + i * 240}px"><div class="mp-node">${icon(icons[i])}</div><div class="mp-lab">${s}</div>${n >= 3 && i > 0 && i < 6 ? '<span class="agent">✦</span>' : ''}</div>`).join('')}</div>`;
const contents: Record<number, string> = {
  1: '<div class="statement">От замысла продукта — к результату и обратной связи</div>',
  2:
    ['Письма', 'Шаблон в Confluence', 'Схема в слайдах', 'Ручной регресс', 'Чек-лист']
      .map((s, i) => `<div class="wait" style="left:${170 + i * 330}px">${s}</div>`)
      .join('') + '<div class="statement">Решения приходится искать</div>',
  3: '<div class="statement">Было → <b>стало</b><p style="font-size:36px;margin-top:20px">Требования · решения · тесты — рядом с кодом в Git</p></div>',
  4: `<div class="detail" style="grid-template-columns:1fr 1fr"><div class="card"><h2>Спецификация в Git</h2><img class="shot openspec-shot" src="assets/openspec.png" alt="Учебный проект: папка изменения OpenSpec в VS Code"></div><div class="card mr"><h2>Запрос на слияние · пример</h2><p class="comment"><span class="role-tag">Аналитик</span> 💬 Уточнить правило суммы <span class="resolved">✓ решено</span></p><p class="comment"><span class="role-tag">Техлид</span> 💬 Лимит — в настройки <span class="resolved">✓ решено</span></p><div class="checks"><span class="r2-badge">✓ Одобрить</span><span style="font-size:28px">Владелец продукта</span></div><p class="accepted">Принято · версия 2</p></div></div>`,
  5: '<div class="detail" style="grid-template-columns:1fr 1fr 1fr"><div class="card"><h2>Решение записано</h2><div class="r2-file">decisions/<p><strong>└ ADR.md</strong></p></div><p style="margin-top:30px">Почему выбрали этот вариант</p></div><div class="card"><h2>Код по спецификации</h2><div class="r2-file">src/<p><strong>└ implementation.ts</strong></p></div><p style="margin-top:30px">Правило → реализация</p></div><div class="card"><h2>Те же сценарии</h2><div class="r2-file">tests/<p><strong>└ scenario.test.ts</strong></p></div><p style="margin-top:30px">Сценарий → проверка</p></div></div>',
  6: '<div class="detail" style="grid-template-columns:800px 1fr;top:430px;height:375px"><div class="card"><h2>Пайплайн выпуска</h2><div class="shot-window"><img class="pipeline-shot" data-layout-allow-overflow src="assets/pipeline.png" alt="Реальный публичный pipeline: source-checks и pages прошли"></div><div class="checks" style="margin-top:16px"><span class="sc-ok">✓ Проверки</span><span class="sc-ok">✓ Выпуск</span></div><div class="source">customdev-learning · учебный проект</div></div><div class="card"><h2>До → после</h2><div class="metrics"><div class="metric">Частота выпусков<b>↑</b></div><div class="metric">Время до прода<b>↓</b></div><div class="metric">Доля сбоев<b>↓</b></div><div class="metric">Восстановление<b>↓</b></div></div><div class="source">Направление улучшения · не результаты замера</div></div></div>',
  7: `<div class="detail card" style="display:block"><div class="team-head">${icon('users')} Два продукта · план пилота: 8 недель <span class="mp-pin" style="margin-left:auto">A · B</span></div><div class="roadmap">${['Встречи', 'Аудит + исходный замер', 'Перечень изменений', 'Обучение по ролям', 'Внедрение по волнам', 'Повторный замер метрик'].map((s, i) => `<div class="road-stop"><b>${i + 1}</b>${s}</div>`).join('')}</div><p style="margin-top:25px">Старт → работа с двумя продуктами → решение на итоговой встрече</p></div>`,
  8: `<div class="detail roles">${[
    ['Аналитик', 'Анализ требований'],
    ['Владелец продукта', 'Намерение · наблюдение'],
    ['Архитектор', 'Архитектура и дизайн'],
    ['Разработчик', 'Реализация'],
    ['QA', 'Тестирование'],
    ['Техлид', 'Выпуск'],
  ]
    .map(([role, stage]) => `<div class="role"><b>${role}</b><span>${stage}</span></div>`)
    .join('')}</div>`,
  9: `<div class="detail" style="display:block"><div class="card sc-next">Пройти аудит этапа ${icon('arrow-right')}</div><div class="card sc-next" style="margin-top:20px">Страница команды развития ${icon('arrow-right')}</div><div class="brand" style="margin-top:22px"><img src="assets/brand.svg" alt="">Анализ с ИИ-агентами</div></div>`,
};
assert.equal(
  scenes.filter((s: { overlay?: boolean }) => !s.overlay).length,
  9,
  'Все девять сцен сценария обязательны',
);
for (const scene of scenes) {
  const id = scene.id ?? String(scene.n).padStart(2, '0');
  let body: string;
  if (scene.overlay) {
    body = `<div class="chapter-card"><div class="chapter-number">Часть ${id.slice(1)}</div><div class="chapter-name">${scene.of === 4 ? 'Анализ · OpenSpec · MR' : scene.chapter}</div></div><script>(() => {const tl=gsap.timeline({paused:true});const card=document.querySelector('[data-composition-id="scene-${id}"] .chapter-card');tl.fromTo(card,{autoAlpha:1},{autoAlpha:0,duration:.3},1.7);window.__timelines['scene-${id}']=tl;})();</script>`;
  } else {
    assert(contents[scene.n], 'Нет композиции для сцены');
    body = `<div class="p7"><h1>${scene.n === 4 ? 'Анализ · OpenSpec · MR' : scene.title}</h1>${rail(scene.n)}${contents[scene.n].replace('<br class="unused">', ' ')}</div><script>Landing('${id}', ${scene.duration});</script>`;
  }
  writeFileSync(
    `${root}/compositions/scene-${id}.html`,
    `<template id="scene-${id}-template"><link rel="stylesheet" href="kit/landing.css"><div data-composition-id="scene-${id}" data-width="1920" data-height="1080" data-duration="${scene.duration}">${body}</div></template>\n`,
  );
}
console.log(`Compositions: ${scenes.length}`);
