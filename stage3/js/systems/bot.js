import { CONFIG } from '../config.js?v=2';
import { Session } from '../session.js?v=2';

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
    if (w.fridges) {
      for (let i = 0; i < w.fridges.length; i += 1) {
        const f = w.fridges[i];
        const fx = f.x + (f.vx || 0) * 0.35;
        const fy = f.y + (f.vy || 0) * 0.35;
        const dx = fx - w.px;
        const dy = fy - w.py;
        if (dx * dx + dy * dy < 150 * 150) {
          dodgeX -= dx * 1.3;
          dodgeY -= dy * 1.6 + 40;
        }
      }
    }
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
      const ram = e.def && e.def.immortal;
      const r = radius + (ram ? 70 : 40);
      if (dx * dx + dy * dy < r * r) {
        dodgeX -= dx * (ram ? 2.2 : 1.5);
        dodgeY -= dy * (ram ? 2.2 : 1.5);
        if (ram) dodgeY -= 70;
      }
    }
    // never get pinned against the sky ceiling or the ground while dodging
    if (dodgeX || dodgeY) {
      if (w.py < 140 && dodgeY < 0) dodgeY = Math.abs(dodgeY) * 0.6 + (140 - w.py) * 2;
      if (w.py > CONFIG.GROUND_Y - 140 && dodgeY > 0) dodgeY = -Math.abs(dodgeY) * 0.6 - (w.py - CONFIG.GROUND_Y + 140) * 2;
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

  separate(x, y, dist) {
    const dx = this.world.px - x;
    const dy = this.world.py - y;
    const d = Math.hypot(dx, dy) || 1;
    if (d >= dist) return;
    this.input.ax += (dx / d) * 0.9;
    this.input.ay += (dy / d) * 0.9;
    const m = Math.hypot(this.input.ax, this.input.ay) || 1;
    if (m > 1) {
      this.input.ax /= m;
      this.input.ay /= m;
    }
  }

  helpPickup(rad) {
    const w = this.world;
    let best = null;
    let bestD = rad;
    if (!w.pickups) return null;
    for (let i = 0; i < w.pickups.length; i += 1) {
      const p = w.pickups[i];
      if (p.kind !== 'wrench' && p.kind !== 'bubble') continue;
      if (p.kind === 'wrench' && Session.armor >= (Session.armorMax || CONFIG.ARMOR)) continue;
      if (p.kind === 'bubble' && w.buffs && w.buffs.bubble > 0) continue;
      const d = Math.hypot(p.x - w.px, p.y - w.py);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // Step vertically out of the line of any shot that will reach us within ~1.4 s.
  evadeBullets() {
    const w = this.world;
    const list = [];
    w.ebullets.forEach((b) => {
      const vx = b._vx || 0; const vy = b._vy || 0;
      const rx = b.x - w.px;
      if (Math.abs(vx) < 20 || rx * vx >= 0) return; // not coming our way
      const tx = -rx / vx;
      if (tx > 1.6) return;
      list.push({ tx, y: b.y + vy * tx });
    });
    const danger = list.some((q) => Math.abs(q.y - w.py) < 48);
    if (!danger) return false;
    // score staying, going up, going down: the worst-case miss distance at each shot's arrival
    const sp = CONFIG.PLAYER_SPEED * 0.8;
    let best = 0; let bestScore = -1;
    for (const dir of [0, -1, 1]) {
      let worst = 1e9;
      for (const q of list) {
        let y = w.py + dir * sp * Math.max(0, q.tx - 0.15);
        y = Math.max(90, Math.min(CONFIG.GROUND_Y - 90, y));
        worst = Math.min(worst, Math.abs(q.y - y));
      }
      if (worst > bestScore + 1) { bestScore = worst; best = dir; }
    }
    this.input.ax = -0.15; this.input.ay = best;
    return true;
  }

  // Geese cannot be shot: side-step a swooping flock at full speed.
  evadeGeese() {
    const w = this.world;
    let gx = 0; let gy = 0; let vx = 0; let vy = 0; let n = 0;
    for (let i = 0; i < w.enemies.length; i += 1) {
      const e = w.enemies[i];
      if (!e || !e.alive || e.type !== 'goose' || e.scared || e.passT > 0) continue;
      const d = Math.hypot(e.x - w.px, e.y - w.py);
      if (d > 360) continue;
      gx += e.x; gy += e.y; vx += e.vx || 0; vy += e.vy || 0; n += 1;
    }
    if (!n) { this.evSide = 0; return false; }
    gx /= n; gy /= n;
    const vm = Math.hypot(vx, vy) || 1;
    // perpendicular to the flock's heading; pick a side once per encounter so we do not dither
    let px = -vy / vm; let py = vx / vm;
    if (!this.evSide) {
      let side = (w.px - gx) * px + (w.py - gy) * py >= 0 ? 1 : -1;
      if (Math.abs((w.px - gx) * px + (w.py - gy) * py) < 20) side = (py * side > 0) === (w.py < 300) ? side : -side;
      this.evSide = side;
    }
    px *= this.evSide; py *= this.evSide;
    if ((w.py < 110 && py < 0) || (w.py > CONFIG.GROUND_Y - 120 && py > 0)) { this.evSide = -this.evSide; px = -px; py = -py; }
    // blend in "straight away from the flock" when it is close (we are twice as fast as a goose)
    const ax = w.px - gx; const ay = w.py - gy; const ad = Math.hypot(ax, ay) || 1;
    const k = ad < 170 ? 1.2 : 0.4;
    px += (ax / ad) * k; py += (ay / ad) * k;
    if (w.py < 100 && py < 0) py = 0.3;
    if (w.py > CONFIG.GROUND_Y - 110 && py > 0) py = -0.3;
    const m = Math.hypot(px, py) || 1;
    this.input.ax = px / m; this.input.ay = py / m;
    return true;
  }

  update(dt) {
    if (!this.on || Session.paused || Session.crashed || this.world.finished) return;
    this.cool -= dt;
    this.input.fireHeld = true;
    Session.autofire = true;

    const w = this.world;
    if (w.boss && w.boss.alive) {
      const b = w.boss;
      const id = b.id || 'blimp';
      if (!Session.godMode) {
        const pk = this.helpPickup(84);
        if (pk && Math.hypot(pk.x - b.x, pk.y - b.y) > 190) {
          this.steer(pk.x, pk.y, 1);
          this.dodge(120, 1.1);
          return;
        }
      }
      if (id === 'magnet') {
        this.steer(b.x - 430, b.y, 0.95);
        this.separate(b.x, b.y, 400);
      } else if (id === 'twister') {
        this.steer(b.x - 370, b.y, 0.95);
        this.separate(b.x, b.y, 330);
      } else {
        const parts = b.parts || b.pods || [];
        const live = parts.filter((p) => p.live);
        let ty = live.length ? b.y + (live[0].oy || 0) : b.y + 88;
        const back = id === 'vulture' && b.phase >= 2 ? 470 : 340;
        // vs Vulture One keep strafing up and down so its aimed spreads miss

        ty = Math.max(150, Math.min(CONFIG.GROUND_Y - 150, ty));
        this.steer(b.x - back, ty, id === 'vulture' ? 1 : 0.9);
      }
      if (id === 'vulture' && this.evadeBullets()) return;
      this.dodge(id === 'magnet' || id === 'twister' ? 170 : 150, 1.4);
      return;
    }

    if (this.evadeGeese()) return;
    if (!w.carrying && this.evadeBullets()) return;

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

    const help = Session.godMode ? null : this.helpPickup(170);
    if (help && w.hookState === 'stowed') {
      this.steer(help.x, help.y, 1);
      this.dodge(110, 1);
      return;
    }

    let near = null;
    let nearD = 130;
    if (w.pickups) {
      for (let i = 0; i < w.pickups.length; i += 1) {
        const p = w.pickups[i];
        const d = Math.hypot(p.x - w.px, p.y - w.py);
        if (d < nearD) { nearD = d; near = p; }
      }
    }
    if (near && w.hookState === 'stowed') {
      this.steer(near.x, near.y, 1);
      this.dodge(110, 1);
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
