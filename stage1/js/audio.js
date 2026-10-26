import { Save } from './save.js?v=1';

function noiseBuffer(ctx, seconds) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.hidden = false;
    this.noise = null;
    this.master = null;
    this.sfxGain = null;
  }

  unlock() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return this;
    try {
      if (!this.ctx) this.build(new AudioCtx());
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        const resumed = this.ctx.resume();
        if (resumed && resumed.catch) resumed.catch(() => {});
      }
    } catch (error) {
      console.warn('[CHOPPAH] Audio unlock failed.', error);
    }
    this.unlocked = true;
    return this;
  }

  build(ctx) {
    this.ctx = ctx;
    this.noise = noiseBuffer(ctx, 1.2);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = Save.settings.sfx;
    this.sfxGain.connect(this.master);
    this.master.connect(ctx.destination);
  }

  applySettings() {
    if (this.sfxGain) this.sfxGain.gain.value = Save.settings.sfx;
  }

  setHidden(hidden) {
    this.hidden = !!hidden;
    if (!this.ctx) return;
    try {
      if (hidden) {
        const p = this.ctx.suspend();
        if (p && p.catch) p.catch(() => {});
      } else if (this.unlocked) {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }

  vol() {
    return this.hidden ? 0 : (Save.settings.sfx || 0);
  }

  tone(freq, dur, type, gain, slideTo) {
    if (!this.ctx || this.vol() <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * this.vol()), t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  burst(dur, gain, hp) {
    if (!this.ctx || this.vol() <= 0 || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hp || 800;
    filter.Q.value = 0.7;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain * this.vol(), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.unlocked) return;
    switch (name) {
      case 'gun':
        this.tone(980, 0.045, 'square', 0.09, 420);
        break;
      case 'rocket':
        this.burst(0.18, 0.22, 400);
        this.tone(180, 0.2, 'sawtooth', 0.08, 80);
        break;
      case 'explosion':
        this.burst(0.32, 0.4, 220);
        this.tone(90, 0.28, 'sawtooth', 0.12, 40);
        break;
      case 'hook':
        this.tone(1480, 0.05, 'square', 0.12);
        this.tone(990, 0.07, 'triangle', 0.08);
        break;
      case 'reel':
        this.tone(240, 0.12, 'square', 0.06, 320);
        break;
      case 'splash':
        this.burst(0.22, 0.28, 600);
        break;
      case 'moo':
        this.tone(140, 0.22, 'sawtooth', 0.14, 110);
        this.tone(110, 0.28, 'square', 0.08, 90);
        break;
      case 'pickup':
        this.tone(520, 0.07, 'square', 0.1, 780);
        this.tone(780, 0.09, 'square', 0.08, 1040);
        break;
      case 'combo':
        this.tone(660, 0.05, 'square', 0.08, 880);
        break;
      case 'hit':
        this.tone(160, 0.16, 'sawtooth', 0.16, 60);
        this.burst(0.12, 0.2, 300);
        break;
      case 'pop':
        this.tone(1400, 0.08, 'sine', 0.1, 900);
        this.tone(1800, 0.05, 'square', 0.05);
        break;
      case 'click':
        this.tone(720, 0.03, 'square', 0.07);
        break;
      default:
        break;
    }
  }
}

export const Audio = new AudioManager();
