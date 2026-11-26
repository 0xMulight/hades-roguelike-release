class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private muteListeners: Array<(muted: boolean) => void> = [];
  private noiseBuffer: AudioBuffer | null = null;
  private lastSfxAt: Record<string, number> = {};

  private canPlay(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const prev = this.lastSfxAt[key] ?? 0;
    if (now - prev < minGapMs) return false;
    this.lastSfxAt[key] = now;
    return true;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const sampleCount = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  unlock(): AudioContext | null {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  onMuteChange(cb: (muted: boolean) => void) {
    this.muteListeners.push(cb);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    for (const cb of this.muteListeners) cb(this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ready(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume = 0.14
  ) {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoise(duration: number, filterFreq: number, volume = 0.12) {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(0.02, duration));
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + Math.min(0.44, duration));
  }

  playSlash(comboStep = 1) {
    if (!this.canPlay('slash', 45)) return;
    const base = 320 + comboStep * 70;
    this.playNoise(0.11, base * 3, 0.15);
    this.playTone(base, 110, 0.1, 'sawtooth', 0.1);
  }

  playBowShot() {
    if (!this.canPlay('bow', 45)) return;
    this.playTone(760, 220, 0.12, 'triangle', 0.13);
    this.playNoise(0.06, 1800, 0.08);
  }

  playDash() {
    this.playNoise(0.14, 900, 0.13);
    this.playTone(420, 160, 0.12, 'sine', 0.09);
  }

  playHit(crit = false) {
    if (!this.canPlay('hit', 35)) return;
    this.playTone(crit ? 260 : 180, 65, 0.09, 'square', crit ? 0.15 : 0.1);
    if (crit) {
      this.playTone(880, 1320, 0.12, 'triangle', 0.1);
    }
  }

  playThunder() {
    if (!this.canPlay('thunder', 55)) return;
    this.playNoise(0.24, 1400, 0.18);
    this.playTone(980, 180, 0.18, 'sawtooth', 0.12);
  }

  playExplosion() {
    if (!this.canPlay('explosion', 60)) return;
    this.playNoise(0.3, 320, 0.2);
    this.playTone(140, 38, 0.28, 'sawtooth', 0.16);
  }

  playPickup() {
    this.playTone(587, 880, 0.12, 'sine', 0.11);
    setTimeout(() => this.playTone(880, 1175, 0.12, 'sine', 0.1), 55);
  }

  playBoonSelect() {
    this.playTone(440, 660, 0.16, 'triangle', 0.12);
    setTimeout(() => this.playTone(660, 990, 0.22, 'triangle', 0.12), 90);
  }

  playPlayerHurt() {
    this.playTone(190, 70, 0.18, 'sawtooth', 0.18);
    this.playNoise(0.15, 500, 0.14);
  }

  playBossRoar() {
    this.playTone(130, 52, 0.45, 'sawtooth', 0.2);
    this.playNoise(0.4, 280, 0.18);
  }

  playDivineDescent() {
    this.playTone(220, 440, 0.38, 'triangle', 0.14);
    this.playTone(330, 660, 0.42, 'sine', 0.11);
    setTimeout(() => this.playTone(660, 880, 0.3, 'triangle', 0.1), 80);
    this.playTone(92, 36, 0.35, 'sine', 0.15);
  }

  playBladeDrop() {
    if (!this.canPlay('bladeDrop', 60)) return;
    this.playTone(1120, 220, 0.14, 'sawtooth', 0.12);
    setTimeout(() => {
      this.playNoise(0.22, 380, 0.18);
      this.playTone(145, 34, 0.24, 'sawtooth', 0.16);
    }, 65);
  }

  playBladeRift() {
    if (!this.canPlay('bladeRift', 70)) return;
    this.playNoise(0.28, 1600, 0.13);
    this.playTone(280, 140, 0.26, 'sawtooth', 0.1);
  }

  playIceShatter() {
    if (!this.canPlay('iceShatter', 60)) return;
    this.playTone(1480, 2100, 0.14, 'sine', 0.11);
    setTimeout(() => this.playTone(1960, 2600, 0.16, 'triangle', 0.1), 40);
    this.playNoise(0.18, 2800, 0.13);
  }

  playVoidSlash() {
    if (!this.canPlay('voidSlash', 55)) return;
    this.playTone(170, 30, 0.28, 'sawtooth', 0.15);
    this.playTone(940, 390, 0.22, 'sine', 0.1);
    this.playNoise(0.16, 1200, 0.11);
  }

  playParryClang() {
    this.playTone(1380, 1980, 0.16, 'triangle', 0.17);
    this.playTone(880, 1320, 0.14, 'sine', 0.14);
    this.playNoise(0.05, 3400, 0.14);
  }

  playShieldBlock() {
    this.playTone(410, 180, 0.09, 'square', 0.11);
    this.playNoise(0.06, 1100, 0.09);
  }

  playPostureBreak() {
    this.playTone(720, 110, 0.24, 'sawtooth', 0.18);
    this.playNoise(0.22, 1800, 0.18);
  }

  playExecution() {
    this.playTone(165, 32, 0.34, 'sawtooth', 0.2);
    this.playTone(920, 340, 0.14, 'triangle', 0.15);
    setTimeout(() => this.playTone(1120, 420, 0.16, 'triangle', 0.14), 60);
    this.playNoise(0.24, 950, 0.16);
  }

  playChargeReady() {
    this.playTone(1046, 1568, 0.14, 'sine', 0.12);
    this.playTone(1318, 1975, 0.1, 'triangle', 0.08);
  }

  playChargeRelease(isPerfect = false) {
    this.playNoise(isPerfect ? 0.24 : 0.18, isPerfect ? 2200 : 1650, isPerfect ? 0.2 : 0.15);
    this.playTone(isPerfect ? 520 : 320, isPerfect ? 140 : 88, 0.22, 'sawtooth', 0.16);
    if (isPerfect) {
      this.playTone(1318, 1760, 0.16, 'triangle', 0.13);
    }
  }

  playArmorBreak() {
    this.playTone(880, 140, 0.25, 'sawtooth', 0.18);
    this.playNoise(0.26, 2200, 0.2);
  }

  playTeleportBlink() {
    this.playTone(620, 1480, 0.12, 'sine', 0.09);
    this.playNoise(0.08, 2400, 0.07);
  }
}

export const sfx = new SoundEngine();
