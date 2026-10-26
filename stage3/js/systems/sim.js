import Phaser from '../phaser.js?v=1';
import { CONFIG, TUNING } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { rng } from '../rng.js?v=1';
import { Audio } from '../audio.js?v=1';
import { CARGO, CARGO_LIST } from '../data/cargo.js?v=1';
import { ENEMIES, ENEMY_ALIAS } from '../data/enemies.js?v=1';
import { getSortie } from '../data/zones.js?v=1';
import { SpritePool } from './pools.js?v=1';
import { Fx, screenShake, flashImage, noteFlash } from './fx.js?v=1';
import { BossSys } from './bosses.js?v=1';
import { awardKill, awardDeliver, resetCombo, tickCombo } from './scoring.js?v=1';
import { qaLog } from '../qalog.js?v=1';
import { onDeliver, onFridge, onLongRain } from '../achievements.js?v=1';

function ropeCap() {
  return Session.ropeMax || CONFIG.ROPE_MAX;
}
function armorCap() {
  return Session.armorMax || CONFIG.ARMOR;
}
function swingCap() {
  return Session.swingMax || 1.15;
}

let _id = 1;
function nid() { _id += 1; return _id; }

const PICKUP_TEX = {
  pow: 'pow',
  wrench: 'pickup-wrench',
  rockets: 'pickup-rockets',
  bubble: 'pickup-bubble',
  horn: 'pickup-horn',
  magnet: 'pickup-magnet',
  coffee: 'pickup-coffee',
};

function pickupKey(type) {
  const s = String(type || '').toLowerCase().replace(/[^a-z]/g, '');
  const map = {
    pow: 'pow',
    wrench: 'wrench',
    repair: 'wrench',
    rocket: 'rockets',
    rockets: 'rockets',
    rocketbox: 'rockets',
    bubble: 'bubble',
    horn: 'horn',
    airhorn: 'horn',
    magnet: 'magnet',
    magnethook: 'magnet',
    coffee: 'coffee',
  };
  return map[s] || null;
}

const PAD_TEX = {
  church: 'pad-church',
  field: 'pad-field',
  barge: 'pad-barge',
  trailer: 'pad-trailer',
  bingo: 'pad-bingo',
  dock: 'pad-dock',
  deck: 'pad-deck',
  overpass: 'pad-overpass',
  spillway: 'pad-spill',
  tower: 'pad-tower',
};

const PAD_LABEL = {
  church: 'DROP: CHURCH',
  field: 'DROP: FIELD',
  barge: 'DROP: BARGE',
  trailer: 'DROP: TRAILER',
  bingo: 'DROP: BINGO',
  dock: 'DROP: DOCK',
  deck: 'DROP: DECK',
  overpass: 'DROP: OVERPASS',
  spillway: 'DROP: SPILLWAY',
  tower: 'DROP: TOWER',
};

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < (aw + bw) && Math.abs(ay - by) * 2 < (ah + bh);
}

function endlessSortie() {
  const T = TUNING.endless;
  return {
    id: 'endless',
    name: 'The Long Rain',
    zone: 1,
    zoneName: 'Mudflat County',
    duration: 99999,
    par: 1,
    boss: false,
    worldW: T.worldW,
    pad: { type: 'field', x: 860, y: 470, w: 180 },
    cargo: [],
    waves: [],
    insults: [],
  };
}

export class World {
  constructor(scene, sortieIndex, opts = {}) {
    this.scene = scene;
    this.sortie = getSortie(sortieIndex);
    this.endlessOn = !!(opts.endless || Session.mode === 'endless');
    if (this.endlessOn) {
      this.sortie = endlessSortie();
      Session.mode = 'endless';
      Session.noTimer = true;
      this.endless = {
        time: 0,
        level: 0,
        nextMiniBoss: TUNING.endless.miniBossEvery,
        miniBosses: 0,
        spawnIn: 1.5,
        cargoIn: 6,
      };
    } else this.endless = null;
    this.worldW = this.sortie.worldW;
    this.fx = new Fx(scene);
    this.noEnemies = !!(opts.noEnemies || Session.noEnemies);
    Audio.setMusicVariant('normal');
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
    this.fridges = [];
    this.longNoted = false;
    this.bits = [];
    this.gooseBack = 0;
    this.buffs = { bubble: 0, magnet: 0, coffee: 0, stunned: 0 };

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
    this.bossSys = new BossSys(this);
    if (this.sortie.boss) this.spawnBoss();
    this.spawnCrates();

    scene.cameras.main.setBounds(0, 0, this.worldW, CONFIG.HEIGHT);
    scene.cameras.main.startFollow(this.playerImg, true, 0.12, 0.08);
    scene.cameras.main.setDeadzone(240, 200);
  }

  zoneN() { return this.sortie.zone || 1; }

  buildBg() {
    const s = this.scene;
    const z = this.zoneN();
    const sky = z === 1 ? 'bg-sky' : 'bg-sky-' + z;
    const far = z === 1 ? 'bg-far' : 'bg-far-' + z;
    const near = z === 1 ? 'bg-near' : 'bg-near-' + z;
    this.sky = s.add.tileSprite(0, 0, this.worldW, 420, sky).setOrigin(0, 0).setScrollFactor(0.15, 1).setDepth(0);
    this.sky.tileScaleX = 5;
    this.sky.tileScaleY = 2.4;
    this.far = s.add.tileSprite(0, 220, this.worldW, 260, far).setOrigin(0, 0).setScrollFactor(0.4, 1).setDepth(1);
    this.far.tileScaleX = 2.2;
    this.far.tileScaleY = 1.5;
    this.near = s.add.tileSprite(0, CONFIG.WATER_Y - 20, this.worldW, 180, near).setOrigin(0, 0).setScrollFactor(0.85, 1).setDepth(8);
    this.near.tileScaleX = 2.5;
    this.near.tileScaleY = 1.2;
    const wash = [0x0a2030, 0x142818, 0x101828, 0x1c2420];
    s.add.rectangle(this.worldW / 2, CONFIG.WATER_Y + 90, this.worldW, 180, wash[z - 1] || 0x0a2030).setDepth(7);
  }

