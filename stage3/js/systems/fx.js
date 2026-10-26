import { Audio } from '../audio.js?v=2';
import { Save } from '../save.js?v=2';
import { CONFIG, TUNING } from '../config.js?v=2';
import { ParticlePool } from './pools.js?v=2';

const fxTotals = { shakes: 0, flashes: 0, pops: 0, jingles: 0 };

function reduced() {
  return !!(Save.settings && Save.settings.reduceFx);
}

export function fxCounts() {
  return {
    shakes: fxTotals.shakes,
    flashes: fxTotals.flashes,
    pops: fxTotals.pops,
    jingles: fxTotals.jingles,
  };
}

export function noteJingle() {
  fxTotals.jingles += 1;
}

export function noteFlash() {
  fxTotals.flashes += 1;
}

export function screenShake(scene, kind) {
  if (reduced()) return;
  const cam = scene && scene.cameras && scene.cameras.main;
  if (!cam || typeof cam.shake !== 'function') return;
  const ms = TUNING.fx.shakeMs;
  const mag = kind === 'boom' ? TUNING.fx.shakeBoom : TUNING.fx.shakeHit;
  if (!(ms > 0) || !(mag > 0)) return;
  cam.shake(ms, mag);
  fxTotals.shakes += 1;
}

export function flashImage(img) {
  if (reduced()) return false;
  if (!img || typeof img.setTint !== 'function' || img.active === false) return false;
  img.setTint(0xffffff);
  const scene = img.scene;
  const ms = TUNING.fx.flashMs | 0;
  if (scene && scene.time && scene.time.delayedCall) {
    scene.time.delayedCall(ms, () => {
      if (img && img.active && img.clearTint) img.clearTint();
    });
  }
  return true;
}

export function comboPop(mult) {
  const scene = globalThis.__CHOPPAH_PLAY;
  if (!scene || !scene.add || !scene.sys || !scene.sys.isActive()) return;
  const world = scene.world;
  const cam = scene.cameras && scene.cameras.main;
  const x = world && typeof world.px === 'number' ? world.px : ((cam ? cam.scrollX : 0) + CONFIG.WIDTH * 0.35);
  const y = world && typeof world.py === 'number' ? world.py - 36 : 150;
  const t = scene.add.text(x, y, 'x' + mult, {
    fontFamily: CONFIG.FONTS.pixel,
    fontSize: (TUNING.fx.popFont | 0) + 'px',
    color: '#ffe14a',
  }).setOrigin(0.5).setDepth(96);
  fxTotals.pops += 1;
  const rise = TUNING.fx.popRise;
  const ms = TUNING.fx.popMs;
  const fade = () => {
    if (!scene.sys || !scene.sys.isActive() || !t.active) return;
    scene.tweens.add({
      targets: t,
      y: y - rise,
      alpha: 0,
      duration: ms,
      onComplete: () => { if (t.active) t.destroy(); },
    });
  };
  if (reduced()) {
    fade();
    return;
  }
  t.setScale(TUNING.fx.popFrom);
  scene.tweens.add({
    targets: t,
    scaleX: TUNING.fx.popScale,
    scaleY: TUNING.fx.popScale,
    duration: Math.round(ms * 0.35),
    onComplete: () => {
      if (!scene.sys || !scene.sys.isActive() || !t.active) return;
      scene.tweens.add({
        targets: t,
        scaleX: 1,
        scaleY: 1,
        y: y - rise,
        duration: Math.round(ms * 0.28),
        onComplete: () => {
          if (!scene.sys || !scene.sys.isActive() || !t.active) return;
          scene.tweens.add({
            targets: t,
            alpha: 0,
            duration: Math.round(ms * 0.37),
            onComplete: () => { if (t.active) t.destroy(); },
          });
        },
      });
    },
  });
}

const MAX_SPRITES = 48;
const colors = [0xffb020, 0xffe14a, 0xe23b3b, 0x8a8f9c, 0x5ec8f0, 0x6b3f22];

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.parts = new ParticlePool(80);
    this.sprites = [];
    this.used = 0;
    for (let i = 0; i < MAX_SPRITES; i += 1) {
      const im = scene.add.image(-20, -20, 'px').setVisible(false).setDepth(55);
      this.sprites.push(im);
    }
    this.g = scene.add.graphics().setDepth(55);
  }

  burst(x, y, n, speed, color) {
    let count = Math.min(n, 14);
    if (Save.settings && Save.settings.reduceFx) count = Math.min(count, TUNING.fx.reduceBurst);
    for (let i = 0; i < count; i += 1) {
      const p = this.parts.spawn();
      if (!p) break;
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const sp = speed * (0.4 + Math.random() * 0.8);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 0.35 + Math.random() * 0.35;
      p.max = p.life;
      p.size = 3 + (Math.random() * 4);
      p.color = color || colors[i % colors.length];
      p.grav = 220;
      p.spin = (Math.random() - 0.5) * 8;
      p.rot = 0;
    }
  }

  scrap(x, y) {
    this.burst(x, y, 12, 220, 0x8a8f9c);
    this.burst(x, y, 6, 160, 0xffb020);
    Audio.play('explosion');
  }

  splash(x, y) {
    this.burst(x, y, 8, 140, 0x2e8a9a);
    Audio.play('splash');
  }

  smoke(x, y) {
    if (Save.settings && Save.settings.reduceFx) return;
    const p = this.parts.spawn();
    if (!p) return;
    p.x = x + (Math.random() - 0.5) * 10;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = -40 - Math.random() * 30;
    p.life = 0.5;
    p.max = 0.5;
    p.size = 6;
    p.color = 0x4a5160;
    p.grav = -10;
    p.spin = 0;
    p.rot = 0;
  }

  update(dt) {
    this.used = 0;
    this.parts.update(dt, (p) => {
      if (this.used >= MAX_SPRITES) return;
      const s = this.sprites[this.used];
      this.used += 1;
      const t = p.life / p.max;
      s.setVisible(true).setPosition(p.x, p.y).setTint(p.color).setAlpha(Math.min(1, t * 1.4)).setDisplaySize(p.size, p.size).setRotation(p.rot);
    });
    for (let i = this.used; i < MAX_SPRITES; i += 1) this.sprites[i].setVisible(false);
  }

  popText(x, y, str, color) {
    const t = this.scene.add.text(x, y, str, {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: '18px',
      color: color || '#ffe14a',
    }).setOrigin(0.5).setDepth(90);
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }
}
