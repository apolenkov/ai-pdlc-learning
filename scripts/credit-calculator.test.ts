import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = stripTypeScriptTypes(
  readFileSync(
    new URL('../docs/pages/sdlc-development/examples/credit-calculator.ts', import.meta.url),
    'utf8',
  ),
);
const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function calculator(missingSelector?: string) {
  const element = (value = '') => ({
    value,
    textContent: '',
    attributes: new Map<string, string>(),
    focused: false,
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    },
    removeAttribute(name: string) {
      this.attributes.delete(name);
    },
    focus() {
      this.focused = true;
    },
  });
  const fields = { principal: element('3000000'), rate: element('16'), months: element('240') };
  const output = element();
  output.textContent = '—';
  output.setAttribute('data-state', 'empty');
  const error = element();
  const context = element();
  const summaries = [element(), element(), element()];
  let submit: (event: { preventDefault(): void }) => void = () => {
    throw new Error('Submit listener missing');
  };
  const form = {
    addEventListener(name: string, handler: typeof submit) {
      assert.equal(name, 'submit');
      submit = handler;
    },
    prevented: 0,
    requestSubmit() {
      submit({
        preventDefault: () => {
          form.prevented += 1;
        },
      });
    },
  };
  const elements: Record<string, unknown> = {
    '#calculator': form,
    '#payment': output,
    '#payment-context': context,
    '#form-error': error,
    '#principal': fields.principal,
    '#rate': fields.rate,
    '#months': fields.months,
    '#summary-principal': summaries[0],
    '#summary-rate': summaries[1],
    '#summary-months': summaries[2],
  };
  runInNewContext(source, {
    document: {
      querySelector: (selector: string) =>
        selector === missingSelector ? null : elements[selector],
    },
    // Stryker's mutation switch reads process.env inside the sandbox context; without it no mutant is ever active.
    process: { env: process.env },
  });
  return {
    form,
    fields,
    output,
    error,
    context,
    summaries,
    calculate(principal: number, annualRate: number, months: number) {
      fields.principal.value = String(principal);
      fields.rate.value = String(annualRate);
      fields.months.value = String(months);
      form.requestSubmit();
    },
  };
}

await test('public submit keeps ordinary, zero-rate and tiny positive-rate payments rounded to rubles', () => {
  const app = calculator();
  assert.equal(
    app.output.textContent,
    '—',
    'opening the calculator must wait for the first submit',
  );
  assert.deepEqual(
    Object.values(app.fields).map((field) => field.value),
    ['3000000', '16', '240'],
  );
  app.calculate(120_000, 0, 1.5);
  assert.equal(
    app.output.textContent,
    '—',
    'an error before the first calculation must leave the placeholder',
  );
  assert.equal(app.error.textContent, 'Проверьте введённые значения');
  for (const annualRate of [0, 1e-13, Number.MIN_VALUE]) {
    app.calculate(120_000, annualRate, 12);
    assert.equal(app.output.textContent, money.format(10_000));
    assert.equal(app.error.textContent, '');
  }
  app.calculate(3_000_000, 16, 240);
  assert.equal(app.output.textContent, money.format(41_738));
});

await test('public submit avoids intermediate overflow for a representable large payment', () => {
  const app = calculator();
  app.calculate(Number.MAX_VALUE, 100, 600);
  assert.equal(app.error.textContent, '');
  assert.equal(app.output.textContent, money.format(Number.MAX_VALUE * (100 / 1200)));
  assert.doesNotMatch(app.output.textContent, /NaN|Infinity|∞/u);
});

