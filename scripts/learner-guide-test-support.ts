import { readMetarepositoryGuide } from './build-metarepository-guide.ts';
import { createContext, runInContext } from 'node:vm';
import { guideContent, readGuideScriptSource } from './guide-content.ts';
import { type LearnerGuides } from './learner-guide-contract.ts';
import { escapeHtml } from './site-navigation-contract.ts';

// These assertions inspect instructional meaning rather than prose line breaks.
// Command/document fixtures remain raw; build-protected-pages tests exercise the
// production contract against the unmodified browser data.
export const loadGuides = (): Promise<LearnerGuides> => {
  const guides = structuredClone(guideContent.stages);
  const copy = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (['advanced', 'prompt', 'content', 'src', 'href', 'source'].includes(key)) return value;
      return value
        .split(/(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>)/giu)
        .map((part) =>
          /^<(?:pre|code)\b/iu.test(part) ? part : part.replace(/[\u00a0\u202f]/gu, ' '),
        )
        .join('');
    }
    if (Array.isArray(value)) return value.map((item) => copy(item, key));
    if (value && typeof value === 'object') {
      for (const [name, item] of Object.entries(value)) Reflect.set(value, name, copy(item, name));
    }
    return value;
  };
  copy(guides);
  return Promise.resolve(guides);
};

export type GuideFooter = { nextHref: string; nextText: string; extraLinks: string[] };

export type GuideLanding = { hash?: string; scrolls?: { id: string; block?: string }[] };

export const renderGuide = async (
  stageId: string,
  mutateGuides?: (guides: LearnerGuides) => void,
  figureDom?: { containers: unknown[]; classes: Record<string, unknown> },
  footer?: GuideFooter,
  landing?: GuideLanding,
): Promise<string> => {
  if (stageId === 'metarepo')
    return readMetarepositoryGuide(
      new URL('../docs/pages/sdlc-development/guides/', import.meta.url).pathname,
    );
  let renderedGuide = '';
  const main = {
    querySelectorAll: () => figureDom?.containers ?? [],
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    classList: { add: () => undefined },
    dataset: {} as Record<string, string>,
    set innerHTML(value: string) {
      renderedGuide = value;
    },
    scrollIntoView: () => undefined,
  };
  const stubElement = () => ({
    setAttribute: () => undefined,
    insertAdjacentHTML: () => undefined,
    addEventListener: () => undefined,
    href: '',
    textContent: '',
    scrollIntoView: () => undefined,
  });
  const heading = stubElement();
  const proof = stubElement();
  let afterSummary = '';
  const summary = {
    ...stubElement(),
    innerHTML: '',
    insertAdjacentHTML: (_position: string, html: string) => {
      afterSummary = html + afterSummary;
    },
  };
  const nextLink = {
    ...stubElement(),
    insertAdjacentHTML: (_position: string, html: string) => {
      footer?.extraLinks.push(html);
    },
  };
  const documentStub = {
    body: { dataset: { stage: stageId }, append: () => undefined },
    createElement: () => stubElement(),
    createDocumentFragment: () => ({ append: () => undefined }),
    title: '',
    getElementById: (id: string) =>
      id === 'guide-content'
        ? main
        : id === 'next-stage'
          ? nextLink
          : landing?.scrolls
            ? {
                ...stubElement(),
                closest: () => null,
                scrollIntoView: (options?: { block?: string }) =>
                  landing.scrolls?.push(
                    options?.block === undefined ? { id } : { id, block: options.block },
                  ),
              }
            : stubElement(),
    querySelector: (selector: string) =>
      ({ h1: heading, '.hero-summary': summary, '.proof strong': proof, '#next-stage': nextLink })[
        selector
      ] ?? stubElement(),
    querySelectorAll: (): never[] => [],
  };
  const globals = {
    document: documentStub,
    // Browser environment: the page always has a location (empty in the default render).
    location: { hash: landing?.hash ?? '' },
    guideContent: structuredClone(guideContent),
    ...figureDom?.classes,
  };
  const context = createContext(globals);
  runInContext(await readGuideScriptSource('guide-stages'), context, { timeout: 1000 });
  mutateGuides?.(globals.guideContent.stages);
  runInContext(await readGuideScriptSource('guide-data'), context, { timeout: 1000 });
  if (footer) {
    footer.nextHref = nextLink.href;
    footer.nextText = nextLink.textContent;
  }
  const hero = `<header class="hero"><h1>${escapeHtml(heading.textContent)}</h1><p class="hero-summary">${summary.innerHTML}</p>${afterSummary}<aside class="proof"><strong>${escapeHtml(proof.textContent)}</strong></aside></header>`;
  return (hero + renderedGuide)
    .split(/(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>)/giu)
    .map((part) => (/^<(?:pre|code)\b/iu.test(part) ? part : part.replace(/[\u00a0\u202f]/gu, ' ')))
    .join('');
};

