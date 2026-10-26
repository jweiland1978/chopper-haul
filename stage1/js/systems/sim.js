import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { rng } from '../rng.js?v=1';
import { Audio } from '../audio.js?v=1';
import { CARGO } from '../data/cargo.js?v=1';
import { ENEMIES, ENEMY_ALIAS } from '../data/enemies.js?v=1';
import { getSortie } from '../data/zones.js?v=1';
import { SpritePool } from './pools.js?v=1';
import { Fx } from './fx.js?v=1';
import { awardKill, awardDeliver, resetCombo, tickCombo } from './scoring.js?v=1';
import { qaLog } from '../qalog.js?v=1';

let _id = 1;
function nid() { _id += 1; return _id; }

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < (aw + bw) && Math.abs(ay - by) * 2 < (ah + bh);
}

export class World {
  constructor(scene, sortieIndex, opts = {}) {
    this.scene = scene;
    this.sortie = getSortie(sortieIndex);
    this.worldW = this.sortie.worldW;
    this.fx = new Fx(scene);
    this.noEnemies = !!(opts.noEnemies || Session.noEnemies);
    this.time = 0;
    this.waveI = 0;
    this.gunCd = 0;
    this.rocketCd = 0.25;
    this.beamOn = false;
    this.finished = false;
    this.crashT = 0;
    this.insultT = 4;
    this.mooT = 0;
    this.hookState = 'stowed';
    this.hookY = 0;
    this.ropeLen = CONFIG.ROPE_MIN;
    this.angle = 0;
    this.omega = 0;
    this.carrying = null;
    this.pad = { ...this.sortie.pad };
    this.cargo = [];
    this.enemies = [];
    this.pickups = [];
    this.pilots = [];
    this.drops = [];
    this.boss = null;
    this.prevVx = 0;
    this.prevVy = 0;

    this.bullets = new SpritePool(scene, 'bullet', 48, 45);
    this.ebullets = new SpritePool(scene, 'ebullet', 48, 44);
    this.rockets = new SpritePool(scene, 'rocket', 8, 46);

    this.buildBg();
    this.buildScenery();
    this.buildPad();
    this.spawnCargo();
    this.buildPlayer();
    this.buildHook();
    this.buildBeam();
    if (this.sortie.boss) this.spawnBoss();

    scene.cameras.main.setBounds(0, 0, this.worldW, CONFIG.HEIGHT);
    scene.cameras.main.startFollow(this.playerImg, true, 0.12, 0.08);
    scene.cameras.main.setDeadzone(240, 200);
  }

  buildBg() {
    const s = this.scene;
    this.sky = s.add.tileSprite(0, 0, this.worldW, 420, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.15, 1).setDepth(0);
    this.sky.tileScaleX = 5;
    this.sky.tileScaleY = 2.4;
    this.far = s.add.tileSprite(0, 220, this.worldW, 260, 'bg-far').setOrigin(0, 0).setScrollFactor(0.4, 1).setDepth(1);
    this.far.tileScaleX = 2.2;
    this.far.tileScaleY = 1.5;
    this.near = s.add.tileSprite(0, CONFIG.WATER_Y - 20, this.worldW, 180, 'bg-near').setOrigin(0, 0).setScrollFactor(0.85, 1).setDepth(8);
    this.near.tileScaleX = 2.5;
    this.near.tileScaleY = 1.2;
    s.add.rectangle(this.worldW / 2, CONFIG.WATER_Y + 90, this.worldW, 180, 0x0a2030).setDepth(7);
  }

  buildScenery() {
    const s = this.scene;
    const kinds = ['barn', 'silo', 'house'];
    for (let x = 180; x < this.worldW - 200; x += 280) {
      const k = kinds[(Math.abs((x * 13) | 0) % 3)];
      const y = CONFIG.GROUND_Y - 20;
      s.add.image(x, y, k).setDepth(3).setScale(k === 'silo' ? 1.4 : 1.2);
      if (x % 560 < 40) s.add.image(x + 90, CONFIG.GROUND_Y + 6, 'bridge').setDepth(3);
    }
  }

