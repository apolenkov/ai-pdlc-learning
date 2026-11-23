import assert from 'node:assert/strict';
import test from 'node:test';
import { renderGuide } from './learner-guide-test-support.ts';
import { guideContent } from './guide-content.ts';

await test('guide terms live only in the glossary and retain the stage-specific terms', async () => {
  const transferredTerms: Record<string, string[]> = {
    '0': ['PDLC', 'Спецификация', 'Техлид', 'Метарепозиторий', 'Практика курса'],
    sdd: ['Стандарт анализа', 'Метарепозиторий'],
    delivery: ['Store (хранилище требований)'],
    '4-new': ['Архив'],
    '4-legacy': ['baseline-current-state'],
    i1: ['intent.md', 'Метрика'],
    i2: ['Граница', 'Адресат'],
    i3: ['План изменений', 'Запасной ход'],
    i4: ['Линтер', 'Рецензент'],
    '3-star': [
      'Store',
      'Закреплённая версия сервиса (service pin)',
      'Инвентаризация (inventory)',
      'planning-provenance',
      'delta',
      'bootstrap',
      'Снимок (snapshot)',
    ],
  };
  for (const id of Object.keys(guideContent.stages)) {
    const html = await renderGuide(id);
    const card = html.match(
      /<details class="card card--wide beginner-extra">[\s\S]*?<\/details>/u,
    )?.[0];
    assert.ok(card, `${id}: supplementary card remains`);
    // TASK-904: a stage without official references shows no empty «Официальные справки» heading.
    const hasReferences = (guideContent.guideReferences[id] ?? []).length > 0;
    assert.match(
      card,
      hasReferences
        ? /<summary>Роли, ограничения и справки<\/summary>/u
        : /<summary>Роли и ограничения<\/summary>/u,
    );
    assert.doesNotMatch(card, /Слова простыми словами|route-terms/u);
    for (const heading of ['Кто что делает', 'Ограничения']) {
      assert.ok(card.includes(`<h3>${heading}</h3>`), `${id}: ${heading} remains`);
    }
    assert.equal(
      card.includes('<h3>Официальные справки</h3>'),
      hasReferences,
      `${id}: «Официальные справки» only with references`,
    );
    assert.doesNotMatch(html, /class="route-terms"/u);
    const glossary = html.match(/<section[^>]*id="course-terms">[\s\S]*?<\/section>/u)?.[0];
    assert.ok(glossary, `${id}: glossary remains`);
    const terms = [...glossary.matchAll(/<dt>(.*?)<\/dt>/gu)].map((match) => match[1] ?? '');
    assert.equal(
      new Set(terms.map((term) => term.toLowerCase())).size,
      terms.length,
      `${id}: no duplicate terms`,
    );
    for (const term of transferredTerms[id] ?? []) {
      assert.ok(terms.includes(term), `${id}: glossary retains ${term}`);
    }
    assert.doesNotMatch(glossary, /Обозначения:|шаги 1–3 курса — подготовка/u);
  }
});

/** Rule 590: only the product owner approves on the latest version; analysts and tech leads comment. Approval is not acceptance. */
const APPROVAL_MEANING =
  'подтверждение владельца продукта на последней версии; комментарии проверяющих одобрением не считаются';

await test('every step dictionary that names «Одобрение» explains it by the product-owner rule', async () => {
  const definedIn: string[] = [];
  for (const id of Object.keys(guideContent.stages)) {
    const html = await renderGuide(id);
    const glossary = html.match(/<section[^>]*id="course-terms">[\s\S]*?<\/section>/u)?.[0];
    assert.ok(glossary, `${id}: glossary remains`);
    const meaning = /<dt>Одобрение<\/dt><dd>(.*?)<\/dd>/u.exec(glossary)?.[1];
    if (meaning === undefined) continue;
    definedIn.push(id);
    assert.equal(meaning, `${APPROVAL_MEANING}.`, `${id}: the approval definition`);
  }
  assert.deepEqual(definedIn, ['0', '3', 'i4']);
});
