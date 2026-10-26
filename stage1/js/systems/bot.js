import { Session } from '../session.js?v=1';

export class Bot {
  constructor(world, input) {
    this.world = world;
    this.input = input;
    this.on = false;
    this.cool = 0;
    this.hoverT = 0;
  }

  set(on) {
    this.on = !!on;
    Session.bot = this.on;
  }

  steer(tx, ty, speed = 1) {
    const dx = tx - this.world.px;
    const dy = ty - this.world.py;
    const mag = Math.hypot(dx, dy) || 1;
    this.input.ax = (dx / mag) * speed;
    this.input.ay = (dy / mag) * speed;
    if (mag < 28) {
      this.input.ax *= mag / 28;
      this.input.ay *= mag / 28;
    }
  }

  dodge(radius = 90, weight = 0.85) {
    const w = this.world;
    let dodgeX = 0;
    let dodgeY = 0;
    w.ebullets.forEach((b) => {
      const rx = b.x - w.px;
      const ry = b.y - w.py;
      const vx = b._vx || 0;
      const vy = b._vy || 0;
      const v2 = vx * vx + vy * vy;
      // Predict closest approach within 1.2 s and step sideways out of the bullet's path.
      let tc = v2 > 1 ? -(rx * vx + ry * vy) / v2 : 0;
      tc = Math.max(0, Math.min(1.2, tc));
      const cx = rx + vx * tc;
      const cy = ry + vy * tc;
      const miss = Math.hypot(cx, cy);
      if (miss < 70 && (tc > 0 || rx * rx + ry * ry < radius * radius)) {
        const k = (70 - miss) / 70 + 0.3;
        const m = miss || 1;
        dodgeX -= (cx / m) * k * 100;
        dodgeY -= (cy / m) * k * 100;
      }
    });
    // Also keep clear of enemy aircraft (look a little ahead of their motion).
    for (let i = 0; i < w.enemies.length; i += 1) {
      const e = w.enemies[i];
      if (!e || e.dead || e.alive === false) continue;
      const ex = e.x + (e.vx || 0) * 0.4;
      const ey = e.y + (e.vy || 0) * 0.4;
      const dx = ex - w.px;
      const dy = ey - w.py;
      const r = radius + 40;
      if (dx * dx + dy * dy < r * r) {
        dodgeX -= dx * 1.5;
        dodgeY -= dy * 1.5;
      }
    }
    const mag = Math.hypot(dodgeX, dodgeY);
    if (mag < 1) return;
    this.input.ax += (dodgeX / mag) * weight;
    this.input.ay += (dodgeY / mag) * weight;
    const m = Math.hypot(this.input.ax, this.input.ay);
    if (m > 1) {
      this.input.ax /= m;
      this.input.ay /= m;
    }
  }

  update(dt) {
    if (!this.on || Session.paused || Session.crashed || this.world.finished) return;
    this.cool -= dt;
    this.input.fireHeld = true;
    Session.autofire = true;

    const w = this.world;
    if (w.boss && w.boss.alive) {
      // Line up with a live pod (or the gondola once the pods are gone), keep distance, dodge hard.
      const b = w.boss;
      const live = b.pods.filter((p) => p.live);
      const ty = live.length ? b.y + live[0].oy : b.y + 88;
      this.steer(b.x - 320, ty, 0.9);
      this.dodge(150, 1.4);
      return;
    }

    if (w.carrying) {
      const pad = w.pad;
      this.steer(pad.x, pad.y - 120, 1);
      this.dodge();
      const c = w.carrying;
      if (w.overPad(c) && this.cool <= 0) {
        this.cool = 0.35;
        w.tapWinch();
      }
      return;
    }

    if (w.hookState === 'dropping' || w.hookState === 'hanging') {
      this.input.ax *= 0.2;
      this.input.ay *= 0.2;
      this.dodge();
      this.hoverT += dt;
      if (this.hoverT > 1.6 && this.cool <= 0) {
        this.cool = 0.3;
        w.tapWinch();
        this.hoverT = 0;
      }
      return;
    }

    let best = null;
    let bestD = 1e9;
    for (let i = 0; i < w.cargo.length; i += 1) {
      const c = w.cargo[i];
      if (c.status !== 'waiting') continue;
      const d = Math.hypot(c.x - w.px, c.y - 90 - w.py);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      this.steer(best.x, best.y - 92, 1);
      if (Math.abs(w.px - best.x) < 36 && Math.abs(w.py - (best.y - 92)) < 40 && w.hookState === 'stowed' && this.cool <= 0) {
        this.cool = 0.4;
        this.hoverT = 0;
        w.tapWinch();
      }
    } else {
      this.steer(w.pad.x, 220, 0.6);
    }
    this.dodge();
  }
}
