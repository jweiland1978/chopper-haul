import { Audio } from '../audio.js?v=1';
import { ParticlePool } from './pools.js?v=1';

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
    const count = Math.min(n, 14);
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
