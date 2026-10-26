import Phaser from '../phaser.js?v=2';
import { CONFIG, TUNING } from '../config.js?v=2';
import { Save, writeProgress } from '../save.js?v=2';
import { upgradeLevel } from '../session.js?v=2';
import { Audio } from '../audio.js?v=2';
import { onMaxed } from '../achievements.js?v=2';
import { addButton, addText, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=2';

const ORDER = ['armor', 'winch', 'rope', 'gun', 'rockets', 'shocks', 'lucky'];

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.from = data && data.from === 'EndCard' ? 'EndCard' : 'Title';
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.playMusic('title', 'Shop');
    this.events.once('shutdown', () => Audio.stopMusic('Shop'));
    addText(this, 640, 36, 'UPGRADE SHOP', {
      fontSize: '32px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 78, (Save.progress.bucks | 0) + ' BUCKS', {
      fontSize: '20px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    if (isPhone()) this.layoutPhone();
    else {
      for (let i = 0; i < ORDER.length; i += 1) this.row(ORDER[i], 124 + i * 68);
      addButton(this, 640, 650, 'BACK', () => this.scene.start(this.from), { w: 220, h: 56, primary: true });
    }
    pinOverlay(this);
  }

  layoutPhone() {
    const hit = phoneMinSize();
    const h = Math.max(hit, 88);
    const gap = TUNING.fx.phoneGap;
    const backH = Math.max(hit, 56);
    const backY = CONFIG.HEIGHT - 8 - backH / 2;
    const step = h + gap;
    const nLeft = 4;
    let first = backY - backH / 2 - gap - h / 2 - (nLeft - 1) * step;
    if (first - h / 2 < 110) first = 110 + h / 2;
    first = Math.round(first);
    for (let i = 0; i < ORDER.length; i += 1) {
      const col = i < nLeft ? 0 : 1;
      const r = col === 0 ? i : i - nLeft;
      this.row(ORDER[i], Math.round(first + r * step), col === 0 ? 350 : 930, 540);
    }
    const last = first + (nLeft - 1) * step;
    let by = backY;
    if (by - backH / 2 < last + h / 2 + gap) by = last + h / 2 + gap + backH / 2;
    if (by + backH / 2 > CONFIG.HEIGHT - 4) by = CONFIG.HEIGHT - 4 - backH / 2;
    addButton(this, 640, Math.round(by), 'BACK', () => this.scene.start(this.from), { w: 220, h: 56, primary: true });
  }

  row(id, y, x, w) {
    const spec = TUNING.upgrades[id];
    const lv = upgradeLevel(id);
    const maxed = lv >= spec.max;
    const cost = maxed ? 0 : (spec.costs[lv] | 0);
    const afford = !maxed && (Save.progress.bucks | 0) >= cost;
    const head = spec.name.toUpperCase();
    const price = maxed ? 'MAX' : String(cost);
    const label = (maxed ? '' : 'BUY  ') + head + '  LV ' + lv + '/' + spec.max + '  ' + price + '  ' + spec.desc;
    addButton(this, x || 640, y, label, () => this.buy(id), {
      w: w || 1120, h: 60, fontSize: '15px', dim: maxed || !afford,
    });
  }

  buy(id) {
    const spec = TUNING.upgrades[id];
    if (!spec) return;
    const lv = upgradeLevel(id);
    if (lv >= spec.max) return;
    const cost = spec.costs[lv] | 0;
    if ((Save.progress.bucks | 0) < cost) return;
    if (!Save.progress.upgrades || typeof Save.progress.upgrades !== 'object' || Array.isArray(Save.progress.upgrades)) {
      Save.progress.upgrades = {};
    }
    Save.progress.bucks = Math.max(0, (Save.progress.bucks | 0) - cost);
    Save.progress.upgrades[id] = lv + 1;
    Save.dirtyProgress = true;
    writeProgress(Save.progress);
    onMaxed(lv + 1, spec.max);
    this.scene.restart({ from: this.from });
  }
}
