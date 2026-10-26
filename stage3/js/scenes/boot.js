import Phaser from '../phaser.js?v=3';
import { CONFIG } from '../config.js?v=3';
import { Save } from '../save.js?v=3';
import { Audio } from '../audio.js?v=3';
import { addText } from '../ui.js?v=3';
import { buildTextures } from '../textures.js?v=3';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#081018');
    addText(this, 640, 300, "CHOPPER HAUL '84", {
      fontSize: '42px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 360, 'WARMING THE ROTOR', {
      fontSize: '18px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });
    buildTextures(this);
    Save.boot();
    Audio.applySettings();
    this.scene.launch('Overlay');
    this.scene.start('Title');
  }
}