  buildScenery() {
    const s = this.scene;
    const sets = {
      1: ['barn', 'silo', 'house'],
      2: ['trailer', 'shack', 'trailer'],
      3: ['block', 'towerb', 'block'],
      4: ['damwall', 'towerb', 'block'],
    };
    const kinds = sets[this.zoneN()] || sets[1];
    this.props = [];
    for (let x = 180; x < this.worldW - 200; x += 280) {
      const k = kinds[(Math.abs((x * 13) | 0) % kinds.length)];
      const y = CONFIG.GROUND_Y - 20;
      const img = s.add.image(x, y, k).setDepth(3).setScale(k === 'silo' || k === 'towerb' ? 1.4 : 1.2);
      this.props.push(img);
      if (x % 560 < 40) this.props.push(s.add.image(x + 90, CONFIG.GROUND_Y + 6, 'bridge').setDepth(3));
    }
  }

  buildPad() {
    const p = this.pad;
    const tex = PAD_TEX[p.type] || 'pad-barge';
    this.padImg = this.scene.add.image(p.x, p.y, tex).setDepth(6).setScale(1.6);
    this.padGlow = this.scene.add.rectangle(p.x, p.y - 36, p.w, 10, CONFIG.COLORS.good, 0.35).setDepth(6);
    this.scene.tweens.add({
      targets: this.padGlow,
      alpha: 0.12,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    const label = p.label || PAD_LABEL[p.type] || 'DROP';
    this.padLabel = this.scene.add.text(p.x, p.y - 70, label, {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '14px', color: '#6adf6a',
    }).setOrigin(0.5).setDepth(6);
  }

  addCargo(id, x, y, extra) {
    const def = CARGO[id];
    if (!def) return null;
    const img = this.scene.add.image(x, y, def.tex).setDepth(12).setScale(extra && extra.orbit ? 1.2 : 1.55);
    if (def.gold) this.scene.tweens.add({ targets: img, alpha: 0.72, duration: 420, yoyo: true, repeat: -1 });
    const c = {
      uid: nid(),
      id: def.id,
      def,
      x, y,
      w: def.w,
      h: def.h,
      status: 'waiting',
      water: 1,
      tiers: def.fragile ? (def.maxTiers || TUNING.cargo.cakeTiers) : 0,
      tilt: false,
      umbrella: false,
      img,
      vx: 0,
      vy: 0,
      fall: null,
      tierCd: 0,
      yellT: TUNING.cargo.mayorYell,
      orbit: !!(extra && extra.orbit),
    };
    this.cargo.push(c);
    return c;
  }

  spawnCargo() {
    const list = this.sortie.cargo;
    for (let i = 0; i < list.length; i += 1) this.addCargo(list[i].id, list[i].x, list[i].y);
  }

  spawnCrates() {
    const gap = TUNING.pickups.crateSpacing;
    for (let x = 700; x < this.worldW - 240; x += gap) {
      this.spawnPickup(x, CONFIG.WATER_Y - 28, null, true);
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

  spawnBoss() { this.bossSys.spawn(this.sortie.bossId || 'blimp'); }

  forceBoss(id) { this.bossSys.force(id); }

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
      const reach = this.buffs.magnet > 0 ? TUNING.cargo.magnetRange : TUNING.cargo.hookRange;
      if (Math.hypot(hx - c.x, hy - c.y) < reach) {
        this.carrying = c;
        c.status = 'carried';
        if (c.orbit) {
          c.orbit = false;
          const bonus = TUNING.bosses.twisterSnag | 0;
          if (bonus) {
            Session.score += bonus;
            this.fx.popText(c.x, c.y - 46, 'SNAG +' + bonus, '#ffe14a');
          }
        }
        this.hookState = 'hooked';
        const att = this.attach();
        this.ropeLen = Math.max(CONFIG.ROPE_MIN, Math.min(ropeCap(), Math.hypot(c.x - att.x, c.y - att.y)));
        this.angle = Math.atan2(c.x - att.x, c.y - att.y);
        this.omega = 0;
        Audio.setMusicVariant(c.def.tuba ? 'tuba' : 'normal');
        if (c.def.tuba) Audio.play('tuba');
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
    Audio.setMusicVariant('normal');
    if (this.overPad(c) && !forced) {
      c.status = 'delivered';
      c.img.setVisible(false);
      if (c.tiltTag) c.tiltTag.setVisible(false);
      let pts = c.def.points;
      if (c.def.slosh) pts += Math.round((c.def.waterBonus || 0) * c.water);
      if (c.def.fragile) {
        const maxT = c.def.maxTiers || TUNING.cargo.cakeTiers;
        pts = Math.round(c.def.points * (c.tiers / maxT));
        this.fx.popText(c.x, c.y - 88, 'TIERS ' + c.tiers, '#ffe14a');
      }
      if (c.def.grip) {
        pts += TUNING.cargo.dougBonus;
        this.fx.popText(c.x, c.y - 88, 'DOUG NEVER LET GO', '#6adf6a');
      }
      if (c.tilt) pts = 0;
      const hot = Session.combo >= 4;
      const got = awardDeliver(pts, hot);
      Session.lastJoke = c.def.joke;
      Session.jokes.push(c.def.joke);
      this.fx.popText(c.x, c.y - 40, (c.tilt ? 'TILT  ' : (hot ? 'HOT DELIVERY x' + Session.combo + '  ' : '')) + '+' + got, '#ffe14a');
      this.fx.popText(c.x, c.y - 64, c.def.joke, '#f4f0e0');
      Audio.play('pickup');
      this.scene.add.image(this.pad.x + (rng.range(-40, 40)), this.pad.y - 20, c.def.tex).setDepth(7).setScale(0.7);
      onDeliver(c);
    } else {
      this.loseCargo(c);
    }
  }

  // People and animals always land safe. A rider (tub, potty, mayor) does too.
  // Plain objects can break. Status stays 'lost', which is the dropped count.
  safeSoul(def) {
    return def.kind === 'people' || def.kind === 'animal' || !!def.rider;
  }

  loseCargo(c) {
    c.status = 'lost';
    const safe = this.safeSoul(c.def);
    if (c.def.kind === 'object') {
      this.fx.scrap(c.x, c.y);
      if (c.def.slosh || c.def.boat) this.fx.splash(c.x, c.y);
      if (c.def.fragile) this.spawnTierBit(c, 0);
    }
    if (!safe) {
      c.img.setVisible(false);
      if (c.tiltTag) c.tiltTag.setVisible(false);
      this.fx.popText(c.x, c.y - 24, 'BROKEN', '#e85d4c');
      return;
    }
    c.fall = c.y > CONFIG.GROUND_Y - 80 ? 'hay' : 'umbrella';
    this.fx.popText(c.x, c.y - 24, c.fall === 'hay' ? 'HAYSTACK' : 'UMBRELLA', '#f4f0e0');
    if (c.def.annoyed) this.fx.popText(c.x, c.y - 48, c.def.annoyed, '#f4f0e0');
    if (c.fall === 'hay') {
      c.hay = true;
      this.scene.add.image(c.x, CONFIG.GROUND_Y, 'haystack').setDepth(14);
      c.img.setPosition(c.x, CONFIG.GROUND_Y - 18);
    } else {
      c.umbrella = true;
      c._um = this.scene.add.image(c.x, c.y - 28, 'umbrella').setDepth(14);
    }
    this.syncDecor(c);
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
    const coffee = this.buffs.coffee > 0 ? TUNING.pickups.coffeeFly : 1;
    const spd = CONFIG.PLAYER_SPEED * drag * coffee;
    const acc = CONFIG.PLAYER_ACCEL * drag * coffee;
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
    if (Session.armor < armorCap() && rng.chance(dt * 8)) this.fx.smoke(this.px - 18, this.py + 8);
  }

  updateWinch(dt) {
    const att = this.attach();
    const reel = this.buffs.coffee > 0 ? TUNING.pickups.coffeeReel : 1;
    const motor = Session.reelMul || 1;
    if (this.hookState === 'dropping') {
      this.ropeLen = Math.min(ropeCap(), this.ropeLen + 280 * motor * dt);
      this.hookY = att.y + this.ropeLen;
      this.hookImg.setPosition(att.x, this.hookY).setVisible(true);
      this.tryHook();
      if (this.ropeLen >= ropeCap() && !this.carrying) this.hookState = 'hanging';
    } else if (this.hookState === 'hanging') {
      this.hookY = att.y + this.ropeLen;
      this.hookImg.setPosition(att.x, this.hookY);
      this.tryHook();
    } else if (this.hookState === 'reeling') {
      this.ropeLen = Math.max(0, this.ropeLen - 420 * reel * motor * dt);
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
      const damp = 1.15 + (Session.shockDamp || 0);
      const lim = swingCap();
      const omegaAcc = (-(g / L) * Math.sin(this.angle) - (ax / L) * Math.cos(this.angle)) / mass - damp * this.omega;
      this.omega += omegaAcc * dt;
      this.angle += this.omega * dt;
      if (this.angle > lim) { this.angle = lim; this.omega *= -0.3; }
      if (this.angle < -lim) { this.angle = -lim; this.omega *= -0.3; }
      c.x = att.x + L * Math.sin(this.angle);
      c.y = att.y + L * Math.cos(this.angle);
      c.img.setPosition(c.x, c.y);
      c.img.rotation = this.angle * 0.35;
      this.hookImg.setPosition(c.x, c.y - c.h * 0.35).setVisible(true);
      this.syncDecor(c);
      if (c.def.moo) {
        this.mooT -= dt;
        if (Math.abs(this.omega) > 1.4 && this.mooT <= 0) {
          Audio.play('moo');
          this.mooT = 0.9;
        }
      }
      this.updateCargoRules(c, dt);
      if (Math.abs(this.omega) > TUNING.enemies.droneShake) this.shakeDrones();
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

  syncDecor(c) {
    if (c.tiltTag) c.tiltTag.setPosition(c.x, c.y - 32);
  }

  spawnTierBit(c, bias) {
    const bit = this.scene.add.image(c.x, c.y - 8, 'cake-bit').setDepth(30);
    this.bits.push({
      img: bit, x: c.x, y: c.y - 8, vx: (bias || 0) + rng.range(-50, 50), vy: rng.range(-80, -20), t: 0,
    });
  }

  setTilt(c) {
    if (!c || c.tilt || !c.def.canTilt) return;
    c.tilt = true;
    c.tiltTag = this.scene.add.text(c.x, c.y - 32, 'TILT', {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '16px', color: '#e23b3b',
    }).setOrigin(0.5).setDepth(31);
    Audio.play('tilt');
    this.fx.popText(c.x, c.y - 48, 'TILT', '#e23b3b');
    qaLog('tilt', { id: c.id });
  }

  updateCargoRules(c, dt) {
    const w = Math.abs(this.omega);
    if (c.def.slosh && w > TUNING.cargo.sloshOmega) {
      c.water = Math.max(0, c.water - TUNING.cargo.sloshPerSec * dt);
      if (rng.chance(dt * 6)) this.fx.splash(c.x, c.y + 10);
    }
    if (c.def.fragile) {
      c.tierCd -= dt;
      if (w > TUNING.cargo.cakeOmega && c.tierCd <= 0 && c.tiers > 0) {
        c.tiers -= 1;
        c.tierCd = TUNING.cargo.cakeTierGap;
        this.spawnTierBit(c, Math.sign(this.omega) * 40);
        const left = Math.max(0.2, c.tiers / (c.def.maxTiers || TUNING.cargo.cakeTiers));
        c.img.setScale(1.55, 1.55 * (0.3 + 0.7 * left));
        this.fx.popText(c.x, c.y - 24, 'TIER', '#ffe14a');
      }
    }
    if (c.def.canTilt && !c.tilt && w > TUNING.cargo.pinballOmega) this.setTilt(c);
    if (c.y > CONFIG.GROUND_Y - 28 || c.y > CONFIG.WATER_Y - 6) this.setTilt(c);
    if (c.def.mayor) {
      c.yellT -= dt;
      if (c.yellT <= 0) {
        c.yellT = TUNING.cargo.mayorYell;
        const lines = c.def.yells || ['I am still the mayor!'];
        this.fx.popText(c.x, c.y - 36, rng.pick(lines), '#ffb020');
      }
    }
  }

  shakeDrones() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (e.alive && e.latched) this.freeDrone(e, 'SHAKE OFF');
    }
  }

  wreckCheck(c) {
    const speed = Math.abs(this.omega) * this.ropeLen + Math.abs(this.vx) * 0.3;
    if (speed < 70 && Math.abs(this.omega) < 0.45) return;
    let bumped = false;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive || e.latched) continue;
      if (!overlap(c.x, c.y, c.w, c.h, e.x, e.y, e.w, e.h)) continue;
      bumped = true;
      if (e.def.immortal) this.shoveEnemy(e);
      else this.killEnemy(e, true);
    }
    if (bumped) this.setTilt(c);
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
      if (this.projHits(b.x, b.y, 10, 8, 1, false) || this.hitFridge(b.x, b.y)) this.bullets.release(b);
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
        let txb = this.boss.x;
        let tyb = this.boss.y;
        const parts = this.boss.parts;
        if (parts) {
          for (let j = 0; j < parts.length; j += 1) {
            const p = parts[j];
            if (!p.live) continue;
            txb = p.wx || (this.boss.x + p.ox);
            tyb = p.wy || (this.boss.y + p.oy);
            break;
          }
        }
        const d = (txb - r.x) ** 2 + (tyb - r.y) ** 2;
        if (d < best) { tx = txb; ty = tyb; }
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
      if (this.projHits(r.x, r.y, 22, 16, 4, false) || this.hitFridge(r.x, r.y)) {
        this.fx.burst(r.x, r.y, 8, 180, 0xff7a18);
        this.rockets.release(r);
      }
    });
    this.ebullets.forEach((b) => {
      if (this.buffs.stunned > 0) return;
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
        if (e.def.immortal) continue;
        this.hurtEnemy(e, dmg, wreck);
        return true;
      }
    }
    if (this.boss && this.boss.alive && this.hitBoss(x, y, w, h, dmg, wreck)) return true;
    return false;
  }

