import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLearnerGuideContract } from './learner-guide-contract.ts';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';

// A minimal DOM event harness stores attributes and invokes the real renderer listeners.
class Node {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  listeners = new Map<string, (event: { key: string; preventDefault: () => void }) => void>();
  selectors = new Map<string, Node[]>();
  classes = new Set<string>();
  classList = {
    add: (name: string) => {
      this.classes.add(name);
    },
  };
  owner: Node = this;
  childNodes: Node[] = [];
  hidden = false;
  disabled = false;
  textContent = '';
  querySelectorAll(selector: string) {
    return this.selectors.get(selector) ?? [];
  }
  closest() {
    return this.owner;
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  addEventListener(
    name: string,
    listener: (event: { key: string; preventDefault: () => void }) => void,
  ) {
    this.listeners.set(name, listener);
  }
  fire(name: string, key = '') {
    let prevented = false;
    this.listeners.get(name)?.({
      key,
      preventDefault: () => {
        prevented = true;
      },
    });
    return prevented;
  }
}
class Button extends Node {}

const authoredFigure = (html: string) => {
  const container = new Node();
  if (html.includes('data-figure-pick')) container.setAttribute('data-figure-pick', '');
  const nodes = [...html.matchAll(/<(button|g|section|span)\b[^>]*>/gu)].map(([tag, name]) => {
    const node = name === 'button' ? new Button() : new Node();
    node.owner = container;
    for (const [, key, value] of tag.matchAll(/\b(data-[\w-]+|aria-pressed)(?:="([^"]*)")?/gu)) {
      node.setAttribute(key!, value ?? '');
      if (key === 'data-pick') node.dataset.pick = value!;
      if (key === 'data-pane') node.dataset.pane = value!;
    }
    return node;
  });
  container.selectors.set(
    '[data-pick]',
    nodes.filter((node) => node.hasAttribute('data-pick')),
  );
  container.selectors.set(
    '[data-pane]',
    nodes.filter((node) => node.hasAttribute('data-pane')),
  );
  container.selectors.set(
    'button[data-step-prev]',
    nodes.filter((node) => node instanceof Button && node.hasAttribute('data-step-prev')),
  );
  container.selectors.set(
    'button[data-step-next]',
    nodes.filter((node) => node instanceof Button && node.hasAttribute('data-step-next')),
  );
  container.selectors.set(
    '[data-step-count]',
    nodes.filter((node) => node.hasAttribute('data-step-count')),
  );
  return container;
};

const assertAuthoredFigureControls = async () => {
  const guides = await loadGuides();

  const roles = authoredFigure(guides['0'].steps[1]!.figure!.html);
  const life = authoredFigure(guides['0'].steps[4]!.figure!.html);
  await renderGuide('0', undefined, {
    containers: [roles, life],
    classes: { HTMLButtonElement: Button },
  });
  assert.ok(roles.classes.has('is-enhanced') && life.classes.has('is-enhanced'));
  for (const [index, role] of roles.querySelectorAll('[data-pick]').entries()) {
    if (index === 0) role.fire('click');
    else assert.equal(role.fire('keydown', index % 2 ? 'Enter' : ' '), true);
    assert.equal(role.getAttribute('aria-pressed'), 'true');
    for (const pane of roles.querySelectorAll('[data-pane]')) {
      assert.equal(pane.hidden, pane.dataset.pane !== role.dataset.pick);
    }
  }
  const lifePanes = life.querySelectorAll('[data-pane]');
  const lifeNext = life.querySelectorAll('button[data-step-next]')[0]!;
  const lifePrev = life.querySelectorAll('button[data-step-prev]')[0]!;
  const lifeCount = life.querySelectorAll('[data-step-count]')[0]!;
  for (let index = 0; index < 5; index += 1) {
    assert.equal(lifeCount.textContent, `${index + 1} из 5`);
    assert.deepEqual(
      lifePanes.map((pane) => pane.hidden),
      lifePanes.map((_, position) => position !== index),
    );
    lifeNext.fire('click');
  }
  assert.equal(lifeNext.disabled, true);
  assert.equal(lifeCount.textContent, '5 из 5');
  for (let index = 0; index < 5; index += 1) lifePrev.fire('click');
  assert.equal(lifeCount.textContent, '1 из 5');
  assert.equal(lifePrev.disabled, true);
};

const assertSyntheticFigureControls = async () => {
  const pick = new Node();
  pick.attributes.set('data-figure-pick', '');
  const choices = [new Button(), new Node()];
  const pickPanes = [new Node(), new Node()];
  choices.forEach((node, index) => {
    node.owner = pick;
    node.dataset.pick = String(index + 1);
  });
  pickPanes.forEach((node, index) => {
    node.owner = pick;
    node.dataset.pane = String(index + 1);
  });
  pick.selectors.set('[data-pick]', choices);
  pick.selectors.set('[data-pane]', pickPanes);
  const stepper = new Node();
  const prev = new Button();
  const next = new Button();
  const count = new Node();
  const stepPanes = [new Node(), new Node(), new Node()];
  for (const node of [prev, next, count, ...stepPanes]) node.owner = stepper;
  stepPanes.forEach((node, index) => {
    node.dataset.pane = String(index + 1);
  });
  stepper.selectors.set('[data-pane]', stepPanes);
  stepper.selectors.set('button[data-step-prev]', [prev]);
  stepper.selectors.set('button[data-step-next]', [next]);
  stepper.selectors.set('[data-step-count]', [count]);
  await renderGuide('0', undefined, {
    containers: [pick, stepper],
    classes: { HTMLButtonElement: Button },
  });
  assert.ok(pick.classes.has('is-enhanced') && stepper.classes.has('is-enhanced'));
  assert.deepEqual(
    pickPanes.map((pane) => pane.hidden),
    [false, true],
  );
  assert.equal(choices[1]!.getAttribute('role'), 'button');
  assert.equal(choices[1]!.getAttribute('tabindex'), '0');
  assert.equal(choices[1]!.fire('keydown', ' '), true);
  assert.deepEqual(
    pickPanes.map((pane) => pane.hidden),
    [true, false],
  );
  assert.equal(choices[1]!.getAttribute('aria-pressed'), 'true');
  assert.equal(choices[1]!.fire('keydown', 'Enter'), true);
  choices[0]!.fire('click');
  assert.deepEqual(
    pickPanes.map((pane) => pane.hidden),
    [false, true],
  );
  assert.equal(
    choices[0]!.listeners.has('keydown'),
    false,
    'native buttons use their browser keyboard activation',
  );
  assert.equal(prev.disabled, true);
  assert.equal(count.textContent, '1 из 3');
  next.fire('click');
  assert.deepEqual(
    stepPanes.map((pane) => pane.hidden),
    [true, false, true],
  );
  next.fire('click');
  next.fire('click');
  assert.equal(count.textContent, '3 из 3');
  assert.equal(next.disabled, true);
  prev.fire('click');
  prev.fire('click');
  prev.fire('click');
  assert.equal(count.textContent, '1 из 3');
  assert.equal(prev.disabled, true);
  assert.equal(count.getAttribute('aria-live'), 'polite');
  assert.deepEqual(
    pickPanes.map((pane) => pane.hidden),
    [false, true],
    'the second figure leaves the first figure unchanged',
  );
};

await test('figure contract rejects scripts and inaccessible SVGs', async () => {
  const guides = await loadGuides();
  assertLearnerGuideContract(guides);
  const original = guides['0'].steps[0]!.figure!.html;
  for (const [html, reason] of [
    [original + '<script>alert(1)</script>', /figures must not contain scripts/u],
    [original.replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/u, ''), /figure SVG needs/u],
    ['<figure><p>Схема</p></figure>', /figures must contain an SVG/u],
  ] as const) {
    guides['0'].steps[0]!.figure = { html };
    assert.throws(() => assertLearnerGuideContract(guides), reason);
  }
  guides['0'].steps[0]!.figure = {
    html: '<figure><svg role="img" aria-label="Запрос становится результатом"><rect width="10" height="10"/></svg></figure>',
  };
  assertLearnerGuideContract(guides);
});

await test('figure controls switch owned panels, support role-button keys and stop at stepper boundaries', async () => {
  await assertSyntheticFigureControls();

  // Exercise the authored course markup as well: mismatched role keys or an
  // incomplete stepper silently leave a figure unenhanced in the real page.
  await assertAuthoredFigureControls();
});

await test('standalone guide diagrams render inside keyboard-scrollable viewports', async () => {
  for (const id of ['0', '0a', '1', '2', '3', '4-team']) {
    const html = await renderGuide(id);
    assert.doesNotMatch(
      html,
      /<figure\b[^>]*>\s*<svg\b/u,
      `${id}: no diagram shrinks to the phone width`,
    );
    assert.match(html, /class="course-figure__viewport"[^>]*tabindex="0"/u);
    assert.doesNotMatch(html, /class="course-figure__viewport"(?![^>]*tabindex="0")/u);
    assert.doesNotMatch(
      html,
      /class="course-figure__viewport"[^>]*>\s*<div class="course-figure__viewport"/u,
    );
  }
});
