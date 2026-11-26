import { sfx } from './sfx';

export type BgmMode = 'hub' | 'combat' | 'clear' | 'boss_p1' | 'boss_p2';

/**
 * Adaptive Web Audio Synthesizer in E Phrygian Dominant (Hades-inspired underworld tonality).
 * Separates ambient, bass, percussion, and lead buses so room clears drop drums smoothly
 * while Boss Phase 2 escalates tempo & octave lead energy.
 */
class AdaptiveBGM {
  private started = false;
  private mode: BgmMode = 'hub';
  private timerId: number | null = null;
  private step = 0;
  private nextNoteTime = 0;

  private masterGain: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private bassBus: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private leadBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // E Phrygian Dominant frequencies (Hz)
  private readonly bassScale = [82.41, 87.31, 103.83, 110.0, 123.47, 130.81, 146.83, 164.81]; // E2 F2 G#2 A2 B2 C3 D3 E3
  private readonly leadScale = [329.63, 349.23, 415.3, 440.0, 493.88, 523.25, 587.33, 659.25]; // E4..E5

  constructor() {
    sfx.onMuteChange((muted) => {
      const ctx = sfx.getContext();
      if (this.masterGain && ctx) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.12, ctx.currentTime, 0.06);
      }
    });
  }

  startIfNeeded() {
    const ctx = sfx.unlock();
    if (!ctx) return;

    if (!this.started) {
      this.started = true;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = sfx.isMuted() ? 0 : 0.12;
      this.masterGain.connect(ctx.destination);

      this.ambientBus = ctx.createGain();
      this.bassBus = ctx.createGain();
      this.drumBus = ctx.createGain();
      this.leadBus = ctx.createGain();

      this.ambientBus.connect(this.masterGain);
      this.bassBus.connect(this.masterGain);
      this.drumBus.connect(this.masterGain);
      this.leadBus.connect(this.masterGain);

      // Pre-build reusable white-noise snare/hat buffer
      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.floor(sr * 0.25), sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      this.applyBusTargets(ctx);
      this.nextNoteTime = ctx.currentTime + 0.06;
      this.timerId = window.setInterval(() => this.scheduler(), 65);
    }
  }

  setMode(mode: BgmMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    const ctx = sfx.getContext();
    if (this.started && ctx) {
      this.applyBusTargets(ctx);
    }
  }

  private getBpm(): number {
    switch (this.mode) {
      case 'hub':
        return 104;
      case 'clear':
        return 116;
      case 'combat':
        return 136;
      case 'boss_p1':
        return 148;
      case 'boss_p2':
        return 164;
    }
  }

  private applyBusTargets(ctx: AudioContext) {
    const t = ctx.currentTime;
    const targets: Record<BgmMode, { amb: number; bass: number; drum: number; lead: number }> = {
      hub: { amb: 0.55, bass: 0.18, drum: 0.0, lead: 0.0 },
      clear: { amb: 0.65, bass: 0.24, drum: 0.0, lead: 0.08 },
      combat: { amb: 0.3, bass: 0.65, drum: 0.68, lead: 0.35 },
      boss_p1: { amb: 0.25, bass: 0.78, drum: 0.85, lead: 0.52 },
      boss_p2: { amb: 0.2, bass: 0.85, drum: 0.96, lead: 0.78 },
    };
    const g = targets[this.mode];
    this.ambientBus?.gain.setTargetAtTime(g.amb, t, 0.32);
    this.bassBus?.gain.setTargetAtTime(g.bass, t, 0.25);
    this.drumBus?.gain.setTargetAtTime(g.drum, t, 0.18);
    this.leadBus?.gain.setTargetAtTime(g.lead, t, 0.25);
  }

  private scheduler() {
    const ctx = sfx.getContext();
    if (!ctx || ctx.state !== 'running' || sfx.isMuted()) {
      if (ctx) this.nextNoteTime = ctx.currentTime + 0.08;
      return;
    }

    const secPer16th = 60 / this.getBpm() / 4;
    while (this.nextNoteTime < ctx.currentTime + 0.18) {
      this.scheduleStep(ctx, this.step, this.nextNoteTime, secPer16th);
      this.nextNoteTime += secPer16th;
      this.step = (this.step + 1) % 32;
    }
  }

  private scheduleStep(ctx: AudioContext, s: number, t: number, dur: number) {
    // 1. Stygian Ambient Lyre / Dark Pad (every 4th or 8th step)
    const ambPattern = [0, -1, -1, -1, 4, -1, 2, -1, 1, -1, -1, -1, 7, -1, 4, -1];
    const ambIdx = ambPattern[s % 16];
    if (ambIdx >= 0 && this.ambientBus) {
      this.playVoice(ctx, this.ambientBus, this.leadScale[ambIdx] * 0.5, t, dur * 3.8, 'triangle', 0.22);
    }

    // 2. Driving Hades Underworld Bass Riff
    const bassPattern = [0, 0, -1, 0, 1, -1, 0, 2, 0, 0, 3, -1, 2, -1, 1, 0];
    const bIdx = bassPattern[s % 16];
    if (bIdx >= 0 && this.bassBus) {
      const freq = this.bassScale[bIdx] * (s >= 16 && bIdx === 0 ? 1 : 1);
      this.playBassPluck(ctx, this.bassBus, freq, t, dur * 1.4, 0.34);
    }

    // 3. Punchy Percussion (Kick on 0, 6, 8, 14; Snare on 4, 12; Hats every 2)
    if (this.drumBus && (this.mode === 'combat' || this.mode === 'boss_p1' || this.mode === 'boss_p2')) {
      const m = s % 16;
      if (m === 0 || m === 6 || m === 8 || (this.mode !== 'combat' && m === 14)) {
        this.playKick(ctx, this.drumBus, t);
      }
      if (m === 4 || m === 12) {
        this.playSnare(ctx, this.drumBus, t);
      }
      if (s % 2 === 1) {
        this.playHat(ctx, this.drumBus, t);
      }
    }

    // 4. Aggressive Phrygian Lead Riff (Combat sparse, Boss P1/P2 intense)
    const leadPattern = [0, -1, 2, 3, 4, -1, 2, 1, 0, -1, 5, 4, 2, 1, 2, -1];
    const lIdx = leadPattern[s % 16];
    if (lIdx >= 0 && this.leadBus && (this.mode === 'boss_p2' || s % 4 === 0 || (this.mode === 'boss_p1' && s % 2 === 0))) {
      const oct = this.mode === 'boss_p2' && s >= 16 ? 2 : 1;
      this.playVoice(ctx, this.leadBus, this.leadScale[lIdx] * oct, t, dur * 1.6, 'sawtooth', 0.14);
    }
  }

  private playVoice(ctx: AudioContext, dest: GainNode, freq: number, t: number, len: number, type: OscillatorType, vol: number) {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq * 3.2, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    osc.connect(filt);
    filt.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + len + 0.02);
  }

  private playBassPluck(ctx: AudioContext, dest: GainNode, freq: number, t: number, len: number, vol: number) {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(680, t);
    filt.frequency.exponentialRampToValueAtTime(170, t + len);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(filt);
    filt.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + len + 0.02);
  }

  private playKick(ctx: AudioContext, dest: GainNode, t: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(0.65, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private playSnare(ctx: AudioContext, dest: GainNode, t: number) {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(1450, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.14);
  }

  private playHat(ctx: AudioContext, dest: GainNode, t: number) {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.setValueAtTime(5200, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.055);
  }
}

export const bgm = new AdaptiveBGM();
