import { aiFoundations } from './glossary/ai-foundations.ts';
import { requirementsProcess } from './glossary/requirements-process.ts';
import { aiControls } from './glossary/ai-controls.ts';
import { deliveryPlanning } from './glossary/delivery-planning.ts';
import { workingEnvironment } from './glossary/working-environment.ts';
import { helpReferenceRoles, helpReferenceRoleGroups } from './roles.ts';
import type { HelpReferenceCatalog, ReferenceRole, ReferenceSource } from './types.ts';

const sources: readonly ReferenceSource[] = [
  {
    label: 'IIBA: Global State of Business Analysis 2026',
    url: 'https://www.iiba.org/business-analysis-blogs/insight-enables-confidence-the-2026-global-state-of-business-analysis-report/',
  },
  {
    label: 'DORA: Balancing AI tensions',
    url: 'https://dora.dev/insights/balancing-ai-tensions/',
  },
  {
    label: 'Thoughtworks: Agentic SDLC',
    url: 'https://www.thoughtworks.com/insights/articles/preparing-your-team-for-agentic-software-development-life-cycle',
  },
  {
    label: 'OWASP: State of Agentic AI Security',
    url: 'https://genai.owasp.org/resource/state-of-agentic-ai-security-and-governance/',
  },
  {
    label: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
  {
    label: 'OpenAI: GPT-6 model guidance',
    url: 'https://developers.openai.com/api/docs/guides/latest-model',
  },
];

export const helpReferenceCatalog: HelpReferenceCatalog = {
  roles: helpReferenceRoles,
  glossaryGroups: [
    aiFoundations,
    requirementsProcess,
    aiControls,
    deliveryPlanning,
    workingEnvironment,
  ],
  sources,
};

function fail(message: string): never {
  throw new Error(`Help reference catalog: ${message}`);
}

const requireVisible = (value: unknown, subject: string): void => {
  if (typeof value !== 'string' || value.trim() === '')
    fail(`${subject} has an empty visible field`);
};

const validateRoleCards = (roles: readonly ReferenceRole[]): void => {
  const knownGroups = new Set<string>(helpReferenceRoleGroups);
  const names = new Set<string>();
  for (const role of roles) {
    for (const [field, value] of Object.entries(role))
      requireVisible(value, `role "${role.name}" field "${field}"`);
    if (names.has(role.name)) fail(`duplicate role name "${role.name}"`);
    names.add(role.name);
    if (!knownGroups.has(role.group)) {
      fail(
        `role "${role.name}" has unknown group "${role.group}" (expected ${helpReferenceRoleGroups.join(' or ')})`,
      );
    }
  }
};

export const validateHelpReferenceCatalog = (catalog: HelpReferenceCatalog): void => {
  validateRoleCards(catalog.roles);
  const keys = new Set<string>();
  const terms = new Set<string>();
  for (const { key, label, description, entries } of catalog.glossaryGroups) {
    requireVisible(key, 'glossary group key');
    requireVisible(label, `glossary group "${key}" label`);
    requireVisible(description, `glossary group "${key}" description`);
    if (keys.has(key)) fail(`duplicate glossary group "${key}"`);
    keys.add(key);
    if (!entries.length) fail(`empty glossary group "${key}"`);
    for (const { term, definition } of entries) {
      requireVisible(term, 'glossary entry term');
      requireVisible(definition, `glossary term "${term}" definition`);
      if (terms.has(term)) fail(`duplicate glossary term "${term}"`);
      terms.add(term);
    }
  }
  for (const source of catalog.sources) {
    requireVisible(source.label, 'public source label');
    if (!source.url.startsWith('https://'))
      fail(`public source "${source.label}" has a non-https address`);
  }
};