export const renderedStepHtml = (html: string, number: number): string | null => {
  const displayedNumber = String(number).padStart(2, '0');
  const start = html.search(
    new RegExp(
      `<li id="[a-z0-9-]+"><span class="step-number" aria-hidden="true">${displayedNumber}</span>`,
      'u',
    ),
  );
  if (start < 0) return null;

  let depth = 0;
  for (const item of html.slice(start).matchAll(/<\/?li\b[^>]*>/gu)) {
    depth += item[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      const end = start + (item.index ?? 0) + item[0].length;
      return html.slice(start, end);
    }
  }
  return null;
};

export type RenderedDisclosure = { html: string };

export const directDisclosureElements = (html: string): RenderedDisclosure[] => {
  const disclosures: RenderedDisclosure[] = [];
  const tags = [...html.matchAll(/<details\b[^>]*>|<\/details>/gu)];
  let depth = 0;
  let start = -1;
  for (const tag of tags) {
    if (tag[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const end = (tag.index ?? 0) + tag[0].length;
        disclosures.push({ html: html.slice(start, end) });
        start = -1;
      }
      continue;
    }
    if (depth === 0) start = tag.index ?? -1;
    depth += 1;
  }
  return disclosures;
};

/** Sections under the single closed supplement, excluding any nested content sections. */
export const supplementSections = (step: string): RenderedDisclosure[] => {
  const group = directDisclosureElements(step).find(({ html }) =>
    html.startsWith('<details class="step-additional"><summary>Дополнительно</summary>'),
  );
  const html = group?.html ?? '';
  const sections: RenderedDisclosure[] = [];
  let depth = 0;
  let start = 0;
  for (const tag of html.matchAll(/<section\b[^>]*>|<\/section>/gu)) {
    if (tag[0] === '</section>') {
      if (--depth === 0) sections.push({ html: html.slice(start, tag.index + tag[0].length) });
    } else if (depth++ === 0) start = tag.index;
  }
  return sections;
};

export const disclosureText = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+\(в новой вкладке\)/giu, '')
    .replace(/\s+↗/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();

export const disclosureSummary = (html: string): string => {
  const summary = html.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/u)?.[1] ?? '';
  return disclosureText(summary);
};

export const GUIDE_IDS = ['1', '2', '3', '3-star'] as const;

// Both action variants may contain nested divs. Find the end of the last complete variant.
const instructionsEnd = (block: string): number => {
  let depth = 0;
  let end = -1;
  let primary = false;
  for (const tag of block.matchAll(/<div\b[^>]*>|<\/div>/gu)) {
    const instruction = /^<div class="step-instructions(?:[" ])/u.test(tag[0]);
    primary ||= instruction;
    if (tag[0] === '</div>') {
      if (depth && --depth === 0) end = tag.index + tag[0].length;
    } else if (depth || instruction || tag[0].startsWith('<div class="mode-b"')) {
      depth++;
    }
  }
  return primary && depth === 0 ? end : -1;
};

/* Step evidence: the first capture is an open lead figure after the actions and before the result; any further
   captures sit in one initially closed <details class="step-screenshots">. All load lazily. */
export const leadThenClosedLazyScreenshots = (block: string, count = 1): boolean => {
  const resultAt = block.indexOf('<p class="step-result">');
  const resultEnd = resultAt < 0 ? -1 : block.indexOf('</p>', resultAt);
  const lead = block.search(/<figure class="step-reference[^"]*\bstep-reference--lead\b/u);
  const groups = supplementSections(block).filter(({ html }) =>
    html.startsWith('<section class="step-screenshots"><h4>Ещё снимки шага</h4>'),
  );
  // TASK-904: the captures illustrate the actions, so they come right after them and before the result.
  const end = instructionsEnd(block);
  if (end < 0 || lead < end || lead >= resultAt || resultEnd < 0) return false;
  if (groups.length !== (count > 1 ? 1 : 0)) return false;
  const body = groups[0]?.html ?? '';
  if (body && block.indexOf(body) <= resultEnd) return false;
  const images = [...block.matchAll(/<img\b[^>]*>/gu)];
  return (
    images.length === count &&
    images.every((img) => /\bloading="lazy"/u.test(img[0])) &&
    [...body.matchAll(/<img\b/gu)].length === count - 1
  );
};
