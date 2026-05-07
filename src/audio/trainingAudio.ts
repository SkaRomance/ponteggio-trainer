import type { GamePhase, NoticeSeverity } from '../stores/gameStore';

export type TrainingAudioCue =
  | 'ui'
  | 'success'
  | 'error'
  | 'warning'
  | 'step'
  | 'move'
  | 'inspect'
  | 'load'
  | 'place'
  | 'strap'
  | 'phase'
  | 'quiz'
  | 'correct'
  | 'wrong';

type SpeechRole = 'narrator' | 'capocantiere' | 'operatore';

const musicProfiles: Partial<Record<GamePhase, { base: number; accent: number; interval: number }>> = {
  warehouse: { base: 110, accent: 220, interval: 980 },
  transport: { base: 82, accent: 164, interval: 760 },
  storage: { base: 98, accent: 196, interval: 900 },
  assembly: { base: 130, accent: 260, interval: 720 },
  use: { base: 116, accent: 232, interval: 1040 },
  disassembly: { base: 92, accent: 184, interval: 840 },
  return: { base: 124, accent: 248, interval: 1200 },
};

const getAudioContextCtor = () => {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
};

class TrainingAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimers: number[] = [];
  private currentMusicPhase: GamePhase | null = null;
  private muted = false;
  private speechEnabled = true;
  private volume = 0.62;

  async resume() {
    const context = this.ensureContext();
    if (!context) return false;

    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
      this.applyGains();
      return true;
    } catch {
      return false;
    }
  }

  configure(options: { muted?: boolean; speechEnabled?: boolean; volume?: number }) {
    if (typeof options.muted === 'boolean') this.muted = options.muted;
    if (typeof options.speechEnabled === 'boolean') this.speechEnabled = options.speechEnabled;
    if (typeof options.volume === 'number') this.volume = Math.min(1, Math.max(0, options.volume));
    if (this.muted || !this.speechEnabled) this.cancelSpeech();
    this.applyGains();
  }

  startMusic(phase: GamePhase) {
    const profile = musicProfiles[phase];
    if (!profile) {
      this.stopMusic();
      return;
    }

    const context = this.ensureContext();
    if (!context) return;
    if (this.currentMusicPhase === phase && this.musicTimers.length > 0) return;

    this.stopMusic();
    this.currentMusicPhase = phase;

    const playPulse = () => {
      this.playTone(profile.base, 0.18, 'triangle', 0.022, this.musicGain);
      window.setTimeout(() => {
        this.playTone(profile.accent, 0.1, 'sine', 0.014, this.musicGain);
      }, 140);
    };

    const playDrone = () => {
      this.playTone(profile.base / 2, 1.8, 'sine', 0.01, this.musicGain);
    };

    playPulse();
    playDrone();
    this.musicTimers = [
      window.setInterval(playPulse, profile.interval),
      window.setInterval(playDrone, profile.interval * 3),
    ];
  }

  stopMusic() {
    this.musicTimers.forEach((timer) => window.clearInterval(timer));
    this.musicTimers = [];
    this.currentMusicPhase = null;
  }

  playCue(cue: TrainingAudioCue) {
    if (this.muted) return;
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;

    switch (cue) {
      case 'success':
      case 'correct':
        this.playTone(523.25, 0.08, 'sine', 0.08, this.sfxGain);
        window.setTimeout(() => this.playTone(783.99, 0.12, 'sine', 0.065, this.sfxGain), 90);
        break;
      case 'error':
      case 'wrong':
        this.playTone(196, 0.16, 'sawtooth', 0.055, this.sfxGain);
        window.setTimeout(() => this.playTone(146.83, 0.18, 'sawtooth', 0.045, this.sfxGain), 130);
        break;
      case 'warning':
        this.playTone(330, 0.1, 'square', 0.035, this.sfxGain);
        window.setTimeout(() => this.playTone(277.18, 0.1, 'square', 0.03, this.sfxGain), 130);
        break;
      case 'step':
      case 'move':
        this.playNoise(0.07, 280, 0.026);
        break;
      case 'inspect':
        this.playTone(880, 0.05, 'triangle', 0.038, this.sfxGain);
        this.playNoise(0.08, 1800, 0.018);
        break;
      case 'load':
        this.playTone(130.81, 0.09, 'square', 0.052, this.sfxGain);
        window.setTimeout(() => this.playNoise(0.09, 420, 0.032), 70);
        break;
      case 'place':
        this.playNoise(0.11, 360, 0.036);
        this.playTone(220, 0.08, 'triangle', 0.028, this.sfxGain);
        break;
      case 'strap':
        this.playNoise(0.08, 1400, 0.035);
        window.setTimeout(() => this.playTone(392, 0.08, 'sine', 0.04, this.sfxGain), 85);
        break;
      case 'phase':
        this.playTone(261.63, 0.12, 'triangle', 0.05, this.sfxGain);
        window.setTimeout(() => this.playTone(329.63, 0.12, 'triangle', 0.044, this.sfxGain), 120);
        window.setTimeout(() => this.playTone(392, 0.16, 'triangle', 0.04, this.sfxGain), 240);
        break;
      case 'quiz':
        this.playTone(698.46, 0.08, 'sine', 0.045, this.sfxGain);
        window.setTimeout(() => this.playTone(523.25, 0.1, 'sine', 0.04, this.sfxGain), 115);
        break;
      case 'ui':
      default:
        this.playTone(440, 0.055, 'sine', 0.03, this.sfxGain);
        break;
    }
  }

  playNoticeCue(severity: NoticeSeverity) {
    if (severity === 'success') this.playCue('success');
    else if (severity === 'error') this.playCue('error');
    else if (severity === 'warning') this.playCue('warning');
    else this.playCue('ui');
  }

  speak(text: string, role: SpeechRole = 'narrator') {
    if (this.muted || !this.speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!cleanText) return;

    this.cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'it-IT';
    utterance.rate = role === 'operatore' ? 1.02 : 0.94;
    utterance.pitch = role === 'capocantiere' ? 0.82 : 1;
    utterance.volume = this.muted ? 0 : Math.min(0.9, this.volume + 0.1);

    const italianVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith('it'));
    if (italianVoice) utterance.voice = italianVoice;

    window.speechSynthesis.speak(utterance);
  }

  cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  shutdown() {
    this.stopMusic();
    this.cancelSpeech();
  }

  private ensureContext() {
    if (this.context) return this.context;

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return null;

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.applyGains();
    return this.context;
  }

  private applyGains() {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) return;
    const masterValue = this.muted ? 0 : this.volume;
    this.masterGain.gain.setTargetAtTime(masterValue, this.context?.currentTime ?? 0, 0.01);
    this.musicGain.gain.setTargetAtTime(0.24, this.context?.currentTime ?? 0, 0.03);
    this.sfxGain.gain.setTargetAtTime(0.7, this.context?.currentTime ?? 0, 0.01);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    destination: AudioNode | null,
  ) {
    if (!this.context || !destination || this.muted) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.type = type;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, cutoff: number, gainValue: number) {
    if (!this.context || !this.sfxGain || this.muted) return;

    const sampleCount = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
}

export const trainingAudio = new TrainingAudioEngine();
