import { CONFIG, TUNING } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { rng } from '../rng.js?v=1';
import { qaLog } from '../qalog.js?v=1';
import { awardKill } from './scoring.js?v=1';
import { onBoss } from '../achievements.js?v=1';
import { screenShake, flashImage, noteFlash } from './fx.js?v=1';

const NAMES = {
  blimp: 'BUZZARD BLIMP',
  magnet: 'MAGNET TRUCK',
  twister: 'JUNK TWISTER',
  vulture: 'VULTURE ONE',
};
const DOWN = {
  blimp: 'BLIMP DOWN',
  magnet: 'EARL IS DONE',
  twister: 'TWISTER DIES',
  vulture: 'VULTURE DOWN',
};
const SNAG = ['mattress', 'pinball', 'tuba', 'statue'];
const LINES = {
  blimp: ['Nice haircut, Pete!', 'We haul. You cry.', 'Give it up, Air Rescue!'],
  magnet: ['Earl says pull him down!', 'Closer. The magnet likes you.', 'Swing that junk and see.', 'Cab smells like pennies!'],
  twister: ['Yard sale! Everything must go!', 'The core is the soft bit!', 'Snag it if you can hold it!'],
  vulture: [
    'Brother, you are drifting left!',
    'I am flying. Stop grabbing the stick!',
    'That was my shot, you hog!',
    'Pete! Tell him he is wrong!',
    'I had him! You sneezed!',
  ],
  vulture2: [
    'Move over. I fly better.',
    'You parachuted. I did not.',
    'Stop yelling from the chute!',
    'My stick now. Sit down!',
    'We practiced this. You blinked.',
  ],
};

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < (aw + bw) && Math.abs(ay - by) * 2 < (ah + bh);
}

export class BossSys {
  constructor(world) { this.w = world; }

  spawn(id, opts) {
    const kind = NAMES[id] ? id : 'blimp';
    if (this.w.boss) this.destroy();
    const o = opts || {};
    const mini = !!o.mini;
    const sc = mini ? TUNING.endless.miniScale : 1;
    const mul = mini ? TUNING.endless.miniHp : 1;
    const hp = (n) => Math.max(1, Math.round(n * mul));
    const s = this.w.scene;
    const bx = o.x || (kind === 'magnet' ? 1120 : kind === 'twister' ? 980 : 1180);
    const by = o.y || (kind === 'magnet' ? CONFIG.GROUND_Y - 30 : kind === 'twister' ? 230 : kind === 'vulture' ? 200 : 210);
    const bodyTex = kind === 'magnet' ? 'boss-truck' : kind === 'twister' ? 'boss-twister' : kind === 'vulture' ? 'boss-vulture' : 'blimp';
    const bodySc = (kind === 'blimp' ? 1.35 : kind === 'vulture' ? 1.25 : 1.15) * sc;
    const body = s.add.image(bx, by, bodyTex).setDepth(10).setScale(bodySc);
    const parts = [];
    const add = (role, tex, ox, oy, w, h, max, extra) => {
      const im = s.add.image(bx + ox, by + oy, tex).setDepth(11).setScale((extra && extra.scale ? extra.scale : 1) * sc);
      parts.push({
        role, hp: max, max, live: !(extra && extra.gate), gate: !!(extra && extra.gate),
        ox, oy, baseOy: oy, w, h, img: im, crew: !!(extra && extra.crew), wx: bx + ox, wy: by + oy,
      });
    };
    if (kind === 'blimp') {
      const offs = [[-90, 50], [0, 62], [90, 50]];
      for (let i = 0; i < 3; i += 1) add('pod', 'pod', offs[i][0], offs[i][1], 36, 32, hp(TUNING.bosses.blimpPodHp), { crew: true });
      add('gondola', 'gondola', 0, 88, 70, 32, hp(TUNING.bosses.blimpGondolaHp), { gate: true, crew: true });
    } else if (kind === 'magnet') {
      add('cab', 'boss-truck', 0, 8, 120, 46, hp(TUNING.bosses.magnetCabHp), { crew: true, scale: 0.01 });
      parts[parts.length - 1].img.setVisible(false);
      add('crane', 'boss-crane', 46, -58, 54, 28, hp(TUNING.bosses.magnetCraneHp), { scale: 1.1 });
      add('magnet', 'boss-magnet', 78, -18, 40, 36, hp(TUNING.bosses.magnetHeadHp), { scale: 1.15 });
    } else if (kind === 'twister') {
      const plates = Math.max(0, TUNING.bosses.twisterJunk - TUNING.bosses.twisterCargo);
      for (let i = 0; i < plates; i += 1) {
        add('plate', 'boss-plate', 0, 0, 28, 28, hp(TUNING.bosses.twisterPlateHp), { scale: 1 });
        parts[parts.length - 1].ang0 = (i / Math.max(1, plates)) * Math.PI * 2;
        parts[parts.length - 1].rad = 78 + (i % 3) * 26;
      }
      add('core', 'boss-twister', 0, 0, 48, 64, hp(TUNING.bosses.twisterCoreHp), { scale: 0.55 });
    } else {
      const slice = Math.max(1, Math.round((TUNING.bosses.vulturePhaseHp * 2 * mul) / 4));
      add('gun', 'boss-vgun', -70, 18, 36, 24, slice, { crew: false, scale: 1 });
      add('gun', 'boss-vgun', 70, 18, 36, 24, slice, { scale: 1 });
      add('wing', 'boss-vulture', -20, 36, 80, 28, slice, { scale: 0.01 });
      parts[parts.length - 1].img.setVisible(false);
      add('core', 'boss-vgun', 0, 8, 44, 28, slice, { scale: 0.9 });
    }
    let maxHp = 0;
    for (let i = 0; i < parts.length; i += 1) maxHp += parts[i].max;
    const label = s.add.text(bx, by - 90, (mini ? 'MINI ' : '') + NAMES[kind], {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '16px', color: '#ffb020',
    }).setOrigin(0.5).setDepth(12);
    const boss = {
      id: kind, x: bx, y: by, alive: true, phase: 1, maxHp, mini, parts, body, label,
      stun: 0, cool: 0.8, spin: 0, dir: 1, hw: kind === 'magnet' ? 170 : kind === 'twister' ? 70 : 220,
      hh: kind === 'magnet' ? 64 : kind === 'twister' ? 80 : 86, swirl: [],
    };
    this.w.boss = boss;
    this.w.bossLabel = label;
    if (kind === 'twister') this.armTwister(boss);
    this.mirror(boss);
    this.sync(boss);
    return boss;
  }

