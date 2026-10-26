import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Save } from '../save.js?v=1';
import { ACHIEVEMENTS } from '../data/achievements.js?v=1';
import { Audio } from '../audio.js?v=1';
import { addButton, addText, clearButtons, pinOverlay } from '../ui.js?v=1';

export class AwardsScene extends Phaser.Scene {
  constructor() {
    super('Awards');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.playMusic('title', 'Awards');
    this.events.once('shutdown', () => Audio.stopMusic('Awards'));
    const have = {};
    const list = (Save.progress && Save.progress.achievements) || [];
    for (let i = 0; i < list.length; i += 1) have[list[i]] = true;
    let n = 0;
    for (let i = 0; i < ACHIEVEMENTS.length; i += 1) if (have[ACHIEVEMENTS[i].id]) n += 1;
    addText(this, 640, 36, 'ACHIEVEMENTS', {
      fontSize: '32px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 72, n + ' / ' + ACHIEVEMENTS.length, {
      fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });
    for (let i = 0; i < ACHIEVEMENTS.length; i += 1) {
      const row = ACHIEVEMENTS[i];
      const on = !!have[row.id];
      const col = i % 2;
      const r = (i / 2) | 0;
      const x = 70 + col * 620;
      const y = 108 + r * 84;
      this.add.rectangle(x + 270, y + 22, 540, 72, 0x121c28, on ? 0.92 : 0.4).setStrokeStyle(2, on ? CONFIG.COLORS.orange : 0x3a4450);
      const name = addText(this, x + 16, y + 4, row.name, {
        fontSize: '18px', color: on ? CONFIG.COLORS.yellowCss : '#7d8794', originX: 0, originY: 0,
      });
      if (!on) name.setAlpha(0.55);
      addText(this, x + 16, y + 34, on ? row.desc : '???', {
        fontSize: '14px', color: on ? CONFIG.COLORS.text : CONFIG.COLORS.muted, originX: 0, originY: 0,
        wordWrap: { width: 500 },
      });
    }
    addButton(this, 640, 660, 'BACK', () => this.scene.start('Title'), { w: 220, h: 56, primary: true });
    pinOverlay(this);
  }
}
