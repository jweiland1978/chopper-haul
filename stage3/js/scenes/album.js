import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Save } from '../save.js?v=1';
import { CARGO_LIST } from '../data/cargo.js?v=1';
import { Audio } from '../audio.js?v=1';
import { addButton, addText, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=1';

export class AlbumScene extends Phaser.Scene {
  constructor() {
    super('Album');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.playMusic('title', 'Album');
    this.events.once('shutdown', () => Audio.stopMusic('Album'));
    this.index = 0;
    this.page = [];
    addText(this, 640, 40, 'CARGO ALBUM', {
      fontSize: '32px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    const phone = isPhone();
    const hit = phone ? phoneMinSize() : 56;
    const prevX = 220;
    const nextX = phone && (180 + hit) / 2 + 16 > 240 ? 220 + Math.ceil((Math.max(180, hit) + 16)) : 460;
    const backX = 1060;
    const y = 640;
    addButton(this, prevX, y, 'PREV', () => this.step(-1), { w: 180, h: 56 });
    addButton(this, nextX, y, 'NEXT', () => this.step(1), { w: 180, h: 56 });
    addButton(this, backX, y, 'BACK', () => this.scene.start('Title'), { w: 200, h: 56, primary: true });
    this.paint();
    pinOverlay(this);
  }

  step(dir) {
    const n = CARGO_LIST.length || 1;
    this.index = (this.index + dir + n) % n;
    this.paint();
  }

  paint() {
    for (let i = 0; i < this.page.length; i += 1) this.page[i].destroy();
    this.page = [];
    const def = CARGO_LIST[this.index];
    if (!def) return;
    const count = (Save.progress.album && Save.progress.album[def.id]) | 0;
    const open = count > 0;
    const img = this.add.image(360, 340, def.tex).setScale(3.4);
    if (!open) img.setTint(0x02060a).setAlpha(0.92);
    this.page.push(img);
    const page = (this.index + 1) + ' / ' + CARGO_LIST.length;
    this.page.push(addText(this, 640, 88, page, {
      fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    }));
    this.page.push(addText(this, 620, 220, open ? def.name.toUpperCase() : '???', {
      fontSize: '28px', color: open ? CONFIG.COLORS.yellowCss : CONFIG.COLORS.muted, originX: 0, originY: 0.5,
      wordWrap: { width: 560 },
    }));
    this.page.push(addText(this, 620, 300, open ? (def.bio || def.joke || '') : '???', {
      fontSize: '20px', color: open ? CONFIG.COLORS.text : CONFIG.COLORS.muted, originX: 0, originY: 0,
      wordWrap: { width: 560 },
    }));
    if (open) {
      this.page.push(addText(this, 620, 460, 'HAULED  ' + count, {
        fontSize: '16px', color: CONFIG.COLORS.orangeCss, originX: 0, originY: 0,
      }));
    }
  }
}
