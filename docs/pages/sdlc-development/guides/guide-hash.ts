/** The course map opens a page on a step anchor (#step-05, #step-06); the hash arrives percent-encoded. */
export const hashAnchorId = (hash: string): string => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    // A malformed escape must not stop the guide from rendering.
    return raw;
  }
};