  buildPad() {
    const p = this.pad;
    const tex = p.type === 'church' ? 'pad-church' : p.type === 'field' ? 'pad-field' : 'pad-barge';
    this.padImg = this.scene.add.image(p.x, p.y, tex).setDepth(6).setScale(1.6);
    this.padGlow = this.scene.add.rectangle(p.x, p.y - 36, p.w, 10, CONFIG.COLORS.good, 0.35).setDepth(6);
    this.scene.tweens.add({
      targets: this.padGlow,
      alpha: 0.12,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    const label = p.type === 'church' ? 'DROP: CHURCH' : p.type === 'field' ? 'DROP: FIELD' : 'DROP: BARGE';
    this.scene.add.text(p.x, p.y - 70, label, {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '14px', color: '#6adf6a',
    }).setOrigin(0.5).setDepth(6);
  }

  spawnCargo() {
    const list = this.sortie.cargo;
    for (let i = 0; i < list.length; i += 1) {
      const spec = list[i];
      const def = CARGO[spec.id];
      const img = this.scene.add.image(spec.x, spec.y, def.tex).setDepth(12).setScale(1.55);
      this.cargo.push({
        uid: nid(),
        id: def.id,
        def,
        x: spec.x,
        y: spec.y,
        w: def.w,
        h: def.h,
        status: 'waiting',
        water: 1,
        img,
        vx: 0,
        vy: 0,
        fall: null,
      });
    }
  }

  buildPlayer() {
    const s = this.scene;
    this.px = 220;
    this.py = 220;
    this.vx = 0;
    this.vy = 0;
    this.invuln = 0;
    this.playerImg = s.add.image(this.px, this.py, 'chopper').setDepth(20).setScale(1.25);
    this.rotor = s.add.image(this.px, this.py - 28, 'rotor-a').setDepth(21).setScale(1.25);
    this.rotorF = 0;
    this.hay = s.add.image(0, 0, 'haystack').setDepth(15).setVisible(false);
    this.wavePilot = s.add.image(0, 0, 'pilot').setDepth(16).setVisible(false);
  }

  buildHook() {
    this.ropeG = this.scene.add.graphics().setDepth(18);
    this.hookImg = this.scene.add.image(this.px, this.py + 40, 'hook').setDepth(19).setVisible(false);
  }

  buildBeam() {
    this.beamImg = this.scene.add.image(this.px + 80, this.py, 'beam').setDepth(19).setVisible(false).setAlpha(0.75);
  }

  spawnBoss() {
    const s = this.scene;
    const bx = 1180;
    const by = 210;
    const body = s.add.image(bx, by, 'blimp').setDepth(10).setScale(1.35);
    const pods = [];
    const offsets = [[-90, 50], [0, 62], [90, 50]];
    for (let i = 0; i < 3; i += 1) {
      const im = s.add.image(bx + offsets[i][0], by + offsets[i][1], 'pod').setDepth(11);
      pods.push({
        hp: 8, live: true, img: im, ox: offsets[i][0], oy: offsets[i][1], w: 36, h: 32,
      });
    }
    const gondola = s.add.image(bx, by + 88, 'gondola').setDepth(11);
    this.boss = {
      x: bx, y: by, vx: -20, body, pods, gondola, gondolaHp: 14, gondolaLive: false, alive: true, w: 280, h: 110,
    };
    this.bossLabel = s.add.text(bx, by - 90, 'BUZZARD BLIMP', {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '16px', color: '#ffb020',
    }).setOrigin(0.5).setDepth(12);
  }

  attach() { return { x: this.px, y: this.py + 18 }; }

  cargoDrag() {
    if (!this.carrying) return 1;
    return this.carrying.def.drag;
  }

  tapWinch() {
    if (this.hookState === 'stowed') {
      this.hookState = 'dropping';
      this.hookY = this.py + 24;
      this.ropeLen = 40;
      this.hookImg.setVisible(true);
      Audio.play('reel');
    } else if (this.carrying) {
      this.releaseCargo(false);
    } else if (this.hookState === 'dropping' || this.hookState === 'hanging') {
      this.hookState = 'reeling';
      Audio.play('reel');
    }
  }

  tryHook() {
    if (this.carrying || this.hookState === 'stowed') return;
    const hx = this.px;
    const hy = this.hookY;
    for (let i = 0; i < this.cargo.length; i += 1) {
      const c = this.cargo[i];
      if (c.status !== 'waiting') continue;
      if (Math.hypot(hx - c.x, hy - c.y) < 80) {
        this.carrying = c;
        c.status = 'carried';
        this.hookState = 'hooked';
        const att = this.attach();
        this.ropeLen = Math.max(CONFIG.ROPE_MIN, Math.min(CONFIG.ROPE_MAX, Math.hypot(c.x - att.x, c.y - att.y)));
        this.angle = Math.atan2(c.x - att.x, c.y - att.y);
        this.omega = 0;
        Audio.play('hook');
        this.fx.popText(c.x, c.y - 30, 'HOOKED', '#6adf6a');
        return;
      }
    }
  }

  overPad(c) {
    return Math.abs(c.x - this.pad.x) < this.pad.w * 0.55 && c.y < this.pad.y + 20 && c.y > this.pad.y - 180;
  }

  releaseCargo(forced) {
    const c = this.carrying;
    if (!c) {
      this.hookState = 'stowed';
      this.hookImg.setVisible(false);
      return;
    }
    this.carrying = null;
    this.hookState = 'stowed';
    this.hookImg.setVisible(false);
    if (this.overPad(c) && !forced) {
      c.status = 'delivered';
      c.img.setVisible(false);
      let pts = c.def.points;
      if (c.def.slosh) pts += Math.round((c.def.waterBonus || 0) * c.water);
      const hot = Session.combo >= 4;
      const got = awardDeliver(pts, hot);
      Session.lastJoke = c.def.joke;
      Session.jokes.push(c.def.joke);
      this.fx.popText(c.x, c.y - 40, (hot ? 'HOT DELIVERY x' + Session.combo + '  ' : '') + '+' + got, '#ffe14a');
      this.fx.popText(c.x, c.y - 64, c.def.joke, '#f4f0e0');
      Audio.play('pickup');
      this.scene.add.image(this.pad.x + (rng.range(-40, 40)), this.pad.y - 20, c.def.tex).setDepth(7).setScale(0.7);
    } else {
      this.loseCargo(c);
    }
  }

  loseCargo(c) {
    c.status = 'lost';
    if (c.def.kind === 'object') {
      this.fx.scrap(c.x, c.y);
      if (c.def.slosh) this.fx.splash(c.x, c.y);
      c.img.setVisible(false);
      this.fx.popText(c.x, c.y - 24, 'BROKEN', '#e85d4c');
    } else {
      c.fall = c.y > CONFIG.GROUND_Y - 80 ? 'hay' : 'umbrella';
      this.fx.popText(c.x, c.y - 24, c.fall === 'hay' ? 'HAYSTACK' : 'UMBRELLA', '#f4f0e0');
      if (c.fall === 'hay') {
        this.scene.add.image(c.x, CONFIG.GROUND_Y, 'haystack').setDepth(14);
        c.img.setPosition(c.x, CONFIG.GROUND_Y - 18);
      } else {
        const um = this.scene.add.image(c.x, c.y - 28, 'umbrella').setDepth(14);
        c._um = um;
      }
    }
  }

  updatePlayer(dt, input) {
    if (Session.crashed) {
      this.crashT += dt;
      this.vy += 420 * dt;
      this.py += this.vy * dt;
      this.playerImg.rotation += 3.2 * dt;
      this.rotor.setVisible(false);
      if (this.py >= CONFIG.GROUND_Y - 10) {
        this.py = CONFIG.GROUND_Y - 10;
        this.vy = 0;
        this.hay.setVisible(true).setPosition(this.px, CONFIG.GROUND_Y);
        this.wavePilot.setVisible(true).setPosition(this.px + 16, CONFIG.GROUND_Y - 28);
        this.wavePilot.x = this.px + 16 + Math.sin(this.crashT * 8) * 3;
        if (this.crashT > 1.6) this.endSortie();
      }
      this.playerImg.setPosition(this.px, this.py);
      return;
    }

    const drag = this.cargoDrag();
    const spd = CONFIG.PLAYER_SPEED * drag;
    const acc = CONFIG.PLAYER_ACCEL * drag;
    this.vx += input.ax * acc * dt;
    this.vy += input.ay * acc * dt;
    this.vy += 28 * dt;
    this.vx *= Math.max(0, 1 - 3.6 * dt);
    this.vy *= Math.max(0, 1 - 3.6 * dt);
    const mag = Math.hypot(this.vx, this.vy);
    const cap = spd;
    if (mag > cap) {
      this.vx = (this.vx / mag) * cap;
      this.vy = (this.vy / mag) * cap;
    }
    this.px += this.vx * dt;
    this.py += this.vy * dt;
    if (this.px < 50) { this.px = 50; this.vx = 0; }
    if (this.px > this.worldW - 50) { this.px = this.worldW - 50; this.vx = 0; }
    if (this.py < 70) { this.py = 70; this.vy = 0; }
    if (this.py > CONFIG.WATER_Y - 36) {
      this.py = CONFIG.WATER_Y - 36;
      this.vy = Math.min(0, this.vy);
    }
    this.playerImg.setPosition(this.px, this.py);
    this.playerImg.rotation = Phaser.Math.Clamp(this.vx / 420, -0.4, 0.4);
    this.rotorF += dt * 24;
    this.rotor.setTexture((this.rotorF | 0) % 2 === 0 ? 'rotor-a' : 'rotor-b');
    this.rotor.setPosition(this.px, this.py - 28);
    this.rotor.rotation = this.playerImg.rotation;
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.playerImg.setAlpha((this.invuln * 12 | 0) % 2 ? 0.35 : 1);
    } else this.playerImg.setAlpha(1);
    if (Session.armor < CONFIG.ARMOR && rng.chance(dt * 8)) this.fx.smoke(this.px - 18, this.py + 8);
  }

  updateWinch(dt) {
    const att = this.attach();
    if (this.hookState === 'dropping') {
      this.ropeLen = Math.min(CONFIG.ROPE_MAX, this.ropeLen + 280 * dt);
      this.hookY = att.y + this.ropeLen;
      this.hookImg.setPosition(att.x, this.hookY).setVisible(true);
      this.tryHook();
      if (this.ropeLen >= CONFIG.ROPE_MAX && !this.carrying) this.hookState = 'hanging';
    } else if (this.hookState === 'hanging') {
      this.hookY = att.y + this.ropeLen;
      this.hookImg.setPosition(att.x, this.hookY);
      this.tryHook();
    } else if (this.hookState === 'reeling') {
      this.ropeLen = Math.max(0, this.ropeLen - 420 * dt);
      this.hookY = att.y + this.ropeLen;
      this.hookImg.setPosition(att.x, this.hookY);
      if (this.ropeLen <= 8) {
        this.hookState = 'stowed';
        this.hookImg.setVisible(false);
      }
    } else if (this.hookState === 'hooked' && this.carrying) {
      const c = this.carrying;
      const ax = (this.vx - this.prevVx) / Math.max(dt, 0.008);
      const g = 980;
      const L = this.ropeLen;
      const mass = c.def.mass;
      const omegaAcc = (-(g / L) * Math.sin(this.angle) - (ax / L) * Math.cos(this.angle)) / mass - 1.15 * this.omega;
      this.omega += omegaAcc * dt;
      this.angle += this.omega * dt;
      if (this.angle > 1.15) { this.angle = 1.15; this.omega *= -0.3; }
      if (this.angle < -1.15) { this.angle = -1.15; this.omega *= -0.3; }
      c.x = att.x + L * Math.sin(this.angle);
      c.y = att.y + L * Math.cos(this.angle);
      c.img.setPosition(c.x, c.y);
      c.img.rotation = this.angle * 0.35;
      this.hookImg.setPosition(c.x, c.y - c.h * 0.35).setVisible(true);
      if (c.def.moo) {
        this.mooT -= dt;
        if (Math.abs(this.omega) > 1.4 && this.mooT <= 0) {
          Audio.play('moo');
          this.mooT = 0.9;
        }
      }
      if (c.def.slosh && Math.abs(this.omega) > 1.35) {
        c.water = Math.max(0, c.water - dt * 0.35);
        if (rng.chance(dt * 6)) this.fx.splash(c.x, c.y + 10);
      }
      this.wreckCheck(c);
    } else {
      this.hookImg.setVisible(false);
    }

    this.ropeG.clear();
    if (this.hookState !== 'stowed') {
      const endX = this.hookImg.x;
      const endY = this.hookImg.y;
      this.ropeG.lineStyle(2, 0xf4f0e0, 0.9);
      this.ropeG.lineBetween(att.x, att.y, endX, endY);
    }
    this.prevVx = this.vx;
    this.prevVy = this.vy;
  }

  wreckCheck(c) {
    const speed = Math.abs(this.omega) * this.ropeLen + Math.abs(this.vx) * 0.3;
    if (speed < 70 && Math.abs(this.omega) < 0.45) return;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (overlap(c.x, c.y, c.w, c.h, e.x, e.y, e.w, e.h)) this.killEnemy(e, true);
    }
    if (this.boss && this.boss.alive) this.hitBoss(c.x, c.y, c.w, c.h, 6, true);
  }

