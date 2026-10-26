import Phaser from '../phaser.js?v=2';
import { CONFIG } from '../config.js?v=2';
import { addButton, addText, clearButtons, pinOverlay } from '../ui.js?v=2';
import { Audio } from '../audio.js?v=2';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.playMusic('title', 'Credits');
    this.events.once('shutdown', () => Audio.stopMusic('Credits'));
    addText(this, 640, 80, 'CREDITS', {
      fontSize: '36px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    const lines = [
      CONFIG.TITLE,
      "Pete's Air Rescue  ·  Mudflat County",
      'Gravel Falls Farmland  ·  Muddy Fork River',
      '',
      CONFIG.AI_CREDIT,
      '',
      'Buzzard Bros. Salvage Co. would like a word.',
      'Brenda remains unimpressed.',
      '',
      'No real towns. No real brands. Just a flooded river.',
    ];
    for (let i = 0; i < lines.length; i += 1) {
      addText(this, 640, 160 + i * 36, lines[i], {
        fontSize: i === 4 ? '18px' : '20px',
        color: i === 4 ? CONFIG.COLORS.yellowCss : CONFIG.COLORS.text,
        originX: 0.5,
        originY: 0.5,
        wordWrap: { width: 1000 },
        align: 'center',
      });
    }
    addButton(this, 640, 640, 'BACK', () => this.scene.start('Title'), { w: 220, h: 56, primary: true });
    pinOverlay(this);
  }
}
