import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { addButton, addText, runTypewriter, clearButtons, pinOverlay } from '../ui.js?v=1';
import { Audio } from '../audio.js?v=1';

const LINES = [
  'Vulture One coughs, and both Buzzard brothers step out onto one parachute. They are still arguing about whose stick it was.',
  'Big Earl\'s magnet is a paperweight. The junk twister is only a breeze with bad manners.',
  'The Big Rain of \'84 lets up over Mudflat County. Pete turns for home. The couch can wait until tomorrow.',
];

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.unlock();
    Audio.playMusic('title', 'Ending');
    this.events.once('shutdown', () => Audio.stopMusic('Ending'));
    this.add.rectangle(640, 360, 1280, 720, 0x081018, 1);
    addText(this, 640, 90, 'THE RAIN LETS UP', {
      fontSize: '32px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    this.lines = LINES.slice();
    this.lineI = 0;
    this.waiting = false;
    this.lineObj = addText(this, 160, 240, '', {
      fontSize: '24px', color: CONFIG.COLORS.text, originX: 0, originY: 0, wordWrap: { width: 960 },
    });
    this.prompt = addText(this, 640, 580, '', {
      fontSize: '16px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addButton(this, 1120, 80, 'SKIP', () => this.done(), { w: 140, h: 48, fontSize: '18px' });
    pinOverlay(this);
    this.typer = null;
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.typeNext();
  }

  typeNext() {
    if (this.lineI >= this.lines.length) {
      this.done();
      return;
    }
    this.waiting = false;
    this.prompt.setText('');
    this.lineObj.setText('');
    this.typer = runTypewriter(this, this.lineObj, this.lines[this.lineI], () => {
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

  done() {
    this.scene.start('EndCard');
  }
}