  spawnEnemy(type, x, y, opts) {
    const raw = String(type || '').toLowerCase().replace(/[^a-z]/g, '');
    const key = ENEMY_ALIAS[raw] || raw;
    const def = ENEMIES[key];
    if (!def) return null;
    if (def.flock && !(opts && opts.solo)) {
      let leader = null;
      const n = def.flock;
      for (let i = 0; i < n; i += 1) {
        const g = this.spawnEnemy(key, x + (i - (n >> 1)) * 28, y + ((i % 2) ? 16 : -8), { solo: true });
        if (!leader) leader = g;
      }
      return leader;
    }
    const img = this.scene.add.image(x, y, def.tex).setDepth(14).setScale(1.2);
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
      vx: 0,
      vy: 0,
      w: def.w,
      h: def.h,
      hp: this.scaleHp(def),
      alive: true,
      img,
      banner,
      t: rng.range(0, 6),
      shot: def.shot > 0 ? rng.range(0.2, def.shot) : 99,
      baseY: y,
      latched: false,
      latchT: 0,
      stolen: null,
      scared: false,
      honkT: 0,
      thumbT: TUNING.enemies.thumbEvery,
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
    const stunned = this.buffs.stunned > 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      e.t += dt;
      if (e.honkT > 0) e.honkT -= dt;
      if (e.scared) {
        e.vy = -220;
        e.y += e.vy * dt;
        e.x += 30 * dt;
        e.img.setPosition(e.x, e.y);
        if (e.y < -40) this.despawnEnemy(e);
        continue;
      }
      if (e.stolen) {
        this.dragStolen(e, dt);
        continue;
      }
      if (stunned && !e.def.immortal) {
        e.img.setTint(0xaaddff);
        e._stunTint = true;
        e.img.setPosition(e.x, e.y);
        continue;
      }
      if (e._stunTint && e.img) { e.img.clearTint(); e._stunTint = false; }
      this.moveEnemy(e, dt);
      e.img.setPosition(e.x, e.y);
      if (e.banner) e.banner.setPosition(e.x - 50, e.y - 18);
      if (!e.latched && e.x < this.scene.cameras.main.scrollX - 160) {
        this.despawnEnemy(e);
        continue;
      }
      if (!stunned && e.def.shot > 0 && !e.latched) {
        e.shot -= dt;
        if (e.shot <= 0) {
          e.shot = e.def.shot + rng.range(-0.15, 0.25);
          this.enemyShoot(e);
        }
      }
      if (!stunned && !e.scared && !(e.passT > 0) && this.invuln <= 0 && !Session.godMode && overlap(e.x, e.y, e.w, e.h, this.px, this.py, 70, 28)) {
        this.hurtSrc = e.def.id || 'enemy';
        this.hurtPlayer();
        if (e.type === 'goose') {
          // the whole flock flies on past together after one ram
          for (let j = 0; j < this.enemies.length; j += 1) {
            const g = this.enemies[j];
            if (g.alive && g.type === 'goose' && Math.abs(g.x - e.x) < 260 && Math.abs(g.y - e.y) < 200) g.passT = TUNING.enemies.goosePass;
          }
        }
      }
    }
    this.updateBoss(dt);
    this.updatePilots(dt);
    this.updatePickups(dt);
    this.updateFalls(dt);
  }

  moveEnemy(e, dt) {
    const sp = e.def.speed || 0;
    if (e.type === 'duster') {
      e.vx = -sp;
      e.x += e.vx * dt;
      e.y = e.baseY + Math.sin(e.t * 2.2) * 36;
    } else if (e.type === 'balloon') {
      e.vy = -sp;
      e.y += e.vy * dt;
      e.x += Math.sin(e.t * 0.8) * 20 * dt;
      if (e.y < 80) e.y = 80;
    } else if (e.type === 'truck') {
      e.x += Math.sin(e.t * 0.6) * sp * dt;
      e.y = CONFIG.GROUND_Y - 8;
    } else if (e.type === 'drone') {
      this.moveDrone(e, dt);
    } else if (e.type === 'goose') {
      // Swoop at the chopper with a limited turn rate (dodgeable); after a ram, fly on past for a while.
      e.chaseT = (e.chaseT || 0) + dt;
      if (!e.leaving && e.chaseT > TUNING.enemies.gooseChase) {
        // bored: the flock honks and heads off to the left
        e.leaving = true; e.passT = 9999;
        e.vx = -sp; e.vy = -sp * 0.35;
      }
      if (e.passT > 0) e.passT -= dt;
      else {
        const want = Math.atan2(this.py - e.y, this.px - e.x);
        let cur = (e.vx || e.vy) ? Math.atan2(e.vy, e.vx) : want;
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const turn = TUNING.enemies.gooseTurn * dt;
        cur += Math.max(-turn, Math.min(turn, d));
        e.vx = Math.cos(cur) * sp;
        e.vy = Math.sin(cur) * sp;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y < 60) { e.y = 60; e.vy = Math.abs(e.vy); }
      if (e.y > CONFIG.GROUND_Y - 30) { e.y = CONFIG.GROUND_Y - 30; e.vy = -Math.abs(e.vy); }
    } else if (e.type === 'jetski') {
      e.y = CONFIG.WATER_Y - 8;
      e.vx = -sp * 0.45;
      e.x += e.vx * dt + Math.sin(e.t * 1.3) * 20 * dt;
    } else if (e.type === 'rival') {
      const cam = this.scene.cameras.main.scrollX;
      const home = cam + CONFIG.WIDTH - 200;
      e.x += (home - e.x) * Math.min(1, dt * 1.4);
      e.y += (this.py - e.y) * Math.min(1, dt * TUNING.enemies.rivalMirror);
      e.vx = 0;
      e.vy = (this.py - e.y);
      e.thumbT -= dt;
      if (e.thumbT <= 0) {
        e.thumbT = TUNING.enemies.thumbEvery;
        this.fx.popText(e.x, e.y - 28, 'THUMBS DOWN', '#e85d4c');
      }
    } else if (e.type === 'catapult') {
      e.y = CONFIG.GROUND_Y - 6;
      e.x += Math.sin(e.t * 0.5) * sp * dt;
    }
  }

  moveDrone(e, dt) {
    const sp = e.def.speed || 120;
    if (e.latched && this.carrying) {
      e.x = this.carrying.x + 16;
      e.y = this.carrying.y - 6;
      e.latchT += dt;
      const dir = this.angle >= 0 ? 1 : -1;
      this.omega += TUNING.enemies.dronePull * dir * dt;
      this.vy += TUNING.enemies.droneTug * dt;
      if (e.latchT >= TUNING.enemies.droneSteal) this.stealCargo(e);
      return;
    }
    e.latched = false;
    if (e.latchCool > 0) {
      e.latchCool -= dt;
      e.vx = -sp * 0.8;
      e.x += e.vx * dt;
      e.y -= 30 * dt;
      return;
    }
    const goal = this.carrying;
    if (goal) {
      const dx = goal.x - e.x;
      const dy = goal.y - e.y;
      const m = Math.hypot(dx, dy) || 1;
      e.vx = (dx / m) * sp;
      e.vy = (dy / m) * sp;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (m < TUNING.enemies.droneLatch) {
        e.latched = true;
        e.latchT = 0;
        goal.latched = true;
        this.fx.popText(e.x, e.y - 18, 'SNAGGED', '#e85d4c');
      }
    } else {
      e.vx = -sp * 0.45;
      e.x += e.vx * dt;
      e.y = e.baseY + Math.sin(e.t * 2) * 22;
    }
  }

  stealCargo(e) {
    const c = this.carrying;
    if (!c) { e.latched = false; return; }
    this.carrying = null;
    c.latched = false;
    e.latched = false;
    e.stolen = c;
    c.status = 'stolen';
    this.hookState = 'stowed';
    this.hookImg.setVisible(false);
    Audio.setMusicVariant('normal');
    this.fx.popText(c.x, c.y - 20, 'SNATCHED', '#e85d4c');
  }

  dragStolen(e, dt) {
    const c = e.stolen;
    if (!c) return;
    e.x += 120 * dt;
    e.y -= 46 * dt;
    e.img.setPosition(e.x, e.y);
    c.x = e.x;
    c.y = e.y + 18;
    c.img.setPosition(c.x, c.y);
    this.syncDecor(c);
    const cam = this.scene.cameras.main.scrollX;
    if (e.y < -30 || e.x > cam + CONFIG.WIDTH + 60) this.finishStolen(e);
  }

  finishStolen(e) {
    if (!e || !e.stolen) return;
    const c = e.stolen;
    e.stolen = null;
    e.latched = false;
    this.loseCargo(c);
  }

  freeDrone(e, how) {
    if (!e) return;
    const was = e.latched || e.stolen;
    if (e.stolen) this.finishStolen(e);
    e.latched = false;
    e.latchT = 0;
    e.latchCool = 1.1;
    if (this.carrying) this.carrying.latched = false;
    if (was && how) this.fx.popText(e.x, e.y - 16, how, '#6adf6a');
  }

  shoveEnemy(e) {
    e.x += 36;
    e.y -= 20;
    if (e.honkT <= 0) { Audio.play('honk'); e.honkT = 0.5; }
  }

  enemyShoot(e) {
    if (e.type === 'catapult') { this.lobFridge(e); return; }
    const shoot = (ang, sp, tint) => {
      const b = this.ebullets.spawn(e.x, e.y);
      if (!b) return;
      b._vx = Math.cos(ang) * sp;
      b._vy = Math.sin(ang) * sp;
      b._life = 2.5;
      if (tint) b.setTint(tint);
    };
    if (e.type === 'duster') shoot(0.15 + rng.range(-0.1, 0.2), 240);
    else if (e.type === 'balloon') {
      shoot(0, 180); shoot(Math.PI / 2, 180); shoot(Math.PI, 180); shoot(-Math.PI / 2, 180);
    } else if (e.type === 'jetski') {
      shoot(-Math.PI / 2 + rng.range(-0.28, 0.28), TUNING.enemies.flareSpeed, 0xff7a18);
    } else if (e.type === 'drone' || e.type === 'goose') {
      return;
    } else {
      const ang = Math.atan2(this.py - e.y, this.px - e.x);
      shoot(ang, e.type === 'rival' ? 260 : 220);
    }
  }

  lobFridge(e) {
    const img = this.scene.add.image(e.x, e.y - 24, 'fridge').setDepth(15).setScale(1.3);
    this.fridges.push({
      x: e.x,
      y: e.y - 24,
      vx: rng.range(-80, 10),
      vy: -TUNING.enemies.fridgeArc,
      img,
      lit: false,
    });
  }

  hurtEnemy(e, dmg, wreck) {
    if (!e.alive) return;
    if (e.def.immortal) {
      if (e.honkT <= 0) { Audio.play('honk'); e.honkT = 0.55; }
      return;
    }
    if (e.latched || e.stolen) this.freeDrone(e, 'GET OFF');
    e.hp -= dmg;
    if (flashImage(e.img)) noteFlash();
    if (e.hp <= 0) this.killEnemy(e, wreck);
  }

  killEnemy(e, wreck) {
    if (!e.alive) return;
    if (e.def.immortal) return;
    e.alive = false;
    this.finishStolen(e);
    const pts = awardKill(e.def.points, wreck);
    this.fx.scrap(e.x, e.y);
    if (e.def.pop) Audio.play('pop');
    this.fx.popText(e.x, e.y - 20, (wreck ? 'WRECKING BALL +' : '+') + pts, wreck ? '#ff7a18' : '#ffe14a');
    e.img.setVisible(false);
    if (e.banner) e.banner.setVisible(false);
    this.spawnPilot(e.x, e.y);
    if (rng.chance(TUNING.pickups.dropChance)) this.spawnPickup(e.x, e.y);
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

  rollPickup() {
    const table = TUNING.pickups.table;
    let sum = 0;
    for (let i = 0; i < table.length; i += 1) sum += table[i].w;
    let r = rng() * sum;
    for (let i = 0; i < table.length; i += 1) {
      r -= table[i].w;
      if (r <= 0) return table[i].id;
    }
    return 'pow';
  }

  spawnPickup(x, y, type, crate) {
    const kind = pickupKey(type) || type || this.rollPickup();
    if (!PICKUP_TEX[kind]) return null;
    const tex = crate ? 'crate' : PICKUP_TEX[kind];
    const img = this.scene.add.image(x, y, tex).setDepth(crate ? 9 : 17).setScale(crate ? 1.3 : 1.15);
    const p = { x, y, img, t: rng.range(0, 2), kind, crate: !!crate, bob: y };
    this.pickups.push(p);
    return p;
  }

  givePickup(type) {
    const k = pickupKey(type);
    if (!k) return false;
    const T = TUNING.pickups;
    if (k === 'pow') {
      Session.gunLevel = Math.min(CONFIG.GUN_LEVELS, Session.gunLevel + 1);
      this.fx.popText(this.px, this.py - 30, 'POW ' + Session.gunLevel, '#ffb020');
    } else if (k === 'wrench') {
      Session.armor = Math.min(armorCap(), Session.armor + T.wrenchArmor);
      this.fx.popText(this.px, this.py - 30, 'WRENCH', '#6adf6a');
    } else if (k === 'rockets') {
      Session.rockets += T.rocketBox;
      this.fx.popText(this.px, this.py - 30, 'ROCKETS +' + T.rocketBox, '#ffb020');
    } else if (k === 'bubble') {
      this.buffs.bubble = T.bubbleHits;
      this.fx.popText(this.px, this.py - 30, 'BUBBLE', '#5ec8f0');
    } else if (k === 'horn') {
      this.airHorn();
    } else if (k === 'magnet') {
      this.buffs.magnet = T.magnetSeconds;
      this.fx.popText(this.px, this.py - 30, 'MAGNET HOOK', '#e23b3b');
    } else if (k === 'coffee') {
      this.buffs.coffee = T.coffeeSeconds;
      this.fx.popText(this.px, this.py - 30, 'COFFEE', '#c99212');
    }
    if (k !== 'horn') Audio.play('pickup');
    qaLog('pickup', { type: k });
    return true;
  }

  airHorn() {
    this.buffs.stunned = TUNING.pickups.hornSeconds;
    Audio.play('horn');
    this.fx.popText(this.px, this.py - 40, 'HONK', '#ffe14a');
    let geese = 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (e.def.immortal) {
        e.scared = true;
        geese += 1;
        if (e.latched || e.stolen) this.freeDrone(e, null);
      }
    }
    if (geese) this.gooseBack = TUNING.enemies.gooseReturn;
    qaLog('horn', { geese });
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      p.t += dt;
      if (p.crate) {
        p.x -= 14 * dt;
        p.y = p.bob + Math.sin(p.t * 2) * 6;
      } else {
        p.y += Math.sin(p.t * 3) * 8 * dt;
      }
      p.img.setPosition(p.x, p.y);
      const hitW = p.crate ? 36 : 24;
      if (overlap(p.x, p.y, hitW, hitW, this.px, this.py, 70, 28)) {
        this.givePickup(p.kind);
        p.img.destroy();
        this.pickups.splice(i, 1);
        continue;
      }
      const life = p.crate ? 80 : TUNING.pickups.life;
      if (p.t > life || p.x < -80) { p.img.destroy(); this.pickups.splice(i, 1); }
    }
  }

  updateFalls(dt) {
    for (let i = 0; i < this.cargo.length; i += 1) {
      const c = this.cargo[i];
      if (c.status !== 'lost' || !c._um) continue;
      c.y += TUNING.cargo.fallSpeed * dt;
      c._um.x = c.x;
      c._um.y = c.y - 28;
      c.img.setPosition(c.x, c.y);
      this.syncDecor(c);
      if (c.y >= CONFIG.GROUND_Y - 10) {
        c._um.destroy();
        c._um = null;
        c.hay = true;
        this.scene.add.image(c.x, CONFIG.GROUND_Y, 'haystack').setDepth(14);
        c.img.setPosition(c.x, CONFIG.GROUND_Y - 18);
        this.fx.popText(c.x, c.y - 20, 'HAYSTACK', '#f4f0e0');
      }
    }
  }

  updateBits(dt) {
    for (let i = this.bits.length - 1; i >= 0; i -= 1) {
      const b = this.bits[i];
      b.t += dt;
      b.vy += 280 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.img.setPosition(b.x, b.y);
      if (b.t > 1.4 || b.y > CONFIG.WATER_Y) {
        b.img.destroy();
        this.bits.splice(i, 1);
      }
    }
  }

  updateFridges(dt) {
    if (this.buffs.stunned > 0) return;
    for (let i = this.fridges.length - 1; i >= 0; i -= 1) {
      const f = this.fridges[i];
      f.vy += TUNING.enemies.fridgeGravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.img.setPosition(f.x, f.y);
      f.img.rotation += dt * 2.2;
      if (f.lit) {
        f.life -= dt;
        if (f.life <= 0) { this.scrapFridge(i); continue; }
      }
      if (this.invuln <= 0 && !Session.godMode && overlap(f.x, f.y, 28, 36, this.px, this.py, 70, 28)) {
        this.hurtSrc = 'fridge';
        this.hurtPlayer();
        this.scrapFridge(i);
        continue;
      }
      if (f.y > CONFIG.WATER_Y - 4) this.scrapFridge(i);
    }
  }

  hitFridge(x, y) {
    for (let i = 0; i < this.fridges.length; i += 1) {
      const f = this.fridges[i];
      if (Math.abs(f.x - x) < 22 && Math.abs(f.y - y) < 26) {
        if (!f.lit) {
          f.lit = true;
          f.life = 0.35;
          f.img.setTexture('fridge-open');
          this.fx.popText(f.x, f.y - 18, 'FRIDGE LIGHT', '#ffe14a');
          qaLog('fridgeLight', { x: Math.round(f.x), y: Math.round(f.y) });
          onFridge();
          Audio.play('pop');
        } else f.life = Math.min(f.life, 0.12);
        return true;
      }
    }
    return false;
  }

  scrapFridge(i) {
    const f = this.fridges[i];
    if (!f) return;
    if (f.y > CONFIG.WATER_Y - 20) this.fx.splash(f.x, f.y);
    else this.fx.scrap(f.x, f.y);
    f.img.destroy();
    this.fridges.splice(i, 1);
  }

  updateBoss(dt) { this.bossSys.update(dt); }

  hitBoss(x, y, w, h, dmg, wreck) { return this.bossSys.hit(x, y, w, h, dmg, wreck); }

  defeatBoss(wreck) { this.bossSys.defeat(wreck); }

  hurtPlayer(fromQA) {
    if (Session.crashed) return;
    if (!fromQA && (this.invuln > 0 || Session.godMode)) return;
    if (!fromQA && this.buffs.bubble > 0) {
      this.buffs.bubble -= 1;
      this.invuln = 0.35;
      Audio.play('pop');
      this.fx.popText(this.px, this.py - 28, 'BUBBLE', '#5ec8f0');
      return;
    }
    Session.armor -= 1;
    this.invuln = CONFIG.INVULN;
    if (Session.gunLevel > 1) Session.gunLevel -= 1;
    resetCombo();
    Audio.play('hit');
    screenShake(this.scene, 'hit');
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
      if (s === 'waiting' || s === 'carried' || s === 'stolen') n += 1;
    }
    return n;
  }

  endSortie() {
    if (this.finished) return;
    this.finished = true;
    if (this.endlessOn && this.endless) {
      Session.endlessTime = this.endless.time;
      Session.endlessMinis = this.endless.miniBosses;
    }
    if (this.carrying) this.releaseCargo(true);
    Audio.setMusicVariant('normal');
    this.scene.events.emit('sortie-over');
  }

  tickBuffs(dt) {
    if (this.buffs.magnet > 0) this.buffs.magnet = Math.max(0, this.buffs.magnet - dt);
    if (this.buffs.coffee > 0) this.buffs.coffee = Math.max(0, this.buffs.coffee - dt);
    if (this.buffs.stunned > 0) this.buffs.stunned = Math.max(0, this.buffs.stunned - dt);
    if (this.gooseBack > 0) {
      this.gooseBack -= dt;
      if (this.gooseBack <= 0) {
        this.gooseBack = 0;
        const cam = this.scene.cameras.main.scrollX;
        this.spawnEnemy('goose', cam + CONFIG.WIDTH - 120, 150);
      }
    }
  }

  update(dt, input) {
    if (this.finished) return;
    this.tickBuffs(dt);
    this.time += dt;
    if (this.endlessOn) {
      this.endless.time += dt;
      this.endless.level = Math.floor(this.endless.time / 60);
      this.tickEndless(dt);
      if (!this.longNoted && this.endless.time >= TUNING.achievements.longSec) {
        this.longNoted = true;
        onLongRain();
      }
    } else Session.remaining = Math.max(0, this.sortie.duration - this.time);
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
    this.updateFridges(dt);
    this.updateBits(dt);
    this.fx.update(dt);
    this.near.tilePositionX = this.time * 18;
    if (this.endlessOn) this.recycleEndless();
    if (!this.endlessOn && !this.sortie.boss && this.cargoLeft() === 0 && this.time > 1) this.endSortie();
    if (!this.endlessOn && !this.sortie.boss && Session.remaining <= 0 && !Session.noTimer) this.endSortie();
  }

  bossHp() { return this.bossSys.hp(); }

  setBossHp(n) { this.bossSys.setHp(n); }

  scaleHp(def) {
    if (!this.endlessOn || !def || def.immortal) return def.hp;
    const minutes = this.endless.time / 60;
    return Math.max(1, Math.round(def.hp * (1 + minutes * TUNING.endless.hpPerLevel)));
  }

  endlessInterval() {
    const diff = 1 + (this.endless.time / 60) * TUNING.endless.accelPerMin;
    return Math.max(TUNING.endless.spawnEveryMin, TUNING.endless.spawnEvery / diff);
  }

  tickEndless(dt) {
    const e = this.endless;
    if (this.boss && this.boss.alive) {
      /* hold the mini-boss clock while one is up */
    } else {
      e.nextMiniBoss -= dt;
      if (e.nextMiniBoss <= 0) {
        this.spawnMiniBoss();
        e.nextMiniBoss = TUNING.endless.miniBossEvery;
      }
    }
    e.spawnIn -= dt;
    if (e.spawnIn <= 0) {
      this.spawnEndlessEnemy();
      e.spawnIn = this.endlessInterval();
    }
    e.cargoIn -= dt;
    if (e.cargoIn <= 0) {
      this.spawnEndlessCargo();
      e.cargoIn = TUNING.endless.cargoEvery;
    }
  }

  endlessSkip(seconds) {
    if (!this.endlessOn) return;
    const s = Math.max(0, Number(seconds) || 0);
    this.endless.time += s;
    this.time += s;
    this.endless.level = Math.floor(this.endless.time / 60);
    this.endless.nextMiniBoss -= s;
    let due = 0;
    while (this.endless.nextMiniBoss <= 0) {
      this.endless.nextMiniBoss += TUNING.endless.miniBossEvery;
      due += 1;
    }
    if (due > 0 && (!this.boss || !this.boss.alive)) this.spawnMiniBoss();
    const n = Math.min(4, 1 + this.endless.level);
    for (let i = 0; i < n; i += 1) this.spawnEndlessEnemy();
    this.spawnEndlessCargo();
    if (!this.longNoted && this.endless.time >= TUNING.achievements.longSec) {
      this.longNoted = true;
      onLongRain();
    }
  }

  spawnMiniBoss() {
    const order = ['blimp', 'magnet', 'twister', 'vulture'];
    const id = order[(this.endless.miniBosses || 0) % 4];
    const x = Math.max(220, Math.min(this.worldW - 180, this.px + 640));
    const y = id === 'magnet' ? CONFIG.GROUND_Y - 30 : 200;
    this.bossSys.spawn(id, { mini: true, x, y });
  }

  endlessPool() {
    const minutes = this.endless.time / 60;
    const mix = TUNING.endless.mix;
    const at = TUNING.endless.mixAt;
    const pool = [];
    for (let i = 0; i < mix.length; i += 1) if (minutes >= (at[i] || 0)) pool.push(mix[i]);
    if (!pool.length) pool.push('duster');
    let type = pool[rng.int(pool.length)];
    if (type === 'goose' && rng() > TUNING.endless.gooseWeight) type = 'duster';
    return type;
  }

  spawnEndlessEnemy() {
    const type = this.endlessPool();
    const ground = type === 'truck' || type === 'catapult';
    const x = Math.max(80, Math.min(this.worldW - 80, this.px + 760 + rng.range(0, 180)));
    let y = rng.range(120, 250);
    if (ground) y = CONFIG.GROUND_Y - 8;
    else if (type === 'jetski') y = CONFIG.WATER_Y - 16;
    this.spawnEnemy(type, x, y);
  }

  spawnEndlessCargo() {
    const list = CARGO_LIST;
    let total = 0;
    const wts = [];
    for (let i = 0; i < list.length; i += 1) {
      const w = list[i].rare ? (TUNING.endless.rareWeight + (Session.luckyAdd || 0)) : 1;
      wts.push(w);
      total += w;
    }
    let r = rng() * total;
    let pick = list[0];
    for (let i = 0; i < list.length; i += 1) {
      r -= wts[i];
      if (r <= 0) { pick = list[i]; break; }
    }
    const x = Math.max(120, Math.min(this.worldW - 120, this.px + 680));
    const y = CONFIG.GROUND_Y - 36;
    this.addCargo(pick.id, x, y);
  }

  recycleEndless() {
    const seg = TUNING.endless.segment;
    if (this.px < seg + 280) return;
    this.shiftWorld(-seg);
  }

  shiftWorld(dx) {
    const bump = (o) => {
      if (!o) return;
      if (typeof o.x === 'number') o.x += dx;
      if (o.img) o.img.x += dx;
      if (o.tiltTag) o.tiltTag.x += dx;
    };
    this.px += dx;
    this.playerImg.x += dx;
    this.rotor.x += dx;
    bump(this.pad);
    if (this.padImg) this.padImg.x += dx;
    if (this.padGlow) this.padGlow.x += dx;
    if (this.padLabel) this.padLabel.x += dx;
    for (let i = 0; i < this.cargo.length; i += 1) bump(this.cargo[i]);
    for (let i = 0; i < this.enemies.length; i += 1) bump(this.enemies[i]);
    for (let i = 0; i < this.pickups.length; i += 1) bump(this.pickups[i]);
    for (let i = 0; i < this.fridges.length; i += 1) bump(this.fridges[i]);
    for (let i = 0; i < this.bits.length; i += 1) bump(this.bits[i]);
    for (let i = 0; i < this.pilots.length; i += 1) this.pilots[i].x += dx;
    if (this.boss) {
      this.boss.x += dx;
      this.bossSys.sync(this.boss);
    }
    const span = this.worldW - 180;
    for (let i = 0; i < this.props.length; i += 1) {
      const img = this.props[i];
      img.x += dx;
      if (img.x < -100) img.x += span;
    }
    if (this.pad.x < this.px - 500) {
      const nx = this.px + 820;
      const d = nx - this.pad.x;
      this.pad.x = nx;
      if (this.padImg) this.padImg.x += d;
      if (this.padGlow) this.padGlow.x += d;
      if (this.padLabel) this.padLabel.x += d;
    }
  }

  killAllEnemies() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (e.def.immortal) this.despawnEnemy(e);
      else this.killEnemy(e, false);
    }
  }

  snapshot() {
    const cargo = [];
    for (let i = 0; i < this.cargo.length; i += 1) {
      const c = this.cargo[i];
      cargo.push({
        id: c.id,
        x: c.x,
        y: c.y,
        status: c.status,
        water: c.water,
        tiers: c.tiers,
        tilt: !!c.tilt,
        umbrella: !!c.umbrella,
        hay: !!c.hay,
        kind: c.def.kind,
      });
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
      pickups: {
        bubble: this.buffs.bubble | 0,
        magnet: this.buffs.magnet,
        coffee: this.buffs.coffee,
        stunned: this.buffs.stunned,
      },
    };
  }
}
