let context: AudioContext | null = null;

function getContext() {
  context ??= new AudioContext();
  return context;
}

function blip(frequency: number, duration: number, type: OscillatorType, volume = 0.035) {
  const audio = getContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.62, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

export function playShoot(enabled: boolean) {
  if (enabled) {
    blip(360, 0.12, "sawtooth", 0.025);
  }
}

export function playPop(enabled: boolean, count: number) {
  if (!enabled) {
    return;
  }

  blip(520 + Math.min(count, 10) * 24, 0.18, "triangle", 0.045);
  window.setTimeout(() => blip(760, 0.08, "square", 0.018), 45);
}

export function playBlocked(enabled: boolean) {
  if (enabled) {
    blip(140, 0.09, "square", 0.018);
  }
}
