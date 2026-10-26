import Phaser from '../phaser.js?v=3';
import { CONFIG } from '../config.js?v=3';
import { Session, resetRun } from '../session.js?v=3';
import { Save, qualifies } from '../save.js?v=3';
import { Audio } from '../audio.js?v=3';
import { addButton, addText, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=3';
import { isTouchDevice } from '../systems/input.js?v=3';

const NODES = [
  { zone: 1, label: 'GRAVEL FALLS', x: 300, y: 470 },
  { zone: 2, label: 'CRUMB CREEK', x: 590, y: 280 },
  { zone: 3, label: 'PORT DISMAL', x: 900, y: 450 },
  { zone: 4, label: 'BUSTED DAM', x: 1060, y: 230 },
];

export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  init(data) {
    this.continueRun = !!(data && data.continueRun);
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    Audio.unlock();
    Audio.playMusic('title', 'Map');
    this.events.once('shutdown', () => Audio.stopMusic('Map'));

    this.drawCounty();
    addText(this, 640, 48, 'MUDFLAT COUNTY', {
      fontSize: '32px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 84, "The Big Rain of '84  ·  pick a zone", {
      fontSize: '16px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });

    const cleared = (Save.progress && Save.progress.zonesCleared) | 0;
    const current = cleared < 4 ? cleared + 1 : 0;
    for (let i = 0; i < NODES.length; i += 1) {
      const node = NODES[i];
      const open = node.zone <= cleared + 1;
      const done = node.zone <= cleared;
      const now = node.zone === current;
      addButton(this, node.x, node.y, node.label, () => this.pick(node.zone, open), {
        w: 250, h: 64, fontSize: '16px', primary: now, dim: !open,
      });
      const tag = !open ? 'LOCKED' : (done ? 'CLEARED' : (now ? 'NOW' : 'OPEN'));
      const color = done ? CONFIG.COLORS.goodCss : (now ? CONFIG.COLORS.orangeCss : CONFIG.COLORS.muted);
      const tagY = node.y + (isPhone() ? Math.max(46, phoneMinSize() / 2 + 16) : 46);
      addText(this, node.x, tagY, tag, {
        fontSize: '13px', color, originX: 0.5, originY: 0.5,
      });
    }

    addButton(this, 160, 660, 'TITLE', () => this.toTitle(), { w: 200, h: 52 });
    pinOverlay(this);
  }

  drawCounty() {
    const g = this.add.graphics();
    g.fillStyle(0x142033, 1);
    g.fillEllipse(640, 390, 1080, 520);
    g.fillStyle(0x1d4a32, 1);
    g.fillEllipse(420, 460, 420, 240);
    g.fillEllipse(780, 340, 520, 280);
    g.fillStyle(0x1a6a7a, 1);
    g.fillEllipse(640, 560, 900, 70);
    g.lineStyle(8, 0x2e8a9a, 1);
    g.beginPath();
    g.moveTo(80, 520);
    g.lineTo(300, 500);
    g.lineTo(560, 360);
    g.lineTo(860, 480);
    g.lineTo(1100, 300);
    g.lineTo(1220, 260);
    g.strokePath();
    g.lineStyle(4, 0xc4a060, 0.9);
    g.beginPath();
    g.moveTo(300, 470);
    g.lineTo(590, 280);
    g.lineTo(900, 450);
    g.lineTo(1060, 230);
    g.strokePath();
    addText(this, 640, 600, 'MUDDY FORK RIVER', {
      fontSize: '13px', color: '#9ad8f0', originX: 0.5, originY: 0.5,
    });
  }

  pick(zone, open) {
    if (!open) return;
    const start = (zone - 1) * 4;
    const end = start + 4;
    const prog = (Save.progress && Save.progress.sortiesCleared) | 0;
    let idx = start;
    if (prog > start && prog < end) idx = prog;
    const keep = this.continueRun;
    const score = Session.score;
    const jokes = Session.jokes.slice();
    const kills = Session.kills;
    const wreck = Session.wreckKills;
    const delivered = Session.delivered;
    resetRun(idx);
    if (keep) {
      Session.score = score;
      Session.sortieStartScore = score;
      Session.jokes = jokes;
      Session.kills = kills;
      Session.wreckKills = wreck;
      Session.delivered = delivered;
    }
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;
    this.scene.start('Briefing', { sortieIndex: idx });
  }

  toTitle() {
    const story = Session.mode !== 'endless';
    if (story && Session.score > 0 && !Session.scorePosted && qualifies(Save.scores, 'story', Session.score)) {
      Session.promptScore = true;
      Session.leaveAfterPost = true;
      this.scene.start('EndCard');
      return;
    }
    this.scene.start('Title');
  }
}
