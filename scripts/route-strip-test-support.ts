import assert from 'node:assert/strict';
import { type TestContext } from 'node:test';
import { mountStrip } from '../docs/pages/sdlc-development/route-strip/strip.ts';

/** A mounted-strip fixture: stub DOM, stub observers and a route-scoped scroll position for mountStrip.
 * Lives beside the render tests so both halves of the strip contract stay readable.
 */
export const makeClasses = () => {
  const names = new Set<string>();
  return {
    add: (...values: string[]) => values.forEach((value) => names.add(value)),
    remove: (...values: string[]) => values.forEach((value) => names.delete(value)),
    contains: (value: string) => names.has(value),
    toggle(value: string, force = !names.has(value)) {
      if (force) names.add(value);
      else names.delete(value);
      return force;
    },
  };
};
export const makeDot = (id: string) => {
  const attributes = new Map<string, string>();
  return {
    dataset: { routeId: id },
    classList: makeClasses(),
    attributes,
    querySelector: () => ({
      dataset: { title: `Шаг ${id}` },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    }),
  };
};
export type Intersection = {
  target: object;
  isIntersecting: boolean;
  boundingClientRect: { top: number };
};
export const replaceGlobal = (t: TestContext, name: string, descriptor: PropertyDescriptor) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, ...descriptor });
  t.after(() =>
    previous
      ? Object.defineProperty(globalThis, name, previous)
      : Reflect.deleteProperty(globalThis, name),
  );
};
export const fixtureElements = () => {
  const properties = new Map<string, string>();
  const dots = ['1', '2', '3-star'].map(makeDot);
  const compact = { innerHTML: '' };
  const status = { href: 'p1-zachem.html', textContent: 'Начните: Шаг 1' };
  class ElementStub extends EventTarget {
    hidden = false;
    height = 54;
    offsetTop = 12;
    classList = makeClasses();
    className = '';
    html = '';
    get innerHTML() {
      return this.html;
    }
    set innerHTML(value: string) {
      this.html = value;
      status.href = 'p1-zachem.html';
      status.textContent = 'Начните: Шаг 1';
      for (const dot of dots) {
        dot.classList.remove('is-viewing', 'is-traversed', 'is-new');
        dot.attributes.clear();
      }
    }
    style = { setProperty: (key: string, value: string) => properties.set(key, value) };
    get offsetHeight() {
      return this.hidden ? 0 : this.height;
    }
    querySelectorAll = () => dots;
    querySelector = (selector: string) =>
      selector === '.course-route__status a'
        ? status
        : selector === '.course-route__compact'
          ? compact
          : null;
    setAttribute = () => undefined;
    placedBefore: unknown[] = [];
    before = (...nodes: unknown[]) => this.placedBefore.push(...nodes);
    contains = (element: unknown) => element === this;
  }
  const strip = new ElementStub();
  let insertions = 0;
  const nav = Object.assign(new ElementStub(), {
    nextElementSibling: strip,
    insertAdjacentHTML: () => {
      if (insertions++) nav.nextElementSibling = new ElementStub();
    },
  });
  nav.height = 80;
  const introduction = new ElementStub();
  const sentinel = new ElementStub();
  const root = { clientHeight: 1000, classList: makeClasses(), style: strip.style };
  const cards = ['1', '2'].map((id, index) => ({
    getAttribute: () => id,
    getBoundingClientRect: () => ({ top: 300 + 150 * index, height: 100 }),
  }));
  const detail = { getBoundingClientRect: () => ({ top: 400, height: 200 }) };
  const detailLink = {
    getAttribute: (name: string) => (name === 'href' ? 's4-product.html' : null),
    closest: (selector: string) => (selector.includes('aside') ? detail : null),
  };
  return {
    detail,
    detailLink,
    ElementStub,
    nav,
    strip,
    introduction,
    sentinel,
    root,
    cards,
    dots,
    status,
    compact,
    properties,
  };
};
export const fixtureObservers = () => {
  const intersections: {
    notify: (entries: Intersection[]) => void;
    targets: object[];
    margin?: string;
  }[] = [];
  const resizes: { notify: () => void; targets: object[] }[] = [];
  class ObserverStub {
    disconnect = () => undefined;
  }
  class IntersectionObserverStub extends ObserverStub {
    state: (typeof intersections)[number];
    constructor(notify: (entries: Intersection[]) => void, options?: { rootMargin?: string }) {
      super();
      this.state = {
        notify,
        targets: [],
        ...(options?.rootMargin ? { margin: options.rootMargin } : {}),
      };
      intersections.push(this.state);
    }
    observe = (target: object) => this.state.targets.push(target);
  }
  class ResizeObserverStub extends ObserverStub {
    state: (typeof resizes)[number];
    constructor(notify: () => void) {
      super();
      this.state = { notify, targets: [] };
      resizes.push(this.state);
    }
    observe = (target: object) => this.state.targets.push(target);
  }
  return { intersections, resizes, IntersectionObserverStub, ResizeObserverStub };
};
export const mountFixture = (
  t: TestContext,
  onMap = false,
  initialY = 0,
  options: { introduction?: boolean } = {},
) => {
  const elements = fixtureElements();
  const observers = fixtureObservers();
  const events = new EventTarget();
  const frames: FrameRequestCallback[] = [];
  let scrollY = initialY;
  let writes = 0;
  const globals: Record<string, unknown> = {
    HTMLElement: elements.ElementStub,
    IntersectionObserver: observers.IntersectionObserverStub,
    ResizeObserver: observers.ResizeObserverStub,
    addEventListener: events.addEventListener.bind(events),
    requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback),
    localStorage: { getItem: () => null, setItem: () => writes++ },
  };
  for (const [name, value] of Object.entries(globals)) replaceGlobal(t, name, { value });
  replaceGlobal(t, 'scrollY', { get: () => scrollY });
  const doc = {
    body: { dataset: onMap ? {} : { stage: '1' } },
    documentElement: elements.root,
    activeElement: null as unknown,
    createElement: (tag: string) =>
      tag === 'template'
        ? { innerHTML: '', content: { firstElementChild: { innerHTML: '' } } }
        : elements.sentinel,
    getElementById: (id: string) =>
      id === 'course-map'
        ? onMap
          ? {}
          : null
        : options.introduction === false
          ? null
          : elements.introduction,
    querySelector: () => elements.nav,
    querySelectorAll: (selector: string) =>
      selector === '#course-map [data-route-id]'
        ? elements.cards
        : selector === '.route-open'
          ? [elements.detailLink]
          : [],
  };
  Reflect.apply(mountStrip, undefined, [doc]);
  const flush = () => {
    for (const callback of frames.splice(0)) callback(0);
  };
  const fire = (type: string) => {
    events.dispatchEvent(new Event(type));
    flush();
  };
  const sticky = (stuck: boolean) => {
    const observer = observers.intersections.find((item) =>
      item.targets.includes(elements.sentinel),
    );
    assert.ok(observer, 'the route observes a sentinel to detect sticking');
    observer.notify([
      {
        target: elements.sentinel,
        isIntersecting: !stuck,
        boundingClientRect: { top: stuck ? -1 : 1 },
      },
    ]);
    flush();
  };
  return {
    ...elements,
    ...observers,
    events,
    frames,
    doc,
    fire,
    flush,
    sticky,
    scroll: (top: number) => {
      scrollY = top;
      fire('scroll');
    },
    resizeStrip: () => {
      for (const observer of observers.resizes.filter((item) =>
        item.targets.includes(elements.strip),
      ))
        observer.notify();
      flush();
    },
    writes: () => writes,
  };
};
