export interface KitRoot {
  video: string;
  parts: string;
  variants: string;
  targets: string;
}
export const ROOT: KitRoot;
export const PARTS: readonly string[];
export const REFERENCE_SHA256: string;
export const BANNER: string;
export const GENERATED_ATTR: string;
export function laneFiles(root?: KitRoot): string[];
export function targets(root?: KitRoot): string[];
export function configPath(film: string, root?: KitRoot): string;
export function variantOf(film: string, root?: KitRoot): string;
export function variantNames(root?: KitRoot): string[];
export function body(root?: KitRoot): string;
export function bodySha256(root?: KitRoot): string;
export function applyHunks(text: string, hunks: readonly { start: number; remove: string[]; add: string[] }[]): string;
export function bodyFor(variant: string, root?: KitRoot): string;
export function variantBodySha(variant: string, root?: KitRoot): string;
export function expectedBodySha(film: string, root?: KitRoot): string;
export function generatedBody(film: string, root?: KitRoot): string;
export function generated(film: string, root?: KitRoot): string;
export function targetDir(film: string, root?: KitRoot): string;
export function kitFatal(root?: KitRoot): string[];
export function kitDrift(root?: KitRoot): string[];
