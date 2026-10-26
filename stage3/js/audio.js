import { Save } from './save.js?v=2';
import { TUNING } from './config.js?v=2';

function noiseBuffer(ctx, seconds) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

const LOOPS = {
  title: [262, 330, 392, 330, 294, 262, 220, 247],
  flying: [330, 392, 494, 440, 392, 330, 294, 330],
  boss: [196, 196, 233, 175, 156, 175, 147, 196],
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.hidden = false;
    this.noise = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicBus = null;
    this.musicVariant = 'normal';
    this.music = null;
    this.musicOwner = null;
    this.musicTimer = 0;
    this.stepI = 0;
    this.loopOn = false;
    this.activeNodes = 0;
    this.pendingMusic = null;
    this.pendingOwner = null;
  }

  setMusicVariant(name) {
    this.musicVariant = name === 'tuba' ? 'tuba' : 'normal';
  }

  status() {
    return {
      ctxState: this.ctx ? this.ctx.state : 'none',
      music: this.music,
      variant: this.musicVariant,
      activeNodes: this.activeNodes | 0,
      hidden: !!this.hidden,
    };
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
    if (this.pendingMusic) this.playMusic(this.pendingMusic, this.pendingOwner);
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
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.0001;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = (Save.settings.music != null) ? Save.settings.music : 0.45;
    this.musicGain.connect(this.musicBus);
    this.musicBus.connect(this.master);
    this.master.connect(ctx.destination);
  }

  applySettings() {
    if (this.sfxGain) this.sfxGain.gain.value = Save.settings.sfx;
    if (this.musicBus) this.musicBus.gain.value = (Save.settings.music != null) ? Save.settings.music : 0.45;
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

  watch(node, extras) {
    this.activeNodes += 1;
    node.onended = () => {
      this.activeNodes = Math.max(0, this.activeNodes - 1);
      try { node.disconnect(); } catch (err) { /* already gone */ }
      if (!extras) return;
      for (let i = 0; i < extras.length; i += 1) {
        try { extras[i].disconnect(); } catch (err) { /* already gone */ }
      }
    };
  }

  tone(freq, dur, type, gain, slideTo, when) {
    if (!this.ctx || this.vol() <= 0) return;
    const now = this.ctx.currentTime;
    const t = (typeof when === 'number' && when > now) ? when : now;
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
    this.watch(osc, [amp]);
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
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * this.vol()), t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
    this.watch(src, [filter, amp]);
  }

  playMusic(name, owner) {
    if (!LOOPS[name]) return;
    this.pendingMusic = name;
    this.pendingOwner = owner || null;
    if (!this.ctx) return;
    if (this.music === name && this.loopOn) {
      this.musicOwner = owner || this.musicOwner;
      return;
    }
    this.stopLoop(false);
    this.music = name;
    this.musicOwner = owner || null;
    this.loopOn = true;
    this.stepI = 0;
    if (this.musicGain) {
      const t = this.ctx.currentTime;
      const g = this.musicGain.gain;
      const now = Math.max(0.0001, g.value || 0.0001);
      g.cancelScheduledValues(t);
      g.setValueAtTime(now, t);
      g.exponentialRampToValueAtTime(0.0001, t + 0.04);
      g.exponentialRampToValueAtTime(Math.max(0.0001, TUNING.audio.musicGain), t + 0.14);
    }
    this.scheduleStep();
  }

  stopMusic(owner) {
    if (owner && this.musicOwner && this.musicOwner !== owner) return;
    this.pendingMusic = null;
    this.pendingOwner = null;
    this.stopLoop(true);
  }

  stopLoop(ramp) {
    this.loopOn = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = 0;
    this.music = null;
    this.musicOwner = null;
    if (ramp && this.ctx && this.musicGain) {
      const t = this.ctx.currentTime;
      const g = this.musicGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.exponentialRampToValueAtTime(0.0001, t + 0.06);
    }
  }

  scheduleStep() {
    if (!this.loopOn || !this.music) return;
    const name = this.music;
    const bpm = name === 'boss' ? TUNING.audio.bossBpm : (name === 'flying' ? TUNING.audio.flyBpm : TUNING.audio.titleBpm);
    const step = 60 / bpm;
    const tick = () => {
      if (!this.loopOn || this.music !== name) return;
      const running = this.ctx && this.ctx.state === 'running' && !this.hidden;
      if (running) this.blip(name, step);
      this.musicTimer = setTimeout(tick, step * 1000);
    };
    tick();
  }

  blip(name, step) {
    const row = LOOPS[name];
    if (!row || !this.ctx || !this.musicGain) return;
    const tuba = name === 'flying' && this.musicVariant === 'tuba';
    let freq = row[this.stepI % row.length];
    this.stepI += 1;
    if (tuba) freq *= 0.5;
    const t = this.ctx.currentTime;
    const dur = Math.max(0.08, step * (tuba ? 0.92 : 0.7));
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = tuba ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    const peak = Math.max(0.0001, TUNING.audio.noteGain);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    this.watch(osc, [amp]);
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
      case 'tilt':
        this.tone(220, 0.12, 'square', 0.14, 90);
        this.tone(110, 0.18, 'sawtooth', 0.08, 60);
        break;
      case 'horn':
        this.burst(0.28, 0.35, 180);
        this.tone(140, 0.3, 'sawtooth', 0.16, 70);
        break;
      case 'honk':
        this.tone(520, 0.08, 'square', 0.1, 340);
        this.tone(380, 0.1, 'square', 0.08, 260);
        break;
      case 'tuba':
        this.tone(98, 0.24, 'sawtooth', 0.14, 72);
        this.tone(146, 0.2, 'triangle', 0.07, 110);
        break;
      case 'srank':
        return this.srank();
      default:
        break;
    }
  }

  srank() {
    if (!this.unlocked || !this.ctx || this.vol() <= 0) return false;
    const notes = TUNING.fx.jingle;
    if (!notes || !notes.length) return false;
    const step = TUNING.fx.jingleStep;
    const dur = TUNING.fx.jingleDur;
    const gain = TUNING.fx.jingleGain;
    const t0 = this.ctx.currentTime + 0.02;
    for (let i = 0; i < notes.length; i += 1) {
      this.tone(notes[i], dur, 'square', gain, 0, t0 + i * step);
    }
    return true;
  }
}

export const Audio = new AudioManager();
