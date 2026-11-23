// step: number in the film title ("Шаг N"); pageStep: the page step the chapter belongs to (null: the chapter has no step of its own, no button).
export type Chapter = {
  n: number;
  title: string;
  step: number | null;
  pageStep?: number | null;
  start: number;
  speechStart: number;
  end: number;
};

export type PlayerElements = {
  section: HTMLElement;
  disclosure: HTMLDetailsElement | null;
  video: HTMLVideoElement;
  buttons: HTMLButtonElement[];
};