  fireWeapons(dt, firing) {
    this.gunCd -= dt;
    this.rocketCd -= dt;
    const lvl = Session.gunLevel;
    this.beamOn = firing && lvl >= 4;
    this.beamImg.setVisible(this.beamOn);
    if (this.beamOn) {
      this.beamImg.setPosition(this.px + 90, this.py).setAlpha(0.55 + Math.random() * 0.4);
      this.beamHit(dt);
    }
    if (!firing) return;
    if (lvl < 4 && this.gunCd <= 0) {
      this.gunCd = CONFIG.FIRE_RATE;
      Audio.play('gun');
      if (lvl === 1) this.shoot(this.px + 36, this.py + 4, 0);
      else if (lvl === 2) {
        this.shoot(this.px + 36, this.py - 8, 0);
        this.shoot(this.px + 36, this.py + 12, 0);
      } else {
        this.shoot(this.px + 36, this.py + 4, -0.28);
        this.shoot(this.px + 36, this.py + 4, 0);
        this.shoot(this.px + 36, this.py + 4, 0.28);
      }
    }
    if (this.hookState === 'stowed' && Session.rockets > 0 && this.rocketCd <= 0) {
      this.rocketCd = CONFIG.ROCKET_INTERVAL;
      Session.rockets -= 1;
      this.launchRocket();
    }
  }