  armTwister(b) {
    const n = TUNING.bosses.twisterCargo | 0;
    for (let i = 0; i < n; i += 1) {
      const id = SNAG[i % SNAG.length];
      const c = this.w.addCargo(id, b.x, b.y, { orbit: true });
      if (!c) continue;
      b.swirl.push({ cargo: c, ang0: Math.PI / n + (i / n) * Math.PI * 2, rad: 96 + (i % 2) * 30 });
    }
  }

  destroy() {
    const b = this.w.boss;
    if (!b) return;
    if (b.body) b.body.destroy();
    if (b.label) b.label.destroy();
    for (let i = 0; i < b.parts.length; i += 1) if (b.parts[i].img) b.parts[i].img.destroy();
    if (this.w.bossLabel === b.label) this.w.bossLabel = null;
    this.w.boss = null;
  }

  force(id) { this.spawn(id || (this.w.sortie && this.w.sortie.bossId) || 'blimp'); }

  mirror(b) {
    if (!b || b.id !== 'blimp') return;
    const g = b.parts[b.parts.length - 1];
    b.pods = [];
    for (let i = 0; i < b.parts.length; i += 1) if (b.parts[i].role === 'pod') b.pods.push(b.parts[i]);
    b.gondola = g.img;
    b.gondolaHp = g.hp;
    b.gondolaLive = !!g.live;
  }

