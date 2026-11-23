/** Lesson videos are assets of one GitHub release, named by content: <first 12 hex of sha256>-<file>. */
export const MEDIA_RELEASE =
  'https://github.com/apolenkov/ai-pdlc-learning/releases/download/media-v1';
export const mediaUrl = (file: string, sha256: string): string =>
  `${MEDIA_RELEASE}/${sha256.slice(0, 12)}-${file}`;
