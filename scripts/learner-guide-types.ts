export type GuideExample = { label: string; content: string };
export type LearnerScreenshot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  crop?: { x: number; y: number; width: number; height: number };
  markers?: ScreenshotMarker[];
  previews?: { src: string; width: number }[];
};
export type LearnerMockupReviewer = {
  role: string;
  state: 'approved' | 'pending' | 'stale' | 'bot';
  note?: string;
};
export type LearnerMockup = {
  kind:
    | 'github-review'
    | 'jira-issue'
    | 'handoff-checklist'
    | 'kilo-panel'
    | 'gitlab-fork'
    | 'gitlab-new-mr'
    | 'gitlab-review';
  title: string;
  caption: string;
  source?: string;
  base?: string;
  reviewers?: LearnerMockupReviewer[];
  status?: string;
  summary?: string;
  fields?: [string, string][];
  description?: string;
  items?: [string, string][];
  mode?: string;
  context?: string;
  model?: string;
  prompt?: string;
  reply?: string;
  footnote?: string;
};
export type LearnerStep = {
  /** Stable published destination when a guide's teaching order changes. */
  anchor?: string;
  legacyAnchor?: string;
  /**
   * Two named entry routes (А — own previous result, Б — учебный образец).
   * Renders a remembered switcher; `actions` stay the primary А route,
   * `variantB` carries the complete self-sufficient Б block.
   */
  entryMode?: {
    a: string;
    b: string;
    /** Actions serve both modes; Б adds context, nothing hides. */ shared?: boolean;
  };
  /** Trusted static HTML of the complete Б-variant block, shown when the learner picks Б. */
  variantB?: string;
  title: string;
  why?: string;
  links: [label: string, href: string, downloadTitle?: string][];
  platformActions?: { gitlab: string[] };
  actions: string[];
  actionHeadings?: Record<number, string>;
  result: string;
  gitNote?: string;
  nextUse: { href: string; label?: string };
  trouble: string;
  advanced: string | null;
  screenshots?: LearnerScreenshot[];
  mockup?: LearnerMockup;
  /** Trusted static HTML authored with the course, never user input. */
  figure?: { html: string };
  example?: GuideExample;
  examples?: GuideExample[];
  model?: { prompt: string; does: string; check: string[] };
};
export type LearnerGuide = {
  title: string;
  summary: string;
  /** Короткое объяснение «зачем» перед практикой (HTML); выводится карточкой в начале страницы. */
  rationale?: string;
  steps: LearnerStep[];
  output: string;
  check: string[];
  learning?: string[];
  application?: string;
  base?: string;
  next?: string | null;
  tools?: string[];
  roles?: string[];
  corporate?: string;
  workaround?: string;
};
export type GuideId =
  | '0'
  | '0a'
  | '1'
  | '2'
  | '3'
  | '3-star'
  | '4-legacy'
  | '4-new'
  | '4-team'
  | 'delivery'
  | 'sdd'
  | 'i1'
  | 'i2'
  | 'i3'
  | 'i4';
export type LearnerGuides = Record<GuideId, LearnerGuide>;

export type ScreenshotMarker = {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};
export type GuideContent = {
  stages: LearnerGuides;
  prerequisites: Record<GuideId, string[]>;
  accessPreparation: Record<GuideId, string>;
  guideReferences: Record<string, [string, string, string][]>;
};
declare global {
  var guideContent: GuideContent;
}