  sync(b) {
    b.body.setPosition(b.x, b.y);
    b.label.setPosition(b.x, b.y - 78);
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      p.wx = b.x + p.ox;
      p.wy = b.y + p.oy;
      if (p.img) p.img.setPosition(p.wx, p.wy);
    }
  }

  update(dt) {
    const b = this.w.boss;
    if (!b || !b.alive) return;
    if (this.w.buffs.stunned > 0) return;
    if (b.stun > 0) {
      b.stun -= dt;
      if (b.body) b.body.setTint(0x88bbff);
      this.sync(b);
      return;
    }
    if (b.body && b.phase < 2) b.body.clearTint();
    if (b.id === 'blimp') this.moveBlimp(b, dt);
    else if (b.id === 'magnet') this.moveMagnet(b, dt);
    else if (b.id === 'twister') this.moveTwister(b, dt);
    else this.moveVulture(b, dt);
    this.expose(b);
    this.mirror(b);
    this.sync(b);
    if (b.id === 'magnet') this.pull(b, dt);
    if (b.id === 'twister') this.pinSwirl(b);
    this.talk(b, dt);
    this.attack(b, dt);
    this.touch(b);
  }

  moveBlimp(b, dt) {
    b.x += Math.sin(this.w.time * 0.4) * 18 * dt;
    b.y = (b.mini ? 180 : 200) + Math.sin(this.w.time * 0.7) * 16;
    const lo = b.mini ? 180 : 700;
    if (b.x > this.w.worldW - 200) b.x = this.w.worldW - 200;
    if (b.x < lo) b.x = lo;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.role === 'pod' && p.live && p.img) p.img.rotation += dt * 8;
    }
  }

  moveMagnet(b, dt) {
    b.x += Math.sin(this.w.time * 0.35) * 14 * dt;
    const lo = b.mini ? 160 : 760;
    b.x = Math.max(lo, Math.min(this.w.worldW - 140, b.x));
    b.y = CONFIG.GROUND_Y - 30;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.role === 'magnet') p.oy = p.baseOy + Math.sin(this.w.time * 1.6) * 32;
      if (p.role === 'crane' && p.img) p.img.rotation = Math.sin(this.w.time * 1.6) * 0.18;
    }
  }

  moveTwister(b, dt) {
    const sp = TUNING.bosses.twisterSpeed * (b.mini ? 0.85 : 1);
    b.x += b.dir * sp * dt;
    if (b.x > this.w.worldW - 160) b.dir = -1;
    if (b.x < (b.mini ? 180 : 480)) b.dir = 1;
    b.y = 220 + Math.sin(this.w.time * 0.85) * 28;
    b.spin += dt * TUNING.bosses.twisterSpin;
    let k = 0;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.role !== 'plate') continue;
      const a = b.spin + (p.ang0 || 0);
      p.ox = Math.cos(a) * (p.rad || 90);
      p.oy = Math.sin(a) * (p.rad || 90) * 0.72;
      if (p.img) p.img.rotation += dt * 3;
      k += 1;
    }
    if (b.body) b.body.rotation = Math.sin(this.w.time * 2) * 0.08;
  }

  pinSwirl(b) {
    const w = this.w;
    for (let i = 0; i < b.swirl.length; i += 1) {
      const s = b.swirl[i];
      const c = s.cargo;
      if (!c || c.status !== 'waiting') continue;
      const a = b.spin * 1.15 + s.ang0;
      c.x = b.x + Math.cos(a) * s.rad;
      c.y = b.y + Math.sin(a) * s.rad * 0.72;
      c.img.setPosition(c.x, c.y);
      if (w.invuln <= 0 && !Session.godMode && overlap(c.x, c.y, c.w, c.h, w.px, w.py, 70, 28)) {
        w.hurtSrc = 'twister';
        w.hurtPlayer();
      }
    }
  }

  moveVulture(b, dt) {
    const p2 = b.phase >= 2;
    const sp = p2 ? TUNING.bosses.vultureSpeed2 : TUNING.bosses.vultureSpeed;
    b.x += Math.sin(this.w.time * (p2 ? 1.35 : 0.45)) * sp * dt;
    b.y = (p2 ? 250 : 190) + Math.sin(this.w.time * (p2 ? 1.4 : 0.8)) * (p2 ? 46 : 18);
    const lo = b.mini ? 160 : 620;
    b.x = Math.max(lo, Math.min(this.w.worldW - 160, b.x));
    if (b.body) b.body.rotation = Math.sin(this.w.time * (p2 ? 3 : 1.2)) * (p2 ? 0.12 : 0.04);
  }

  pull(b, dt) {
    let mx = b.x;
    let my = b.y;
    for (let i = 0; i < b.parts.length; i += 1) {
      if (b.parts[i].role === 'magnet') { mx = b.parts[i].wx; my = b.parts[i].wy; }
    }
    const dx = mx - this.w.px;
    const dy = my - this.w.py;
    const dist = Math.hypot(dx, dy) || 1;
    const R = TUNING.bosses.magnetRadius * (b.mini ? 0.75 : 1);
    if (dist >= R) return;
    const f = 1 - dist / R;
    const pull = TUNING.bosses.magnetPull * f;
    this.w.vy += pull * dt * 3.1;
    this.w.py += pull * dt * 0.5;
    this.w.vx += (dx / dist) * pull * dt * 0.45;
  }

  talk(b, dt) {
    this.w.insultT -= dt;
    if (this.w.insultT > 0) return;
    this.w.insultT = 4.6 + rng.range(0, 1.6);
    const key = b.id === 'vulture' && b.phase >= 2 ? 'vulture2' : b.id;
    const own = LINES[key] || LINES.blimp;
    const extra = this.w.sortie && this.w.sortie.insults;
    const line = extra && rng() < 0.35 ? rng.pick(extra) : rng.pick(own);
    this.w.fx.popText(b.x, b.y - 110, line, '#ffb020');
  }

  shot(x, y, ang, speed) {
    const s = this.w.ebullets.spawn(x, y);
    if (!s) return;
    s._vx = Math.cos(ang) * speed;
    s._vy = Math.sin(ang) * speed;
    s._life = 3.2;
  }

  attack(b, dt) {
    b.cool -= dt;
    if (b.cool > 0) return;
    const w = this.w;
    if (b.id === 'blimp') {
      b.cool = TUNING.bosses.blimpShotEvery;
      const ang = Math.atan2(w.py - (b.y + 80), w.px - b.x);
      this.shot(b.x, b.y + 80, ang, 200);
    } else if (b.id === 'magnet') {
      b.cool = TUNING.bosses.magnetShotEvery;
      const ang = Math.atan2(w.py - b.y, w.px - b.x);
      this.shot(b.x - 10, b.y - 8, ang, 190);
    } else if (b.id === 'vulture') {
      const p2 = b.phase >= 2;
      b.cool = p2 ? TUNING.bosses.vultureShotEvery2 : TUNING.bosses.vultureShotEvery;
      const base = Math.atan2(w.py - b.y, w.px - b.x);
      if (p2) {
        const v2 = TUNING.bosses.vultureShotSpeed2;
        this.shot(b.x, b.y + 10, base - TUNING.bosses.vultureSpread2, v2);
        this.shot(b.x, b.y + 10, base, v2);
        this.shot(b.x, b.y + 10, base + TUNING.bosses.vultureSpread2, v2);
      } else this.shot(b.x + 40, b.y + 12, base, TUNING.bosses.vultureShotSpeed);
    }
  }

  touch(b) {
    const w = this.w;
    if (w.invuln > 0 || Session.godMode) return;
    if (overlap(b.x, b.y, b.hw, b.hh, w.px, w.py, 70, 28)) {
      w.hurtSrc = b.id;
      w.hurtPlayer();
      return;
    }
    if (b.id !== 'twister') return;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.role === 'plate' && !p.live) continue;
      if (overlap(p.wx, p.wy, p.w, p.h, w.px, w.py, 70, 28)) {
        w.hurtSrc = 'twister';
        w.hurtPlayer();
        return;
      }
    }
  }

  hit(x, y, w, h, dmg, wreck) {
    const b = this.w.boss;
    if (!b || !b.alive) return false;
    this._didFlash = false;
    if (wreck && b.id === 'magnet') {
      let head = null;
      for (let i = 0; i < b.parts.length; i += 1) if (b.parts[i].role === 'magnet') head = b.parts[i];
      if (head && head.live && overlap(x, y, w, h, head.wx, head.wy, head.w, head.h)) {
        this.apply(b, head, TUNING.bosses.magnetShort, true);
        for (let i = 0; i < b.parts.length; i += 1) {
          const p = b.parts[i];
          if (p !== head && p.live) this.apply(b, p, TUNING.bosses.magnetSplash, true);
        }
        b.stun = TUNING.bosses.magnetStun;
        this.w.fx.popText(head.wx, head.wy - 28, 'SHORT OUT', '#7af0ff');
        if (this._didFlash) noteFlash();
        this.afterHit(b, wreck);
        return true;
      }
    }
    let hit = false;
    const slow = b.id === 'magnet' && !wreck && dmg <= 1.01;
    const dealt = slow ? dmg * TUNING.bosses.magnetBullet : dmg;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (!p.live) continue;
      if (overlap(x, y, w, h, p.wx || (b.x + p.ox), p.wy || (b.y + p.oy), p.w, p.h)) {
        this.apply(b, p, dealt, wreck);
        hit = true;
      }
    }
    if (hit) {
      if (this._didFlash) noteFlash();
      this.afterHit(b, wreck);
    }
    return hit;
  }

  apply(b, p, dmg, wreck) {
    p.hp -= dmg;
    if (p.img && flashImage(p.img)) this._didFlash = true;
    if (p.hp > 0) return;
    p.hp = 0;
    p.live = false;
    if (!p.gate && p.img) p.img.setVisible(false);
    this.w.fx.scrap(p.wx || b.x, p.wy || b.y);
    if (p.role === 'pod') {
      const pts = awardKill(300, wreck);
      this.w.fx.popText(p.wx, p.wy, (wreck ? 'WRECKING BALL +' : 'POD +') + pts, '#ffb020');
      this.w.spawnPilot(p.wx, p.wy);
    } else if (p.role !== 'core' && p.role !== 'gondola') {
      const pts = awardKill(TUNING.bosses.partPoints, wreck);
      this.w.fx.popText(p.wx || b.x, (p.wy || b.y) - 16, '+' + pts, '#ffb020');
      if (p.crew) this.w.spawnPilot(p.wx || b.x, p.wy || b.y);
    }
  }

  expose(b) {
    let gated = false;
    let open = true;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.gate) gated = true;
      else if (p.live) open = false;
    }
    if (!gated || !open) return;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.gate && p.hp > 0) p.live = true;
    }
  }

  afterHit(b, wreck) {
    this.expose(b);
    this.mirror(b);
    if (this.hp() <= 0) this.defeat(wreck);
    else this.checkPhase(b);
  }

  checkPhase(b) {
    if (!b || b.id !== 'vulture' || b.phase >= 2) return;
    if (this.hp() > b.maxHp * 0.5) return;
    b.phase = 2;
    qaLog('bossPhase', { id: 'vulture', phase: 2 });
    this.w.fx.popText(b.x, b.y - 96, 'Brother 1 bails. You fly it!', '#ffb020');
    this.w.fx.popText(b.x + 16, b.y - 64, 'Brother 2: About time!', '#ff7a18');
    this.w.spawnPilot(b.x - 24, b.y);
    if (b.body) b.body.setTint(0xff7744);
  }

  defeat(wreck) {
    const b = this.w.boss;
    if (!b || !b.alive) return;
    b.alive = false;
    screenShake(this.w.scene, 'boom');
    this.w.fx.scrap(b.x, b.y);
    this.w.fx.scrap(b.x - 36, b.y + 16);
    this.w.fx.scrap(b.x + 30, b.y + 8);
    if (b.body) b.body.setVisible(false);
    if (b.label) b.label.setVisible(false);
    for (let i = 0; i < b.parts.length; i += 1) if (b.parts[i].img) b.parts[i].img.setVisible(false);
    for (let i = 0; i < b.swirl.length; i += 1) {
      const c = b.swirl[i].cargo;
      if (c && c.status === 'waiting') c.orbit = false;
    }
    const pts = awardKill(b.mini ? TUNING.bosses.miniPoints : 2000, !!wreck);
    this.w.fx.popText(b.x, b.y - 20, (DOWN[b.id] || 'BOSS DOWN') + ' +' + pts, '#ffe14a');
    qaLog('bossDefeated', { id: b.id, points: pts });
    if (!b.mini) onBoss(b.id, false);
    this.w.spawnPilot(b.x, b.y + 10);
    if (b.mini) {
      if (this.w.endless) this.w.endless.miniBosses += 1;
      return;
    }
    Session.won = true;
    this.w.scene.time.delayedCall(900, () => this.w.endSortie());
  }

  hp() {
    const b = this.w.boss;
    if (!b || !b.alive) return 0;
    if (b.id === 'blimp' && b.pods) {
      let hp = 0;
      for (let i = 0; i < b.pods.length; i += 1) if (b.pods[i].live) hp += Math.max(0, b.pods[i].hp);
      if (b.gondolaLive) hp += Math.max(0, b.gondolaHp);
      else hp += b.gondolaHp;
      return hp;
    }
    let hp = 0;
    for (let i = 0; i < b.parts.length; i += 1) {
      const p = b.parts[i];
      if (p.gate && !p.live) hp += p.hp;
      else if (p.live) hp += Math.max(0, p.hp);
    }
    return hp;
  }

  setHp(n) {
    const b = this.w.boss;
    if (!b) return;
    if (n <= 0) { this.defeat(false); return; }
    const parts = b.parts;
    let left = n;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (left <= 0) {
        p.live = false;
        p.hp = 0;
        if (p.img && !p.gate) p.img.setVisible(false);
      } else {
        p.live = true;
        p.hp = Math.min(p.max, left);
        left -= p.hp;
        if (p.img && p.role !== 'cab' && p.role !== 'wing') p.img.setVisible(true);
      }
    }
    const last = parts[parts.length - 1];
    last.hp = Math.max(0, left);
    const prevDead = parts.slice(0, -1).every((p) => !p.live);
    last.live = last.gate ? prevDead && last.hp > 0 : last.hp > 0;
    if (last.img && !last.gate) last.img.setVisible(last.hp > 0);
    b.alive = true;
    if (b.body) b.body.setVisible(true);
    if (b.label) b.label.setVisible(true);
    this.mirror(b);
    this.sync(b);
    this.checkPhase(b);
  }
}
