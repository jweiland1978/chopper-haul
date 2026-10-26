import Phaser from '../phaser.js?v=1';
import { Save } from '../save.js?v=1';

export class OverlayScene extends Phaser.Scene {
  constructor() {
    super('Overlay');
  }

  create() {
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
}
