export const sanitizePublishedGuide = (html: string) => html;
const guideResourceLinkPattern =
  /<a\b(?=[^>]*\bhref="((?:\.\.\/corporate-resources\.html|https:\/\/gitlab\.example\.invalid\/)[^"]*)")[^>]*>[\s\S]*?<\/a>/gu;
export const markGuideResourceLinks = (html: string) =>
  html.replace(guideResourceLinkPattern, (anchor) => {
    if (/\btarget="_blank"/u.test(anchor)) return anchor;
    const openingEnd = anchor.indexOf('>');
    const closingStart = anchor.lastIndexOf('</a>');
    const opening = anchor.slice(0, openingEnd);
    const label = anchor.slice(openingEnd + 1, closingStart);
    const described = /в новой вкладке/iu.test(label);
    const description = described ? '' : ' aria-description="Откроется в новой вкладке"';
    const arrow = described ? '' : '<span class="guide-newtab" aria-hidden="true">↗</span>';
    return `${opening} target="_blank" rel="noopener noreferrer"${description}>${label}${arrow}</a>`;
  });
