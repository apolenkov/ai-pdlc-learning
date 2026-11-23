import { guideInfo, isGuideId } from './renderer/common.ts';
import { mountHero } from './renderer/hero.ts';
import { renderGuideBody } from './renderer/body.ts';
import { sanitizePublishedGuide, markGuideResourceLinks } from './renderer/resources.ts';
import { enhanceFigures } from './renderer/figures.ts';
import { mountModeSwitches } from './renderer/mode-switch.ts';
import { mountScreenshotDialog } from './renderer/screenshot-dialog.ts';
import { addTerminalCopyButtons, mountCopyButtons } from './renderer/copy-buttons.ts';
import { keepFlagsTogether, tightenCodePunctuation } from './renderer/inline-code.ts';
import { mountFooter } from './renderer/navigation.ts';
import { hashAnchorId } from './guide-hash.ts';

const publish = (html: string) => sanitizePublishedGuide(markGuideResourceLinks(html));

(() => {
  if (document.body.dataset.stage === 'metarepo') {
    mountCopyButtons();
    return;
  }
  const content = globalThis.guideContent;
  const { stages } = content;
  const body = document.body;
  const stageId = body.dataset.stage;
  if (!stageId || !Object.hasOwn(stages, stageId) || !isGuideId(stageId)) return;
  const id = stageId;
  const stage = stages[id];
  const heading = document.querySelector('h1');
  const summary = document.querySelector('.hero-summary');
  const proof = document.querySelector('.proof strong');
  const main = document.getElementById('guide-content');
  if (!heading || !summary || !proof || !main) return;
  // The per-stage pages are intentionally compact static shells; keep the
  // skip destination a programmatic focus target before rendering its cards.
  main?.setAttribute('tabindex', '-1');
  mountHero(id, { ...stage, output: guideInfo(id).gain }, heading, summary, proof);
  const rationaleInHero = ['3-star', '4-team', '4-new', '4-legacy'].includes(id);
  if (rationaleInHero && stage.rationale) {
    summary.insertAdjacentHTML(
      'afterend',
      publish(`<div id="course-why">${stage.rationale}</div>`),
    );
  }
  const supplement =
    document.querySelector<HTMLTemplateElement>('#guide-supplement')?.innerHTML ?? '';
  const guideHtml = renderGuideBody(content, id, supplement, rationaleInHero);
  main.innerHTML = publish(guideHtml);
  enhanceFigures(main);
  mountModeSwitches(main, id);
  mountScreenshotDialog(main);
  addTerminalCopyButtons();
  keepFlagsTogether(main);
  tightenCodePunctuation(main);
  mountCopyButtons();
  mountFooter(id, stage);
  // The course map opens a page straight on a step anchor (#step-05, #step-06): the ids
  // appear together with the rendered body, so the landing scroll happens here, after render.
  const hashId = hashAnchorId(location.hash);
  const target = hashId ? document.getElementById(hashId) : null;
  // A stage of the folded Git map (#git-process-commit) opens its fold before the scroll.
  for (let fold = target?.closest('details'); fold; fold = fold.parentElement?.closest('details'))
    fold.open = true;
  target?.scrollIntoView({ block: 'start' });
})();
