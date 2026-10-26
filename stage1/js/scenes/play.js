import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { Save } from '../save.js?v=1';
import { Audio } from '../audio.js?v=1';
import { getSortie, rankFor } from '../data/zones.js?v=1';
import { addText, clearButtons, pinOverlay } from '../ui.js?v=1';
import { InputCtl, makePauseOverlay, makeConfirm } from '../systems/input.js?v=1';
import { World } from '../systems/sim.js?v=1';
import { Bot } from '../systems/bot.js?v=1';
import { qaLog } from '../qalog.js?v=1';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init(data) {
    this.sortieIndex = data?.sortieIndex ?? Session.sortieIndex ?? 0;
    this.noEnemies = !!(data && data.noEnemies);
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

    this.world = new World(this, this.sortieIndex, { noEnemies: this.noEnemies });
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
    pinOverlay(this);
  }

  buildHud() {
    const s = this;
    this.hudScore = addText(s, 16, 10, '0', { fontSize: '22px', color: CONFIG.COLORS.yellowCss }).setScrollFactor(0).setDepth(100);
    this.hudCombo = addText(s, 16, 36, '', { fontSize: '18px', color: CONFIG.COLORS.orangeCss }).setScrollFactor(0).setDepth(100);
    this.hudTime = addText(s, 640, 12, '0', { fontSize: '22px', color: CONFIG.COLORS.text, originX: 0.5 }).setScrollFactor(0).setDepth(100);
    this.hudGun = addText(s, 16, 60, 'GUN 1', { fontSize: '14px', color: CONFIG.COLORS.muted }).setScrollFactor(0).setDepth(100);
    this.armorImgs = [];
    for (let i = 0; i < CONFIG.ARMOR; i += 1) {
      this.armorImgs.push(s.add.image(200 + i * 22, 22, 'armor').setScrollFactor(0).setDepth(100));
    }
    this.hudRockets = addText(s, 200, 44, 'RKT 5', { fontSize: '14px', color: CONFIG.COLORS.text }).setScrollFactor(0).setDepth(100);
    this.hudCargo = addText(s, 16, 82, '', { fontSize: '14px', color: CONFIG.COLORS.goodCss }).setScrollFactor(0).setDepth(100);
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
    this.scene.start('Title');
  }

  finish() {
    if (this._ending) return;
    this._ending = true;
    Session.sortieScore = Session.score - (Session.sortieStartScore || 0);
    Session.rank = rankFor(Session.sortieIndex, Session.sortieScore);
    qaLog('sortieEnd', { score: Session.score, sortieScore: Session.sortieScore, rank: Session.rank });
    const cleared = Session.crashed ? Session.sortieIndex : Session.sortieIndex + 1;
    Save.markProgress(cleared);
    Save.persistAll();
    const zoneClear = Session.sortieIndex >= 3 && !Session.crashed;
    Session.zoneClear = zoneClear;
    this.time.delayedCall(200, () => this.scene.start('EndCard'));
  }

  update(_t, delta) {
    const dt = Math.min(0.05, (delta || 16) / 1000) * Session.timeScale;
    this.ctl.poll();
    if (this.ctl.consumePause()) {
      if (Session.confirmOpen) this.cancelQuit();
      else this.setPaused(!Session.paused);
    }
    if (Session.confirmOpen && this.ctl.consumeEnter()) this.cancelQuit();
    if (Session.paused) return;
    this.bot.update(dt);
    this.world.update(dt, this.ctl);
    this.paintHud();
  }

  paintHud() {
    this.hudScore.setText('SCORE ' + Session.score);
    this.hudCombo.setText(Session.combo > 0 ? 'COMBO x' + Session.combo : '');
    // The Blimp fight has no time limit, so it shows no countdown.
    this.hudTime.setText(getSortie(this.sortieIndex).boss ? '' : Math.ceil(Session.remaining) + 's');
    const guns = ['', 'SINGLE', 'TWIN', 'SPREAD', 'HAIR DRYER'];
    this.hudGun.setText('GUN ' + (guns[Session.gunLevel] || Session.gunLevel));
    this.hudRockets.setText('RKT ' + Session.rockets);
    for (let i = 0; i < this.armorImgs.length; i += 1) this.armorImgs[i].setAlpha(i < Session.armor ? 1 : 0.18);
    const w = this.world;
    if (w.carrying) this.hudCargo.setText('LIFTING ' + w.carrying.def.name.toUpperCase());
    else this.hudCargo.setText(w.hookState === 'stowed' ? '' : 'HOOK OUT');
  }
}
