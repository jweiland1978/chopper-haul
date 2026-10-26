import Phaser from '../phaser.js?v=3';
import { Save } from '../save.js?v=3';
import { Audio } from '../audio.js?v=3';
import { CONFIG, TUNING } from '../config.js?v=3';
import { addButton, addText, addSlider, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=3';
import { makeConfirm } from '../systems/input.js?v=3';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.playMusic('title', 'Settings');
    this.events.once('shutdown', () => Audio.stopMusic('Settings'));
    this.confirming = false;
    const lay = isPhone() ? this.phoneSpots() : null;
    addText(this, 640, 48, 'SETTINGS', {
      fontSize: '32px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addSlider(this, 640, lay ? lay.music : 150, 'MUSIC', () => Save.settings.music, (v) => {
      Save.settings.music = v;
      Audio.applySettings();
      Save.persistSettings();
    });
    addSlider(this, 640, lay ? lay.sfx : 230, 'SFX', () => Save.settings.sfx, (v) => {
      Save.settings.sfx = v;
      Audio.applySettings();
      Save.persistSettings();
    });
    const scan = addButton(this, 220, lay ? lay.toggles : 340, this.scanLabel(), () => {
      Save.settings.scanlines = !Save.settings.scanlines;
      Save.persistSettings();
      scan.setLabel(this.scanLabel());
      this.game.events.emit('scanlines');
    }, { w: 240, h: 64, fontSize: '16px' });
    const auto = addButton(this, 560, lay ? lay.toggles : 340, this.autoLabel(), () => {
      Save.settings.autofire = Save.settings.autofire === false;
      Save.persistSettings();
      auto.setLabel(this.autoLabel());
    }, { w: 260, h: 64, fontSize: '16px' });
    const fx = addButton(this, 980, lay ? lay.toggles : 340, this.fxLabel(), () => {
      Save.settings.reduceFx = Save.settings.reduceFx !== true;
      Save.persistSettings();
      fx.setLabel(this.fxLabel());
    }, { w: 340, h: 64, fontSize: '16px' });
    addButton(this, 640, lay ? lay.reset : 470, 'RESET PROGRESS', () => this.askReset(), { w: 420, h: 64 });
    addText(this, 640, lay ? lay.hint : 540, 'Sliders take a tap or a drag. Enter and Escape mean no.', {
      fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });
    addButton(this, 640, lay ? lay.back : 630, 'BACK', () => {
      if (this.confirming) { this.cancelReset(); return; }
      this.scene.start('Title');
    }, { w: 220, h: 56, primary: true });
    this.confirmUI = makeConfirm(this, 'ARE YOU SURE?', () => this.doReset(), () => this.cancelReset());
    this.input.keyboard.on('keydown', (ev) => {
      if (!this.confirming) return;
      const k = ev.key;
      if (k === 'Enter' || k === 'Escape' || k === 'Esc') this.cancelReset();
    });
    pinOverlay(this);
  }

  phoneSpots() {
    const hit = Math.max(64, phoneMinSize());
    const gap = TUNING.fx.phoneGap;
    const backH = Math.max(phoneMinSize(), 56);
    const back = CONFIG.HEIGHT - 8 - backH / 2;
    const reset = back - backH / 2 - 36 - gap - hit / 2;
    const toggles = reset - hit / 2 - gap - hit / 2;
    const sfx = toggles - hit / 2 - gap - hit / 2;
    const music = sfx - hit / 2 - gap - hit / 2;
    const hint = (reset + hit / 2 + back - backH / 2) / 2;
    return {
      music: Math.round(music),
      sfx: Math.round(sfx),
      toggles: Math.round(toggles),
      reset: Math.round(reset),
      hint: Math.round(hint),
      back: Math.round(back),
    };
  }

  scanLabel() { return Save.settings.scanlines ? 'SCANLINES ON' : 'SCANLINES OFF'; }
  autoLabel() { return Save.settings.autofire !== false ? 'AUTO-FIRE ON' : 'AUTO-FIRE OFF'; }
  fxLabel() { return Save.settings.reduceFx ? 'REDUCE EFFECTS ON' : 'REDUCE EFFECTS OFF'; }

  askReset() {
    this.confirming = true;
    this.confirmUI.root.setVisible(true);
  }

  cancelReset() {
    this.confirming = false;
    this.confirmUI.root.setVisible(false);
  }

  doReset() {
    this.confirming = false;
    Save.resetProgress();
    this.scene.start('Title');
  }
}
