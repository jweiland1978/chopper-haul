import Phaser from '../phaser.js?v=2';
import { CONFIG } from '../config.js?v=2';
import { Save } from '../save.js?v=2';
import { drainToasts, noteToast } from '../toast.js?v=2';

export class OverlayScene extends Phaser.Scene {
  constructor() {
    super('Overlay');
  }

  create() {
    this.toastQ = [];
    this.toastBusy = false;
    this.input.enabled = false;
    drainToasts(this);
    if (!this.textures.exists('scanlines')) return;
    this.scan = this.add.tileSprite(640, 360, 1280, 720, 'scanlines')
      .setScrollFactor(0)
      .setDepth(3000)
      .setAlpha(0.18);
    this.scan.setVisible(!!Save.settings.scanlines);
    this.game.events.on('scanlines', () => {
      this.scan.setVisible(!!Save.settings.scanlines);
    });
    this.events.on('update', () => {
      if (!this.scan) return;
      this.scan.setVisible(!!Save.settings.scanlines);
    });
    this.scene.bringToTop();
    this.input.enabled = false;
  }

  enqueueToast(title, sub) {
    if (!this.toastQ) this.toastQ = [];
    this.toastQ.push({ title: title || '', sub: sub || '' });
    if (!this.toastBusy) this.pumpToast();
  }

  pumpToast() {
    const item = this.toastQ.shift();
    if (!item) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;
    noteToast();
    const panel = this.add.rectangle(640, 52, 620, 76, CONFIG.COLORS.panel, 0.96).setDepth(4000).setScrollFactor(0);
    panel.setStrokeStyle(3, CONFIG.COLORS.orange);
    const head = this.add.text(640, 32, item.title, {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '20px', color: CONFIG.COLORS.yellowCss,
    }).setOrigin(0.5).setDepth(4001).setScrollFactor(0);
    const body = this.add.text(640, 62, item.sub, {
      fontFamily: CONFIG.FONTS.pixel, fontSize: '14px', color: CONFIG.COLORS.text,
    }).setOrigin(0.5).setDepth(4001).setScrollFactor(0);
    this.time.delayedCall(2500, () => {
      panel.destroy();
      head.destroy();
      body.destroy();
      this.pumpToast();
    });
  }
}