await test('public submit preserves the previous result on invalid input and overflow, then recovers', () => {
  const app = calculator();
  app.calculate(120_000, 0, 12);
  const previousSummary = app.summaries.map((summary) => summary.textContent);
  const previousContext = app.context.textContent;
  for (const [principal, rate, months, invalidField] of [
    [120_000, 0, 1.5, 'months'],
    [120_000, 0, 0, 'months'],
    [120_000, -1, 12, 'rate'],
    [120_000, 101, 12, 'rate'],
    [0, 0, 12, 'principal'],
    [Number.MAX_VALUE, 100, 1, 'principal'],
  ] as const) {
    app.calculate(principal, rate, months);
    assert.equal(app.output.textContent, money.format(10_000));
    assert.deepEqual(
      app.summaries.map((summary) => summary.textContent),
      previousSummary,
    );
    assert.equal(app.context.textContent, previousContext);
    assert.equal(app.error.textContent, 'Проверьте введённые значения');
    for (const [name, field] of Object.entries(app.fields)) {
      assert.equal(
        field.attributes.get('aria-invalid'),
        name === invalidField ? 'true' : undefined,
      );
    }
    assert.equal(app.fields[invalidField].focused, true);
  }
  app.calculate(120_000, 0, 12);
  assert.equal(app.output.textContent, money.format(10_000));
  assert.equal(app.error.textContent, '');
  for (const field of Object.values(app.fields))
    assert.equal(field.attributes.has('aria-invalid'), false);
});

await test('public submit describes the accepted rate without rounding it to another rate', () => {
  const app = calculator();
  for (const [rate, expected] of [
    [0.04, '0,04%'],
    [16.25, '16,25%'],
    [0, '0%'],
    [100, '100%'],
    [1e-13, '1E-13%'],
  ] as const) {
    app.calculate(3_000_000, rate, 240);
    assert.equal(app.error.textContent, '');
    const rateSummary = app.summaries[1];
    assert.ok(rateSummary);
    assert.equal(rateSummary.textContent, expected);
  }
  app.calculate(3_000_000, 0.04, 240);
  assert.equal(app.output.textContent, money.format(12_550));
});

await test('public submit stops the browser navigation and shows the described context and months', () => {
  const app = calculator();
  app.calculate(120_000, 0, 12);
  assert.equal(app.form.prevented, 1);
  assert.equal(
    app.context.textContent,
    'Сумма делится на количество месяцев без начисления процентов.',
  );
  assert.equal(app.summaries[2]?.textContent, '12 мес.');
  app.calculate(3_000_000, 16, 240);
  assert.equal(app.form.prevented, 2);
  assert.equal(
    app.context.textContent,
    'Расчёт по аннуитетной формуле с\u00a0постоянным платежом.',
  );
  assert.equal(app.summaries[0]?.textContent, money.format(3_000_000));
  assert.equal(app.summaries[2]?.textContent, '240 мес.');
});

await test('public submit rejects a blank rate instead of reading it as zero', () => {
  const app = calculator();
  app.calculate(3_000_000, 16, 240);
  app.fields.rate.value = '   ';
  app.form.requestSubmit();
  assert.equal(app.error.textContent, 'Проверьте введённые значения');
  assert.equal(app.fields.rate.attributes.get('aria-invalid'), 'true');
  assert.equal(app.output.textContent, money.format(41_738));
});

await test('the calculator refuses to start when any required element is missing', () => {
  for (const selector of [
    '#calculator',
    '#payment',
    '#payment-context',
    '#form-error',
    '#principal',
    '#rate',
    '#months',
    '#summary-principal',
    '#summary-rate',
    '#summary-months',
  ]) {
    assert.throws(() => calculator(selector), /Credit calculator markup is incomplete/u, selector);
  }
});

await test('public submit drops the empty-state marker of the dash once a payment is shown (#44)', () => {
  const app = calculator();
  app.calculate(0, 16, 240);
  assert.equal(app.output.textContent, '—');
  assert.equal(app.output.attributes.get('data-state'), 'empty');
  app.calculate(3_000_000, 16, 240);
  assert.equal(app.output.textContent, money.format(41_738));
  assert.equal(app.output.attributes.has('data-state'), false);
  app.calculate(0, 16, 240);
  assert.equal(app.output.attributes.has('data-state'), false);
  assert.equal(app.output.textContent, money.format(41_738));
});
