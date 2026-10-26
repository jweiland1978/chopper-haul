import Phaser from '../phaser.js?v=1';
import { Session, resetRun } from '../session.js?v=1';
import { Save } from '../save.js?v=1';
import { Audio } from '../audio.js?v=1';
import { CONFIG, TUNING } from '../config.js?v=1';
import { addButton, addText, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=1';
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
    Audio.playMusic('title', 'Title');
    this.events.once('shutdown', () => Audio.stopMusic('Title'));
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

    addText(this, 24, 24, 'GRAVEL FALLS FARMLAND', {
      fontSize: '14px', color: CONFIG.COLORS.orangeCss, originX: 0, originY: 0,
    });
    addText(this, 24, 48, 'v1.0 test build', {
      fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0, originY: 0,
    });
    addText(this, 1256, 28, (Save.progress.bucks | 0) + ' BUCKS', {
      fontSize: '16px', color: CONFIG.COLORS.yellowCss, originX: 1, originY: 0,
    });
    addText(this, 24, 690, CONFIG.AI_CREDIT, {
      fontSize: '13px', color: CONFIG.COLORS.muted, originX: 0, originY: 1,
    });

    const endlessOpen = !!(Save.progress && Save.progress.endlessUnlocked);
    if (isPhone()) {
      const hit = phoneMinSize();
      const gap = TUNING.fx.phoneGap;
      const hBig = Math.max(64, hit);
      const hMid = Math.max(56, hit);
      const subY = 224;
      addText(this, 640, subY, "Pete's Air Rescue  ·  Mudflat County  ·  The Big Rain of '84", {
        fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
      });
      let y = Math.round(subY + 10 + gap + hBig / 2);
      addButton(this, 640, y, 'PLAY', () => this.play(), { w: 320, h: 64, primary: true, fontSize: '28px' });
      y = Math.round(y + hBig / 2 + gap + hMid / 2);
      addButton(this, 640, y, 'HIGH SCORES', () => this.scene.start('Scores'), { w: 320, h: 56 });
      y = Math.round(y + hMid / 2 + gap + hMid / 2);
      const endlessY = y;
      addButton(this, 640, endlessY, 'ENDLESS', () => this.endless(), { w: 320, h: 56, dim: !endlessOpen });
      const rowY = Math.min(CONFIG.HEIGHT - 8 - hMid / 2, Math.max(616, Math.round(endlessY + hMid / 2 + gap + hMid / 2)));
      addButton(this, 200, rowY, 'SHOP', () => this.scene.start('Shop', { from: 'Title' }), { w: 200, h: 56 });
      addButton(this, 460, rowY, 'ALBUM', () => this.scene.start('Album'), { w: 200, h: 56 });
      addButton(this, 720, rowY, 'AWARDS', () => this.scene.start('Awards'), { w: 200, h: 56 });
      addButton(this, 980, rowY, 'SETTINGS', () => this.scene.start('Settings'), { w: 200, h: 56 });
      const credH = Math.max(48, hit);
      addButton(this, 1180, Math.min(660, CONFIG.HEIGHT - 8 - credH / 2), 'CREDITS', () => this.scene.start('Credits'), { w: 160, h: 48, fontSize: '16px' });
      if (!endlessOpen) {
        addText(this, 1040, endlessY, 'Clear zone 1 to unlock', {
          fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
        });
      }
    } else {
      addText(this, 640, 268, "Pete's Air Rescue  ·  Mudflat County  ·  The Big Rain of '84", {
        fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
      });
      addButton(this, 640, 340, 'PLAY', () => this.play(), { w: 320, h: 64, primary: true, fontSize: '28px' });
      addButton(this, 640, 418, 'HIGH SCORES', () => this.scene.start('Scores'), { w: 320, h: 56 });
      addButton(this, 1180, 660, 'CREDITS', () => this.scene.start('Credits'), { w: 160, h: 48, fontSize: '16px' });
      addButton(this, 200, 616, 'SHOP', () => this.scene.start('Shop', { from: 'Title' }), { w: 200, h: 56 });
      addButton(this, 430, 616, 'ALBUM', () => this.scene.start('Album'), { w: 200, h: 56 });
      addButton(this, 660, 616, 'AWARDS', () => this.scene.start('Awards'), { w: 200, h: 56 });
      addButton(this, 890, 616, 'SETTINGS', () => this.scene.start('Settings'), { w: 200, h: 56 });
      addButton(this, 640, 512, 'ENDLESS', () => this.endless(), { w: 320, h: 56, dim: !endlessOpen });
      if (!endlessOpen) {
        addText(this, 640, 562, 'Clear zone 1 to unlock', {
          fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
        });
      }
    }

    this.input.keyboard.on('keydown-ENTER', () => this.play());
    this.input.keyboard.on('keydown-SPACE', () => this.play());
    pinOverlay(this);
  }

  play() {
    Audio.unlock();
    resetRun(0);
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;
    this.scene.start('Map');
  }

  endless() {
    if (!(Save.progress && Save.progress.endlessUnlocked)) return;
    Audio.unlock();
    resetRun(0);
    Session.mode = 'endless';
    Session.noTimer = true;
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;
    this.scene.start('Play', { sortieIndex: 0, endless: true });
  }
}
