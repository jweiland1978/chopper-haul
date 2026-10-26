import Phaser from '../phaser.js?v=1';
import { CONFIG } from '../config.js?v=1';
import { Session, resetRun } from '../session.js?v=1';
import { Save } from '../save.js?v=1';
import { Audio } from '../audio.js?v=1';
import { addButton, addText, clearButtons, pinOverlay } from '../ui.js?v=1';
import { isTouchDevice } from '../systems/input.js?v=1';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    clearButtons(this);
    this.input.setTopOnly(false);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.unlock();
    Session.paused = false;

    this.add.tileSprite(640, 200, 1280, 420, 'bg-sky').setTileScale(5, 2.4);
    this.add.tileSprite(640, 430, 1280, 260, 'bg-far').setTileScale(2.4, 1.5);
    this.add.tileSprite(640, 640, 1280, 180, 'bg-near').setTileScale(2.5, 1.2);

    this.add.image(640, 150, 'logo').setScale(0.92);
    this.add.image(980, 430, 'chopper').setScale(1.4);
    this.add.image(980, 392, 'rotor-a');
    this.tweens.add({
      targets: this.add.image(980, 392, 'rotor-b').setAlpha(0.2),
      alpha: 1,
      duration: 80,
      yoyo: true,
      repeat: -1,
    });

    addText(this, 640, 268, "Pete's Air Rescue  ·  Mudflat County  ·  The Big Rain of '84", {
      fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });

    addButton(this, 640, 360, 'PLAY', () => this.play(), { w: 320, h: 64, primary: true, fontSize: '28px' });
    addButton(this, 640, 440, 'HIGH SCORES', () => this.scene.start('Scores'), { w: 320, h: 56 });
    addButton(this, 1180, 660, 'CREDITS', () => this.scene.start('Credits'), { w: 160, h: 48, fontSize: '16px' });

    addText(this, 24, 690, CONFIG.AI_CREDIT, {
      fontSize: '13px', color: CONFIG.COLORS.muted, originX: 0, originY: 1,
    });
    addText(this, 24, 24, 'GRAVEL FALLS FARMLAND', {
      fontSize: '14px', color: CONFIG.COLORS.orangeCss, originX: 0, originY: 0,
    });

    this.input.keyboard.on('keydown-ENTER', () => this.play());
    this.input.keyboard.on('keydown-SPACE', () => this.play());
    pinOverlay(this);
  }

  play() {
    Audio.unlock();
    resetRun(0);
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;
    this.scene.start('Briefing', { sortieIndex: 0 });
  }
}
