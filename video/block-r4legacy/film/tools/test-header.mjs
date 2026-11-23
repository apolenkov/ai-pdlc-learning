#!/usr/bin/env node
// Проверяем DOM шапки и команды анимации; геометрию проверяет HyperFrames check.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const current = readFileSync(`${root}/kit/kit.js`, "utf8");
const original = readFileSync(resolve(root, "../../block-0a/film/kit/kit.js"), "utf8");

function capture(code, options, manifest) {
  const nodes = [], motion = [];
  function element(tag) {
    const el = {
      id: nodes.length, tag, style: {}, children: [], attributes: {}, innerHTML: "",
      appendChild(child) { this.children.push(child.id); },
      setAttribute(k, v) { this.attributes[k] = v; },
      querySelector(selector) { return this.queries[selector] ||= element(selector); },
      queries: {},
      get firstChild() { return this.querySelector(":first-child"); },
    };
    nodes.push(el);
    return el;
  }
  const record = (method) => (target, ...args) => motion.push([method, Array.isArray(target) ? target.map((t) => t.id) : target.id, ...args]);
  const ctx = {
    window: { gsap: { set: record("set") }, KIT_SCENES: manifest ? { probe: manifest } : undefined },
    document: { createElement: element },
    getComputedStyle: () => ({ getPropertyValue: (key) => key.includes("dur") ? "0.5" : key }),
  };
  vm.runInNewContext(code, ctx);
  const S = { id: "probe", root: element("root"), tl: { set: record("tl.set"), to: record("to"), fromTo: record("fromTo") } };
  ctx.window.Kit.header(S, options);
  return JSON.stringify({ nodes: nodes.map(({ id, tag, style, children, attributes, innerHTML, className }) => ({ id, tag, style, children, attributes, innerHTML, className })), motion });
}

test("default step header keeps the current step wording and the block-0a animation commands", () => {
  // block-0a — ручная опубликованная копия (вариант H в video/_shared/KIT.md): её шапка осталась на
  // старых подписях «Часть N ·» и «части a–b». Остальные ролики собираются из общего источника, где
  // подпись шага — «Шаг N» или «Шаг N из T», группы — «шаги a–b», а «Готово» бывает со счётчиком.
  // Текст копии закреплён sha её тела, поэтому DOM сверяем с действующим контрактом, а команды
  // анимации — по-прежнему побайтно с block-0a: они при смене подписей не менялись.
  for (const enter of [false, true]) {
    for (const step of Array.from({ length: 14 }, (_, i) => i + 1)) {
      const o = { step, total: 14, duration: 4, enter, progress: [0, 0] };
      const actual = JSON.parse(capture(current, o));
      const legacy = JSON.parse(capture(original, o));
      assert.deepEqual(actual.motion, legacy.motion, `step ${step}, enter ${enter}: animation commands changed`);
      const label = actual.nodes.find((n) => n.className === "k-hs").innerHTML;
      const left = step >= 14 ? "последний шаг" : `осталось ${14 - step}`;
      assert.match(label, new RegExp(`^<b>Шаг ${step}(?: из 14)?</b><span> · ${left}</span>$`), `step ${step}, enter ${enter}`);
      const groups = actual.nodes.filter((n) => n.className === "k-pl").map((n) => n.innerHTML);
      assert.deepEqual(groups, ["<b>На компьютере</b><span>шаги 1–7</span>", "<b>В GitLab</b><span>шаги 8–14</span>"], `step ${step}, enter ${enter}: group labels`);
      assert.equal(actual.nodes.filter((n) => n.className === "k-sg").length, 14, `step ${step}, enter ${enter}: chips`);
    }
    for (const mode of ["intro", "done"]) {
      const o = { step: null, mode, duration: 6, enter };
      const actual = JSON.parse(capture(current, o));
      const legacy = JSON.parse(capture(original, o));
      assert.deepEqual(actual.motion, legacy.motion, `${mode}, enter ${enter}: animation commands changed`);
      const label = actual.nodes.find((n) => n.className === "k-hs").innerHTML;
      if (mode === "intro") assert.equal(label, "<b>14 шагов в двух частях</b>", `intro, enter ${enter}: label`);
      else assert.match(label, /^<b>Готово(?:: 14 из 14)?<\/b>$/, `done, enter ${enter}: label`);
    }
  }
});

test("parts header reads manifest, shows one chip per part and the scene title without old groups", () => {
  const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8")).filter((s) => s.n && s.step); // parts only: the intro and the finale have their own header modes
  for (const scene of scenes) {
    const output = capture(current, {}, scene);
    const { nodes } = JSON.parse(output);
    const total = scene.header.total;
    assert.equal(nodes.filter((n) => n.className === "k-sg").length, total);
    assert.equal(nodes.filter((n) => n.className === "k-pr").length, 1);
    // Опубликованные варианты подписи части: «Часть N из T» (A), «Часть N ·» (B/D/F), «Часть N» (C/E/G).
    assert(nodes.some((n) => new RegExp(`^<b>Часть ${scene.n}(?: ·| из ${total})?</b>$`).test(n.innerHTML)), `scene ${scene.n}: no part title`);
    const chapter = nodes.find((n) => n.innerHTML === `<b>${scene.title}</b>`);
    assert(chapter, `scene ${scene.n}: no scene title`);
    const step = nodes.find((n) => n.className === "k-step");
    assert(step.children.includes(chapter.id), "chapter belongs to the part counter, not chip 1");
    assert.doesNotMatch(output, /На компьютере|В GitLab|Шаг|шагов|шаги/);
  }
});
