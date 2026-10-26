import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { getSortie } from '../data/zones.js?v=1';
import { addButton, addText, runTypewriter, clearButtons, pinOverlay } from '../ui.js?v=1';
import { Audio } from '../audio.js?v=1';

export class BriefingScene extends Phaser.Scene {
  constructor() {
    super('Briefing');
  }

  init(data) {
    this.sortieIndex = data?.sortieIndex ?? Session.sortieIndex ?? 0;
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    const sortie = getSortie(this.sortieIndex);
    Session.sortieIndex = this.sortieIndex;

    this.add.rectangle(640, 360, 1280, 720, 0x081018, 1);
    addText(this, 640, 80, 'PETE\'S AIR RESCUE  ·  BRIEFING', {
      fontSize: '18px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 120, sortie.name.toUpperCase(), {
      fontSize: '32px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 164, CONFIG.ZONE1 + '  ·  ' + sortie.duration + 's', {
      fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });

    this.lines = sortie.briefing.slice();
    this.lineI = 0;
    this.waiting = false;
    this.lineObj = addText(this, 160, 280, '', {
      fontSize: '24px', color: CONFIG.COLORS.text, originX: 0, originY: 0, wordWrap: { width: 960 },
    });
    this.prompt = addText(this, 640, 560, '', {
      fontSize: '16px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });

    addButton(this, 1120, 80, 'SKIP', () => this.goPlay(), { w: 140, h: 48, fontSize: '18px' });

    pinOverlay(this);
    this.typer = null;
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.typeNext();
  }

  typeNext() {
    if (this.lineI >= this.lines.length) {
      this.goPlay();
      return;
    }
    const text = this.lines[this.lineI];
    this.waiting = false;
    this.prompt.setText('');
    this.lineObj.setText('');
    this.typer = runTypewriter(this, this.lineObj, text, () => {
      this.waiting = true;
      this.prompt.setText('TAP TO CONTINUE');
    });
  }

  advance() {
    Audio.unlock();
    if (this.typer && !this.waiting) {
      this.typer.skip();
      return;
    }
    if (this.waiting) {
      this.lineI += 1;
      this.typeNext();
    }
  }

  goPlay() {
    this.scene.start('Play', { sortieIndex: this.sortieIndex });
  }
}
