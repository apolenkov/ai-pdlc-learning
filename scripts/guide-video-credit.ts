/** `audio: "voice-only"` marks a film whose sound track is the narration alone, so the music and sound attribution does not apply. */
export const VOICE_ONLY = 'voice-only';

/** Owner's word 19.10 23:14: the attribution is a folded, barely visible line under the film; no transcript, no key hints. */
const FILM_AUDIO_CREDITS =
  '<details class="lesson-video__credit"><summary>Музыка и звук</summary>Музыка: <a href="https://freesound.org/people/Matio888/sounds/796050" target="_blank" rel="noopener noreferrer">«Relaxing Ambient»</a> и <a href="https://freesound.org/people/Matio888/sounds/796135" target="_blank" rel="noopener noreferrer">«Serene and Peaceful Ambience»</a> — Matio888, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>, с изменениями. Звук: <a href="https://freesound.org/people/InspectorJ/sounds/411639" target="_blank" rel="noopener noreferrer">«Pop, Low, A (H1).wav»</a> — InspectorJ, CC BY 4.0, с изменениями.</details>';

/** A voice-only film has no music or sound effects to credit: the folded line is not rendered for it. */
export const creditTemplate = (suffix: string, audio: string | undefined): string =>
  audio === VOICE_ONLY
    ? ''
    : `<template id="guide-video-credit${suffix}">${FILM_AUDIO_CREDITS}</template>`;
