export interface SpeechOptions {
  slow?: boolean;
  voiceURI?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

const BRAZILIAN_VOICE_HINTS = [
  'google português do brasil',
  'francisca',
  'antonio',
  'luciana',
  'felipe',
  'maria',
  'daniel',
  'brazil',
  'brasil',
  'pt-br',
  'pt_br',
];

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getPortugueseVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const all = window.speechSynthesis.getVoices();
  const ptVoices = all.filter((v) => v.lang.toLowerCase().startsWith('pt'));

  // Sort Brazilian Portuguese voices first
  return ptVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;
  if (lang === 'pt-br' || lang === 'pt_br') score += 50;
  else if (lang.startsWith('pt')) score += 10;

  if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 20;
  if (BRAZILIAN_VOICE_HINTS.some((hint) => name.includes(hint))) score += 25;
  if (lang === 'pt-pt' || name.includes('portugal')) score -= 25;
  return score;
}

export function pickBestBrazilianVoice(preferredURI?: string): SpeechSynthesisVoice | null {
  const voices = getPortugueseVoices();
  if (!voices.length) return null;
  if (preferredURI) {
    const match = voices.find((v) => v.voiceURI === preferredURI);
    if (match) return match;
  }
  return voices[0];
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speech cancel errors
  }
}

export function speakPortuguese(text: string, options: SpeechOptions = {}): boolean {
  if (!isSpeechSupported()) {
    options.onEnd?.();
    return false;
  }

  // Strip ellipsis and slash formatting so TTS speaks naturally
  const cleaned = text.replace(/\.\.\./g, '').replace(/\s*\/\s*/g, ', ').trim();
  if (!cleaned) {
    options.onEnd?.();
    return false;
  }

  stopSpeaking();

  try {
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = 'pt-BR';
    utter.rate = options.slow ? 0.62 : 0.94;
    utter.pitch = 1.0;

    const voice = pickBestBrazilianVoice(options.voiceURI);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || 'pt-BR';
    }

    utter.onstart = () => options.onStart?.();
    utter.onend = () => options.onEnd?.();
    utter.onerror = () => options.onEnd?.();

    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    options.onEnd?.();
    return false;
  }
}
