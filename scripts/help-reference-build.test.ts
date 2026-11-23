import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildHelpReferencePages } from './help-reference/build.ts';
import { helpReferenceCatalog } from './help-reference/catalog.ts';
import type { HelpReferenceCatalog } from './help-reference/types.ts';

await test('the glossary contains the course terms and counts the rows in each section and index link', async () => {
  const { glossaryGroups, sources } = helpReferenceCatalog;
  const terms = glossaryGroups.flatMap(({ entries }) => entries.map(({ term }) => term));
  assert.equal(new Set(terms).size, 77);
  assert.ok(terms.includes('OpenSpec'));
  for (const term of [
    'Wiki.js',
    'Document Cloud',
    'HiveTrace',
    'ИТ0–ИТ4',
    'ИБ0–ИБ4',
    'I0–I4',
    'A0–A4 (ИИ)',
    'M0–M4',
    'Диаграмма Ганта',
    'Основное средство',
    'Дополнительное средство',
    'Справочно',
  ])
    assert.ok(!terms.includes(term), term);
  // The retired names and scale codes must not come back on any page of the course, not only as a term.
  const pages = (await readdir('docs/pages/sdlc-development', { recursive: true })).filter((file) =>
    file.endsWith('.html'),
  );
  assert.ok(pages.length > 20, `${pages.length} pages`);
  for (const page of pages) {
    const text = await readFile(`docs/pages/sdlc-development/${page}`, 'utf8');
    assert.doesNotMatch(
      text,
      /Wiki\.js|Document Cloud|HiveTrace|Диаграмма Ганта|ИТ[0-4]|ИБ[0-4]/u,
      page,
    );
  }

  const html = await readFile('docs/pages/sdlc-development/glossary.html', 'utf8');
  assert.equal(Array.from(html.matchAll(/<dt>/gu)).length, 77);
  assert.match(html, /<h2 id="glossary-table-title">77 терминов в пяти разделах<\/h2>/u);
  const counts = [10, 30, 15, 5, 17];
  assert.deepEqual(
    glossaryGroups.map(({ entries }) => entries.length),
    counts,
  );
  const sections = [
    ...html.matchAll(/<section id="glossary-group-([^"]+)"[^>]*>([^]*?)<\/section>/gu),
  ];
  assert.deepEqual(
    sections.map(([, key]) => key),
    glossaryGroups.map(({ key }) => key),
  );
  for (const [, key, body] of sections) {
    assert.ok(body && key);
    const count = [...body.matchAll(/<dt>/gu)].length;
    const badge = /<\/div><span>(\d+ [^<]+)<\/span><\/header>/u.exec(body)?.[1];
    assert.ok(badge);
    assert.equal(parseInt(badge, 10), count, key);
    const group = glossaryGroups.find((group) => group.key === key);
    assert.ok(group);
    assert.ok(
      html.includes(
        `href="#glossary-group-${key}"><span>${group.label}</span><small>${badge}</small>`,
      ),
      key,
    );
  }
  assert.deepEqual(
    sources.map(({ label }) => label),
    [
      'IIBA: Global State of Business Analysis 2026',
      'DORA: Balancing AI tensions',
      'Thoughtworks: Agentic SDLC',
      'OWASP: State of Agentic AI Security',
      'NIST AI Risk Management Framework',
      'OpenAI: GPT-6 model guidance',
    ],
  );
  for (const { url } of sources)
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`), url);
});

await test('the tech lead and the architect stay two cards with the current confirmations', () => {
  const techLead = helpReferenceCatalog.roles.find((role) => role.name === 'Техлид');
  const architect = helpReferenceCatalog.roles.find((role) => role.name === 'Архитектор');
  assert.ok(techLead && architect, 'both technical cards exist');
  assert.equal(
    techLead.confirms,
    'Принимает запрос с кодом; запрос с требованиями сливает после одобрения владельца продукта.',
  );
  assert.equal(
    architect.confirms,
    'Пишет design.md; утверждает ADR и исключения из принятого пути.',
  );
  assert.match(techLead.responsibility, /право слияния в защищённую ветку/u);
  assert.match(architect.responsibility, /Устройство решения при изменении данных/u);
});

await test('unchanged roles keep their current names and reader-facing cards', () => {
  const expected = new Map([
    ['Представитель бизнеса / заказчик', 'Потребность, бизнес-контекст и ожидаемый эффект.'],
    ['Аналитик', 'Качество, полнота и трассируемость требований.'],
    ['Разработчик', 'Код, тесты и технические доказательства.'],
    [
      'Инженер качества (QA)',
      'Полнота проверок, качество доказательств и решение о результате тестирования.',
    ],
    ['Владелец данных и контекста', 'Состав, актуальность, классы данных и права на источники.'],
    [
      'Владелец оценки качества ИИ',
      'Представительный набор данных, критерии, сравнение моделей и контроль деградации.',
    ],
    [
      'Информационная безопасность',
      'Классы данных, права, границы сети, инструменты и действия повышенного риска.',
    ],
  ]);
  for (const [name, responsibility] of expected) {
    const role = helpReferenceCatalog.roles.find((candidate) => candidate.name === name);
    assert.ok(role, `${name} is preserved`);
    assert.equal(role.responsibility, responsibility, `${name} keeps its responsibility`);
  }
});

await test('invalid catalog entries fail before either reference page is written', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'course-help-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { roles, glossaryGroups } = helpReferenceCatalog;
  const [role] = roles;
  const [group] = glossaryGroups;
  assert.ok(role && group);
  const cases: [Partial<HelpReferenceCatalog>, RegExp][] = [
    [{ roles: [{ ...role, responsibility: ' ' }] }, /empty visible field/u],
    [{ roles: [...roles, role] }, /duplicate role name/u],
    [{ roles: [{ ...role, group: 'Unknown' }] }, /unknown group/u],
    [{ glossaryGroups: [...glossaryGroups, group] }, /duplicate glossary group/u],
    [{ glossaryGroups: [{ ...group, entries: [] }] }, /empty glossary group/u],
    [
      { glossaryGroups: [...glossaryGroups, { ...group, key: 'another' }] },
      /duplicate glossary term/u,
    ],
    [{ sources: [{ label: 'Example', url: 'http://example.org' }] }, /non-https/u],
  ];
  for (const [change, error] of cases) {
    await assert.rejects(
      buildHelpReferencePages(directory, { ...helpReferenceCatalog, ...change }),
      error,
    );
    assert.deepEqual(await readdir(directory), []);
  }
});

await test('the builder escapes visible text in both pages', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'course-help-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const text = '<example> & "label"';
  const [role] = helpReferenceCatalog.roles;
  const [group] = helpReferenceCatalog.glossaryGroups;
  assert.ok(role && group);
  await buildHelpReferencePages(directory, {
    ...helpReferenceCatalog,
    roles: [{ ...role, responsibility: text }],
    glossaryGroups: [{ ...group, entries: [{ term: 'Example', definition: text }] }],
  });
  for (const file of ['glossary.html', 'roles.html']) {
    const html = await readFile(join(directory, file), 'utf8');
    assert.ok(html.includes('&lt;example&gt; &amp; &quot;label&quot;'));
    assert.ok(!html.includes(text));
  }
});