  shoot(x, y, ang) {
    const b = this.bullets.spawn(x, y);
    if (!b) return;
    b._vx = Math.cos(ang) * CONFIG.BULLET_SPEED;
    b._vy = Math.sin(ang) * CONFIG.BULLET_SPEED;
    b._life = 1.1;
    b.setRotation(ang);
  }

  launchRocket() {
    const r = this.rockets.spawn(this.px + 20, this.py + 10);
    if (!r) return;
    r._vx = CONFIG.ROCKET_SPEED;
    r._vy = 0;
    r._life = 2.4;
    Audio.play('rocket');
  }

  beamHit(dt) {
    const bx = this.px + CONFIG.BEAM_RANGE * 0.5 + 20;
    const by = this.py;
    const bw = CONFIG.BEAM_RANGE;
    const bh = CONFIG.BEAM_WIDTH;
    const dmg = CONFIG.BEAM_DPS * dt;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (overlap(bx, by, bw, bh, e.x, e.y, e.w, e.h)) this.hurtEnemy(e, dmg, false);
    }
    if (this.boss && this.boss.alive) this.hitBoss(bx, by, bw, bh, dmg, false);
  }

  updateProjectiles(dt) {
    const camR = this.scene.cameras.main.scrollX + CONFIG.WIDTH + 40;
    const camL = this.scene.cameras.main.scrollX - 40;
    this.bullets.forEach((b) => {
      b._life -= dt;
      b.x += b._vx * dt;
      b.y += b._vy * dt;
      if (b._life <= 0 || b.x > camR || b.x < camL) { this.bullets.release(b); return; }
      if (this.projHits(b.x, b.y, 10, 8, 1, false)) this.bullets.release(b);
    });
    this.rockets.forEach((r) => {
      r._life -= dt;
      let tx = r.x + 400;
      let ty = r.y;
      let best = 1e9;
      for (let i = 0; i < this.enemies.length; i += 1) {
        const e = this.enemies[i];
        if (!e.alive) continue;
        const d = (e.x - r.x) * (e.x - r.x) + (e.y - r.y) * (e.y - r.y);
        if (d < best && e.x > r.x - 40) { best = d; tx = e.x; ty = e.y; }
      }
      if (this.boss && this.boss.alive) {
        const d = (this.boss.x - r.x) ** 2 + (this.boss.y - r.y) ** 2;
        if (d < best) { tx = this.boss.x; ty = this.boss.y; }
      }
      const ang = Math.atan2(ty - r.y, tx - r.x);
      const cur = Math.atan2(r._vy, r._vx);
      let diff = ang - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Phaser.Math.Clamp(diff, -2.4 * dt, 2.4 * dt);
      const na = cur + turn;
      const sp = CONFIG.ROCKET_SPEED;
      r._vx = Math.cos(na) * sp;
      r._vy = Math.sin(na) * sp;
      r.x += r._vx * dt;
      r.y += r._vy * dt;
      r.setRotation(na);
      if (r._life <= 0 || r.x > camR + 80) { this.rockets.release(r); return; }
      if (this.projHits(r.x, r.y, 22, 16, 4, false)) {
        this.fx.burst(r.x, r.y, 8, 180, 0xff7a18);
        this.rockets.release(r);
      }
    });
    this.ebullets.forEach((b) => {
      b._life -= dt;
      b.x += b._vx * dt;
      b.y += b._vy * dt;
      if (b._life <= 0 || b.x < camL || b.x > camR || b.y < 0 || b.y > CONFIG.HEIGHT) {
        this.ebullets.release(b);
        return;
      }
      if (this.invuln <= 0 && !Session.godMode && overlap(b.x, b.y, 8, 8, this.px, this.py, 70, 28)) {
        this.ebullets.release(b);
        this.hurtSrc = 'bullet';
        this.hurtPlayer();
      }
    });
  }

  projHits(x, y, w, h, dmg, wreck) {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (overlap(x, y, w, h, e.x, e.y, e.w, e.h)) {
        this.hurtEnemy(e, dmg, wreck);
        return true;
      }
    }
    if (this.boss && this.boss.alive && this.hitBoss(x, y, w, h, dmg, wreck)) return true;
    return false;
  }

  spawnEnemy(type, x, y) {
    const key = ENEMY_ALIAS[String(type).toLowerCase()] || type;
    const def = ENEMIES[key];
    if (!def) return null;
    const img = this.scene.add.image(x, y, def.tex).setDepth(14).setScale(1.25);
    let banner = null;
    if (def.banner) {
      banner = this.scene.add.text(x - 90, y - 22, def.banner, {
        fontFamily: CONFIG.FONTS.pixel, fontSize: '10px', color: '#f4f0e0', backgroundColor: '#e23b3b',
      }).setOrigin(1, 0.5).setDepth(14);
    }
    const e = {
      uid: nid(),
      type: def.id,
      def,
      x, y,
      w: def.w,
      h: def.h,
      hp: def.hp,
      alive: true,
      img,
      banner,
      t: rng.range(0, 6),
      shot: rng.range(0.2, def.shot),
      baseY: y,
    };
    this.enemies.push(e);
    return e;
  }

  updateEnemies(dt) {
    if (!this.noEnemies) {
      while (this.waveI < this.sortie.waves.length && this.time >= this.sortie.waves[this.waveI].t) {
        const w = this.sortie.waves[this.waveI];
        this.waveI += 1;
        this.spawnEnemy(w.type, w.x, w.y);
      }
    }
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      e.t += dt;
      if (e.type === 'duster') {
        e.x -= 90 * dt;
        e.y = e.baseY + Math.sin(e.t * 2.2) * 36;
        if (e.banner) e.banner.setPosition(e.x - 50, e.y - 18);
      } else if (e.type === 'balloon') {
        e.y -= 18 * dt;
        e.x += Math.sin(e.t * 0.8) * 20 * dt;
        if (e.y < 80) e.y = 80;
      } else if (e.type === 'truck') {
        e.x += Math.sin(e.t * 0.6) * 40 * dt;
        e.y = CONFIG.GROUND_Y - 8;
      }
      e.img.setPosition(e.x, e.y);
      if (e.x < this.scene.cameras.main.scrollX - 120) {
        this.despawnEnemy(e, false);
        continue;
      }
      e.shot -= dt;
      if (e.shot <= 0) {
        e.shot = e.def.shot + rng.range(-0.2, 0.3);
        this.enemyShoot(e);
      }
      if (this.invuln <= 0 && !Session.godMode && overlap(e.x, e.y, e.w, e.h, this.px, this.py, 70, 28)) {
        this.hurtSrc = e.def.id || 'enemy';
        this.hurtPlayer();
      }
    }
    this.updateBoss(dt);
    this.updatePilots(dt);
    this.updatePickups(dt);
    this.updateFalls(dt);
  }

  enemyShoot(e) {
    const shoot = (ang, sp) => {
      const b = this.ebullets.spawn(e.x, e.y);
      if (!b) return;
      b._vx = Math.cos(ang) * sp;
      b._vy = Math.sin(ang) * sp;
      b._life = 2.5;
    };
    if (e.type === 'duster') shoot(0.15 + rng.range(-0.1, 0.2), 240);
    else if (e.type === 'balloon') {
      shoot(0, 180); shoot(Math.PI / 2, 180); shoot(Math.PI, 180); shoot(-Math.PI / 2, 180);
    } else {
      const ang = Math.atan2(this.py - e.y, this.px - e.x);
      shoot(ang, 220);
    }
  }

  hurtEnemy(e, dmg, wreck) {
    e.hp -= dmg;
    e.img.setTint(0xff8888);
    this.scene.time.delayedCall(50, () => { if (e.img.active) e.img.clearTint(); });
    if (e.hp <= 0) this.killEnemy(e, wreck);
  }

  killEnemy(e, wreck) {
    if (!e.alive) return;
    e.alive = false;
    const pts = awardKill(e.def.points, wreck);
    this.fx.scrap(e.x, e.y);
    if (e.def.pop) Audio.play('pop');
    this.fx.popText(e.x, e.y - 20, (wreck ? 'WRECKING BALL +' : '+') + pts, wreck ? '#ff7a18' : '#ffe14a');
    e.img.setVisible(false);
    if (e.banner) e.banner.setVisible(false);
    this.spawnPilot(e.x, e.y);
    if (rng.chance(0.28)) this.spawnPow(e.x, e.y);
  }

  despawnEnemy(e) {
    e.alive = false;
    e.img.setVisible(false);
    if (e.banner) e.banner.setVisible(false);
  }

  spawnPilot(x, y) {
    const chute = this.scene.add.image(x, y - 16, 'chute').setDepth(16);
    const pilot = this.scene.add.image(x, y + 10, 'pilot').setDepth(16);
    this.pilots.push({ x, y, chute, pilot, t: 0 });
  }

  updatePilots(dt) {
    for (let i = this.pilots.length - 1; i >= 0; i -= 1) {
      const p = this.pilots[i];
      p.t += dt;
      p.y += 40 * dt;
      p.x += Math.sin(p.t * 3) * 10 * dt;
      p.chute.setPosition(p.x, p.y - 16);
      p.pilot.setPosition(p.x + Math.sin(p.t * 10) * 2, p.y + 10);
      if (p.y > CONFIG.WATER_Y + 20 || p.t > 6) {
        p.chute.destroy();
        p.pilot.destroy();
        this.pilots.splice(i, 1);
      }
    }
  }

  spawnPow(x, y) {
    const img = this.scene.add.image(x, y, 'pow').setDepth(17);
    this.pickups.push({ x, y, img, t: 0 });
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      p.t += dt;
      p.y += Math.sin(p.t * 3) * 8 * dt;
      p.img.setPosition(p.x, p.y);
      if (overlap(p.x, p.y, 24, 24, this.px, this.py, 70, 28)) {
        Session.gunLevel = Math.min(CONFIG.GUN_LEVELS, Session.gunLevel + 1);
        Audio.play('pickup');
        this.fx.popText(p.x, p.y - 20, 'POW ' + Session.gunLevel, '#ffb020');
        p.img.destroy();
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.t > 12) { p.img.destroy(); this.pickups.splice(i, 1); }
    }
  }

  updateFalls(dt) {
    for (let i = 0; i < this.cargo.length; i += 1) {
      const c = this.cargo[i];
      if (c.status !== 'lost' || !c._um) continue;
      c.y += 50 * dt;
      c._um.x = c.x;
      c._um.y = c.y - 28;
      c.img.setPosition(c.x, c.y);
      if (c.y >= CONFIG.GROUND_Y - 10) {
        c._um.destroy();
        c._um = null;
        this.scene.add.image(c.x, CONFIG.GROUND_Y, 'haystack').setDepth(14);
        c.img.setPosition(c.x, CONFIG.GROUND_Y - 18);
      }
    }
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.x += Math.sin(this.time * 0.4) * 18 * dt;
    b.y = 200 + Math.sin(this.time * 0.7) * 16;
    if (b.x > this.worldW - 200) b.x = this.worldW - 200;
    if (b.x < 700) b.x = 700;
    b.body.setPosition(b.x, b.y);
    this.bossLabel.setPosition(b.x, b.y - 90);
    for (let i = 0; i < b.pods.length; i += 1) {
      const p = b.pods[i];
      if (!p.live) continue;
      p.img.setPosition(b.x + p.ox, b.y + p.oy);
      p.img.rotation += dt * 8;
    }
    b.gondola.setPosition(b.x, b.y + 88);
    const podsLeft = b.pods.filter((p) => p.live).length;
    if (podsLeft === 0) b.gondolaLive = true;
    this.insultT -= dt;
    if (this.insultT <= 0) {
      this.insultT = 5 + rng.range(0, 2);
      const line = this.sortie.insults ? rng.pick(this.sortie.insults) : 'Nice haircut, Pete!';
      this.fx.popText(b.x, b.y - 120, line, '#ffb020');
    }
    if (this.time % 1.6 < dt + 0.05) {
      const ang = Math.atan2(this.py - (b.y + 80), this.px - b.x);
      const shot = this.ebullets.spawn(b.x, b.y + 80);
      if (shot) {
        shot._vx = Math.cos(ang) * 200;
        shot._vy = Math.sin(ang) * 200;
        shot._life = 3;
      }
    }
    if (this.invuln <= 0 && !Session.godMode && overlap(b.x, b.y, 240, 90, this.px, this.py, 70, 28)) { this.hurtSrc = 'blimp'; this.hurtPlayer(); }
  }

  hitBoss(x, y, w, h, dmg, wreck) {
    const b = this.boss;
    if (!b || !b.alive) return false;
    let hit = false;
    for (let i = 0; i < b.pods.length; i += 1) {
      const p = b.pods[i];
      if (!p.live) continue;
      const px = b.x + p.ox;
      const py = b.y + p.oy;
      if (overlap(x, y, w, h, px, py, p.w, p.h)) {
        p.hp -= dmg;
        hit = true;
        p.img.setTint(0xffaaaa);
        if (p.hp <= 0) {
          p.live = false;
          p.img.setVisible(false);
          this.fx.scrap(px, py);
          const pts = awardKill(300, wreck);
          this.fx.popText(px, py, (wreck ? 'WRECKING BALL +' : 'POD +') + pts, '#ffb020');
          this.spawnPilot(px, py);
        }
      }
    }
    if (b.gondolaLive && overlap(x, y, w, h, b.x, b.y + 88, 70, 32)) {
      b.gondolaHp -= dmg;
      hit = true;
      b.gondola.setTint(0xffaaaa);
      if (b.gondolaHp <= 0) this.defeatBoss(wreck);
    }
    return hit;
  }

  defeatBoss(wreck) {
    const b = this.boss;
    if (!b.alive) return;
    b.alive = false;
    this.fx.scrap(b.x, b.y);
    this.fx.scrap(b.x - 40, b.y + 20);
    this.fx.scrap(b.x + 40, b.y + 10);
    b.body.setVisible(false);
    b.gondola.setVisible(false);
    this.bossLabel.setVisible(false);
    const pts = awardKill(2000, wreck);
    this.fx.popText(b.x, b.y, 'BLIMP DOWN +' + pts, '#ffe14a');
    qaLog('bossDefeated', { points: pts });
    Session.won = true;
    this.scene.time.delayedCall(900, () => this.endSortie());
  }

  hurtPlayer(fromQA) {
    if (Session.crashed) return;
    if (!fromQA && (this.invuln > 0 || Session.godMode)) return;
    Session.armor -= 1;
    this.invuln = CONFIG.INVULN;
    if (Session.gunLevel > 1) Session.gunLevel -= 1;
    resetCombo();
    Audio.play('hit');
    qaLog('hit', { armor: Session.armor, gunLevel: Session.gunLevel, src: fromQA ? 'qa' : (this.hurtSrc || '?'), x: Math.round(this.px), y: Math.round(this.py) });
    this.hurtSrc = null;
    this.fx.burst(this.px, this.py, 8, 160, 0xe23b3b);
    if (Session.armor <= 0) {
      Session.crashed = true;
      this.crashT = 0;
      this.vy = 40;
      if (this.carrying) this.releaseCargo(true);
    }
  }

  cargoLeft() {
    let n = 0;
    for (let i = 0; i < this.cargo.length; i += 1) {
      const s = this.cargo[i].status;
      if (s === 'waiting' || s === 'carried') n += 1;
    }
    return n;
  }

  endSortie() {
    if (this.finished) return;
    this.finished = true;
    if (this.carrying) this.releaseCargo(true);
    this.scene.events.emit('sortie-over');
  }

  update(dt, input) {
    if (this.finished) return;
    this.time += dt;
    Session.remaining = Math.max(0, this.sortie.duration - this.time);
    tickCombo(dt);
    if (input.consumeWinch && input.consumeWinch()) this.tapWinch();
    else if (input.winchTap) {
      input.winchTap = false;
      this.tapWinch();
    }
    this.updatePlayer(dt, input);
    this.updateWinch(dt);
    if (!Session.crashed) this.fireWeapons(dt, input.firing);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.fx.update(dt);
    this.near.tilePositionX = this.time * 18;
    if (!this.sortie.boss && this.cargoLeft() === 0 && this.time > 1) this.endSortie();
    if (!this.sortie.boss && Session.remaining <= 0 && !Session.noTimer) this.endSortie();
  }

  bossHp() {
    if (!this.boss) return 0;
    if (!this.boss.alive) return 0;
    let hp = 0;
    for (let i = 0; i < this.boss.pods.length; i += 1) {
      if (this.boss.pods[i].live) hp += Math.max(0, this.boss.pods[i].hp);
    }
    if (this.boss.gondolaLive) hp += Math.max(0, this.boss.gondolaHp);
    else hp += this.boss.gondolaHp;
    return hp;
  }

  setBossHp(n) {
    if (!this.boss) return;
    if (n <= 0) { this.defeatBoss(false); return; }
    const pods = this.boss.pods;
    let left = n;
    for (let i = 0; i < pods.length; i += 1) {
      if (left <= 0) { pods[i].live = false; pods[i].img.setVisible(false); pods[i].hp = 0; }
      else {
        pods[i].live = true;
        pods[i].hp = Math.min(8, left);
        left -= pods[i].hp;
        pods[i].img.setVisible(true);
      }
    }
    this.boss.gondolaHp = Math.max(0, left);
    this.boss.gondolaLive = pods.every((p) => !p.live);
    this.boss.alive = true;
  }

  killAllEnemies() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      if (this.enemies[i].alive) this.killEnemy(this.enemies[i], false);
    }
  }

  snapshot() {
    const cargo = [];
    for (let i = 0; i < this.cargo.length; i += 1) {
      const c = this.cargo[i];
      cargo.push({ id: c.id, x: c.x, y: c.y, status: c.status });
    }
    const enemies = [];
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      enemies.push({ id: e.uid, type: e.type, x: e.x, y: e.y, hp: e.hp });
    }
    return {
      carrying: this.carrying ? this.carrying.id : null,
      hookOut: this.hookState !== 'stowed',
      cargo,
      enemies,
      pad: { x: this.pad.x, y: this.pad.y, w: this.pad.w },
      player: { x: this.px, y: this.py },
      bossHp: this.bossHp(),
    };
  }
}
