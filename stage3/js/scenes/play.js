import Phaser from '../phaser.js?v=3';
import { CONFIG } from '../config.js?v=3';
import { Session } from '../session.js?v=3';
import { Save, writeProgress } from '../save.js?v=3';
import { grantSortieBucks } from '../meta.js?v=3';
import { onSortieEnd } from '../achievements.js?v=3';
import { Audio } from '../audio.js?v=3';
import { getSortie, rankFor } from '../data/zones.js?v=3';
import { addText, clearButtons, pinOverlay } from '../ui.js?v=3';
import { InputCtl, makePauseOverlay, makeConfirm } from '../systems/input.js?v=3';
import { World } from '../systems/sim.js?v=3';
import { Bot } from '../systems/bot.js?v=3';
import { qaLog } from '../qalog.js?v=3';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init(data) {
    this.sortieIndex = data?.sortieIndex ?? Session.sortieIndex ?? 0;
    this.noEnemies = !!(data && data.noEnemies);
    this.endlessMode = !!((data && data.endless) || Session.mode === 'endless');
  }

  create() {
    // Phaser reuses the scene instance, so per-sortie flags must be reset here.
    this._ending = false;
    clearButtons(this);
    Session.sortieIndex = this.sortieIndex;
    Session.paused = false;
    Session.confirmOpen = false;
    Session.crashed = false;
    Session.won = false;
    Session.remaining = getSortie(this.sortieIndex).duration;
    Session.duration = Session.remaining;
    this.cameras.main.setBackgroundColor('#1a1030');
    this.input.addPointer(3);
    this.input.setTopOnly(false);

    this.world = new World(this, this.sortieIndex, { noEnemies: this.noEnemies, endless: this.endlessMode });
    this.ctl = new InputCtl(this);
    this.bot = new Bot(this.world, this.ctl);
    if (Session.bot) this.bot.set(true);

    this.buildHud();
    this.pauseUI = makePauseOverlay(this, () => this.setPaused(false), () => this.askQuit());
    this.confirmUI = makeConfirm(this, 'QUIT TO TITLE?', () => this.quitTitle(), () => this.cancelQuit());

    this.input.keyboard.on('keydown-ENTER', () => {
      if (Session.confirmOpen) this.cancelQuit();
    });
    this.events.once('sortie-over', () => this.finish());
    this.events.once('shutdown', () => {
      globalThis.__CHOPPAH_PLAY = null;
    });
    globalThis.__CHOPPAH_PLAY = this;
    const bossFight = !this.endlessMode && !!getSortie(this.sortieIndex).boss;
    Audio.playMusic(bossFight ? 'boss' : 'flying', 'Play');
    this.events.once('shutdown', () => Audio.stopMusic('Play'));
    pinOverlay(this);
    try {
      if (window.matchMedia && window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches) {
        this.holdForRotate(true);
      }
    } catch (err) { /* matchMedia missing */ }
  }

  holdForRotate(on) {
    if (on) {
      if (this._rotateHold) {
        Session.paused = true;
        return;
      }
      this._rotateHold = true;
      this._pausedBeforeRotate = !!Session.paused;
      Session.paused = true;
      return;
    }
    if (!this._rotateHold) return;
    this._rotateHold = false;
    if (!this._pausedBeforeRotate) Session.paused = false;
  }

  buildHud() {
    const s = this;
    this.hudScore = addText(s, 16, 10, '0', { fontSize: '22px', color: CONFIG.COLORS.yellowCss }).setScrollFactor(0).setDepth(100);
    this.hudCombo = addText(s, 16, 36, '', { fontSize: '18px', color: CONFIG.COLORS.orangeCss }).setScrollFactor(0).setDepth(100);
    this.hudTime = addText(s, 640, 12, '0', { fontSize: '22px', color: CONFIG.COLORS.text, originX: 0.5 }).setScrollFactor(0).setDepth(100);
    this.hudGun = addText(s, 16, 60, 'GUN 1', { fontSize: '14px', color: CONFIG.COLORS.muted }).setScrollFactor(0).setDepth(100);
    this.armorImgs = [];
    const armorN = Session.armorMax || CONFIG.ARMOR;
    for (let i = 0; i < armorN; i += 1) {
      this.armorImgs.push(s.add.image(200 + i * 22, 22, 'armor').setScrollFactor(0).setDepth(100));
    }
    this.hudRockets = addText(s, 200, 44, 'RKT 5', { fontSize: '14px', color: CONFIG.COLORS.text }).setScrollFactor(0).setDepth(100);
    this.hudCargo = addText(s, 16, 82, '', { fontSize: '14px', color: CONFIG.COLORS.goodCss }).setScrollFactor(0).setDepth(100);
    this.hudZone = addText(s, 640, 40, '', { fontSize: '14px', color: CONFIG.COLORS.orangeCss, originX: 0.5 }).setScrollFactor(0).setDepth(100);
    this.buffHud = [];
    const buffs = [['bubble', 'pickup-bubble'], ['magnet', 'pickup-magnet'], ['coffee', 'pickup-coffee'], ['stun', 'pickup-horn']];
    for (let i = 0; i < buffs.length; i += 1) {
      const x = 760 + i * 92;
      const im = s.add.image(x, 108, buffs[i][1]).setScrollFactor(0).setDepth(100).setVisible(false).setScale(1.15);
      const tx = addText(s, x + 18, 100, '', { fontSize: '13px', color: CONFIG.COLORS.text }).setScrollFactor(0).setDepth(100);
      this.buffHud.push({ id: buffs[i][0], im, tx });
    }
  }

  setPaused(p) {
    Session.paused = p;
    this.pauseUI.root.setVisible(p);
    this.confirmUI.root.setVisible(false);
    Session.confirmOpen = false;
    this.ctl.hideTouch(p);
  }

  askQuit() {
    Session.confirmOpen = true;
    this.pauseUI.root.setVisible(false);
    this.confirmUI.root.setVisible(true);
  }

  cancelQuit() {
    Session.confirmOpen = false;
    this.confirmUI.root.setVisible(false);
    this.pauseUI.root.setVisible(true);
  }

  quitTitle() {
    Session.paused = false;
    Session.confirmOpen = false;
    Session.bot = false;
    Save.persistAll();
    this.scene.start('Title');
  }

  finish() {
    if (this._ending) return;
    this._ending = true;
    Session.sortieScore = Session.score - (Session.sortieStartScore || 0);
    Session.rank = rankFor(Session.sortieIndex, Session.sortieScore);
    qaLog('sortieEnd', { score: Session.score, sortieScore: Session.sortieScore, rank: Session.rank });
    if (Session.mode === 'endless') {
      Session.zoneClear = false;
      Session.rank = rankFor(0, Session.score);
      grantSortieBucks();
      onSortieEnd();
      writeProgress(Save.progress);
      this.time.delayedCall(200, () => this.scene.start('EndCard'));
      return;
    }
    grantSortieBucks();
    onSortieEnd();
    const sortie = getSortie(this.sortieIndex);
    const zoneClear = !!(sortie.boss) && !Session.crashed;
    if (!Session.crashed && (Session.sortieIndex === 3 || (sortie.zone || 1) === 1 && sortie.boss)) {
      Save.progress.endlessUnlocked = true;
    }
    if (zoneClear) {
      Save.progress.zonesCleared = Math.max((Save.progress.zonesCleared | 0), sortie.zone || 1);
    }
    const cleared = Session.crashed ? Session.sortieIndex : Session.sortieIndex + 1;
    Save.markProgress(cleared);
    Save.persistAll();
    Session.zoneClear = zoneClear;
    const ending = zoneClear && !!sortie.boss && (sortie.zone || 1) === 4;
    this.time.delayedCall(200, () => this.scene.start(ending ? 'Ending' : 'EndCard'));
  }

  update(_t, delta) {
    const dt = Math.min(0.05, (delta || 16) / 1000) * Session.timeScale;
    this.ctl.poll();
    if (this._rotateHold) {
      Session.paused = true;
      return;
    }
    if (this.ctl.consumePause()) {
      if (Session.confirmOpen) this.cancelQuit();
      else this.setPaused(!Session.paused);
    }
    if (Session.confirmOpen && this.ctl.consumeEnter()) this.cancelQuit();
    if (Session.paused) return;
    this.bot.update(dt);
    this.world.update(dt, this.ctl);
    if (this.endlessMode) {
      const up = this.world.boss && this.world.boss.alive;
      Audio.playMusic(up ? 'boss' : 'flying', 'Play');
    }
    this.paintHud();
  }

  paintHud() {
    this.hudScore.setText('SCORE ' + Session.score);
    this.hudCombo.setText(Session.combo > 0 ? 'COMBO x' + Session.combo : '');
    if (Session.mode === 'endless') {
      this.hudZone.setText('THE LONG RAIN');
    } else {
      const sortie = getSortie(this.sortieIndex);
      const zone = sortie.zone || 1;
      const name = (sortie.zoneName || CONFIG.ZONE1).toUpperCase();
      const n = (this.sortieIndex - (zone - 1) * 4) + 1;
      this.hudZone.setText(name + '  ·  SORTIE ' + n);
    }
    if (Session.mode === 'endless') {
      const t = (this.world.endless && this.world.endless.time) || 0;
      const m = (t / 60) | 0;
      const s = (t % 60) | 0;
      this.hudTime.setText(m + ':' + (s < 10 ? '0' : '') + s);
    } else {
      // Boss sorties have no time limit, so the countdown stays hidden.
      this.hudTime.setText((getSortie(this.sortieIndex).boss || Session.noTimer) ? '' : Math.ceil(Session.remaining) + 's');
    }
    const guns = ['', 'SINGLE', 'TWIN', 'SPREAD', 'HAIR DRYER'];
    this.hudGun.setText('GUN ' + (guns[Session.gunLevel] || Session.gunLevel));
    this.hudRockets.setText('RKT ' + Session.rockets);
    for (let i = 0; i < this.armorImgs.length; i += 1) this.armorImgs[i].setAlpha(i < Session.armor ? 1 : 0.18);
    const w = this.world;
    if (w.carrying) this.hudCargo.setText('LIFTING ' + w.carrying.def.name.toUpperCase());
    else this.hudCargo.setText(w.hookState === 'stowed' ? '' : 'HOOK OUT');
    const b = w.buffs || { bubble: 0, magnet: 0, coffee: 0, stunned: 0 };
    const vals = { bubble: b.bubble, magnet: b.magnet, coffee: b.coffee, stun: b.stunned };
    for (let i = 0; i < this.buffHud.length; i += 1) {
      const row = this.buffHud[i];
      const v = vals[row.id] || 0;
      const on = row.id === 'bubble' ? v > 0 : v > 0.05;
      row.im.setVisible(on);
      row.tx.setText(on ? (row.id === 'bubble' ? String(v) : Math.ceil(v) + 's') : '');
    }
  }
}
