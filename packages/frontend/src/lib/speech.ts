/**
 * Browser speech helpers for "call" mode: Web Speech API recognition (input)
 * and speech synthesis (output). Free, on-device/edge, zero backend cost.
 */

/* Minimal typings for the (still prefixed in some browsers) SpeechRecognition API. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function createRecognizer(lang = 'en-US'): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.continuous = false;
  r.interimResults = true;
  return r;
}

export function speechSupported(): boolean {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition) && 'speechSynthesis' in window;
}

export function pickVoice(lang = 'en'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const preferred = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  return (
    preferred.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ??
    preferred.find((v) => /google|samantha|daniel|serena|moira/i.test(v.name)) ??
    preferred[0] ??
    voices[0]
  );
}

export function speak(text: string, opts: { lang?: string; rate?: number; onend?: () => void; onstart?: () => void } = {}): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) return null;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*_#`>]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/https?:\/\/\S+/g, '');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = opts.lang ?? 'en-US';
  u.rate = opts.rate ?? 1;
  u.pitch = 1;
  const v = pickVoice(u.lang.split('-')[0]);
  if (v) u.voice = v;
  if (opts.onend) u.onend = opts.onend;
  if (opts.onstart) u.onstart = opts.onstart;
  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
