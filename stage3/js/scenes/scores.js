import Phaser from '../phaser.js?v=3';
import { CONFIG } from '../config.js?v=3';
import { Save } from '../save.js?v=3';
import { addButton, addText, clearButtons, pinOverlay } from '../ui.js?v=3';

export class ScoresScene extends Phaser.Scene {
  constructor() {
    super('Scores');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    addText(this, 640, 50, 'HIGH SCORES', {
      fontSize: '36px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    this.drawTable(220, 'STORY', Save.scores.story);
    this.drawTable(760, 'ENDLESS', Save.scores.endless);
    addButton(this, 640, 650, 'BACK', () => this.scene.start('Title'), { w: 220, h: 56, primary: true });
    pinOverlay(this);
  }

  drawTable(x, title, rows) {
    addText(this, x, 110, title, {
      fontSize: '22px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    for (let i = 0; i < 10; i += 1) {
      const row = rows[i];
      const line = row
        ? `${String(i + 1).padStart(2, ' ')}   ${row.name}   ${String(row.score).padStart(6, ' ')}`
        : `${String(i + 1).padStart(2, ' ')}   ---      ----`;
      addText(this, x, 160 + i * 40, line, {
        fontSize: '20px', color: row ? CONFIG.COLORS.text : CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
      });
    }
  }
}
