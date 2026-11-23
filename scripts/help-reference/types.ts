export type ReferenceRole = Readonly<{
  name: string;
  group: string;
  responsibility: string;
  where: string;
  environmentProfile: string;
  allowedActions: string;
  confirms: string;
  evidence: string;
}>;

export type ReferenceGlossaryEntry = Readonly<{ term: string; definition: string }>;

export type ReferenceGlossaryGroup = Readonly<{
  key: string;
  label: string;
  description: string;
  entries: readonly ReferenceGlossaryEntry[];
}>;

export type ReferenceSource = Readonly<{ label: string; url: string }>;

export type HelpReferenceCatalog = Readonly<{
  roles: readonly ReferenceRole[];
  glossaryGroups: readonly ReferenceGlossaryGroup[];
  sources: readonly ReferenceSource[];
}>;
