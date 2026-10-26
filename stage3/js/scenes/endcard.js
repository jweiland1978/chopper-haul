import Phaser from '../phaser.js?v=3';
import { CONFIG, TUNING } from '../config.js?v=3';
import { Session, resetRun } from '../session.js?v=3';
import { Save, qualifies, insertScore, writeProgress } from '../save.js?v=3';
import { grantSortieBucks } from '../meta.js?v=3';
import { Audio } from '../audio.js?v=3';
import { SORTIES, getSortie, rankFor } from '../data/zones.js?v=3';
import { addButton, addText, clearButtons, pinOverlay, isPhone, phoneMinSize } from '../ui.js?v=3';
import { noteJingle } from '../systems/fx.js?v=3';
import { isTouchDevice } from '../systems/input.js?v=3';

export class EndCardScene extends Phaser.Scene {
  constructor() {
    super('EndCard');
  }

  create() {
    clearButtons(this);
    this.cameras.main.setBackgroundColor('#081018');
    this.add.tileSprite(640, 200, 1280, 420, 'bg-sky').setTileScale(5, 2.4);
    const endless = Session.mode === 'endless';
    this.scoreMode = endless ? 'endless' : 'story';
    const sortie = getSortie(Session.sortieIndex);
    // Rank is per sortie: points earned this sortie vs that sortie's par (total score carries over).
    Session.sortieScore = Session.score - (Session.sortieStartScore || 0);
    if (!endless) Session.rank = rankFor(Session.sortieIndex, Session.sortieScore);
    if (Session.rank === 'S' && Audio.play('srank')) noteJingle();
    if (!Session.bucksPaid) {
      grantSortieBucks();
      writeProgress(Save.progress);
    }

    const zoneClear = !!Session.zoneClear && !endless;
    const zoneLabel = (sortie.zoneName || 'GRAVEL FALLS').toUpperCase();
    const head = endless ? (Session.crashed ? 'CHOPPER DOWN' : 'THE LONG RAIN') : (zoneClear ? 'ZONE CLEAR  ·  ' + zoneLabel : (Session.crashed ? 'CHOPPER DOWN' : 'SORTIE COMPLETE'));
    addText(this, 640, 70, head, {
      fontSize: '28px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
    });
    addText(this, 640, 112, endless ? 'THE LONG RAIN' : sortie.name.toUpperCase(), {
      fontSize: '18px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });

    addText(this, 1240, 168, '+' + (Session.bucksGain | 0) + ' BUCKS', {
      fontSize: '22px', color: CONFIG.COLORS.goodCss, originX: 1, originY: 0.5,
    });
    addText(this, 640, 180, 'SORTIE ' + Session.sortieScore + '   TOTAL ' + Session.score, {
      fontSize: '36px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
    });
    const clock = (Session.endlessTime | 0);
    const cm = (clock / 60) | 0;
    const cs = clock % 60;
    addText(this, 640, 240, endless ? ('TIME  ' + cm + ':' + (cs < 10 ? '0' : '') + cs) : ('RANK  ' + Session.rank), {
      fontSize: '64px', color: !endless && Session.rank === 'S' ? CONFIG.COLORS.yellowCss : CONFIG.COLORS.text, originX: 0.5, originY: 0.5,
    });
    const stats = endless
      ? ('ONE LIFE   MINI-BOSSES ' + (Session.endlessMinis | 0) + '   KILLS ' + Session.kills)
      : ('PAR ' + sortie.par + '   KILLS ' + Session.kills + '   DELIVERED ' + Session.delivered + '   WRECK ' + Session.wreckKills);
    addText(this, 640, 300, stats, {
      fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
    });

    const joke = Session.lastJoke || Session.jokes[0] || 'Mudflat County still needs you.';
    addText(this, 640, 350, '"' + joke + '"', {
      fontSize: '20px', color: CONFIG.COLORS.text, originX: 0.5, originY: 0.5, wordWrap: { width: 900 }, align: 'center',
    });

    Audio.playMusic('title', 'EndCard');
    this.events.once('shutdown', () => Audio.stopMusic('EndCard'));
    pinOverlay(this);
    this.entering = false;
    const ask = !!Session.promptScore;
    Session.promptScore = false;
    const storyDone = zoneClear && !!sortie.boss && (sortie.zone || 1) === 4;
    // Initials only when the run is over (crash, endless, or Vulture One), or when leaving via TITLE.
    const runOver = endless || Session.crashed || storyDone;
    if ((runOver || ask) && this.canPost()) {
      this.showEntry();
    } else {
      this.showButtons();
    }
  }

  canPost() {
    const mode = this.scoreMode || (Session.mode === 'endless' ? 'endless' : 'story');
    return !Session.scorePosted && Session.score > 0 && qualifies(Save.scores, mode, Session.score);
  }

  toTitle() {
    if (this.canPost()) {
      Session.leaveAfterPost = true;
      this.children.list.filter((o) => o.input || o.type === 'Text').forEach((o) => { if (o.y >= 440) o.destroy(); });
      clearButtons(this);
      this.showEntry();
      return;
    }
    this.scene.start('Title');
  }

  openShop() {
    this.scene.start('Shop', { from: 'EndCard' });
  }

  showButtons() {
    addButton(this, 1080, 640, 'SHOP', () => this.openShop(), { w: 200, h: 56 });
    if (isPhone()) {
      this.phoneActions();
      return;
    }
    if (Session.mode === 'endless') {
      addButton(this, 640, 480, 'RETRY', () => this.retry(), { w: 300, h: 56, primary: true });
      addButton(this, 640, 556, 'TITLE', () => this.toTitle(), { w: 300, h: 56 });
      return;
    }
    const nextIdx = Session.sortieIndex + 1;
    const more = nextIdx < SORTIES.length;
    const canNext = !Session.crashed && more && !Session.zoneClear;
    const canZone = !Session.crashed && more && !!Session.zoneClear;
    if (canNext) {
      addButton(this, 640, 460, 'NEXT SORTIE', () => this.nextSortie(), { w: 300, h: 56, primary: true });
    } else if (canZone) {
      addButton(this, 640, 460, 'NEXT ZONE', () => this.toMap(), { w: 300, h: 56, primary: true });
    } else if (Session.zoneClear) {
      addButton(this, 640, 460, 'TITLE', () => this.toTitle(), { w: 300, h: 56, primary: true });
    }
    addButton(this, 640, 532, 'RETRY', () => this.retry(), { w: 300, h: 56 });
    if (!Session.zoneClear || canZone) addButton(this, 640, 604, 'TITLE', () => this.toTitle(), { w: 300, h: 56 });
  }

  phoneActions() {
    const items = [];
    if (Session.mode === 'endless') {
      items.push(['RETRY', () => this.retry(), true]);
      items.push(['TITLE', () => this.toTitle(), false]);
    } else {
      const nextIdx = Session.sortieIndex + 1;
      const more = nextIdx < SORTIES.length;
      const canNext = !Session.crashed && more && !Session.zoneClear;
      const canZone = !Session.crashed && more && !!Session.zoneClear;
      if (canNext) items.push(['NEXT SORTIE', () => this.nextSortie(), true]);
      else if (canZone) items.push(['NEXT ZONE', () => this.toMap(), true]);
      else if (Session.zoneClear) items.push(['TITLE', () => this.toTitle(), true]);
      items.push(['RETRY', () => this.retry(), false]);
      if (!Session.zoneClear || canZone) items.push(['TITLE', () => this.toTitle(), false]);
    }
    const h = Math.max(56, phoneMinSize());
    const gap = TUNING.fx.phoneGap;
    const bottom = CONFIG.HEIGHT - 8 - h / 2;
    for (let i = 0; i < items.length; i += 1) {
      const y = Math.round(bottom - (items.length - 1 - i) * (h + gap));
      addButton(this, 640, y, items[i][0], items[i][1], { w: 300, h: 56, primary: !!items[i][2] });
    }
  }

  showEntry() {
    this.entering = true;
    this.letters = ['A', 'A', 'A'];
    this.slot = 0;
    const phone = isPhone();
    const hit = phone ? Math.max(phoneMinSize(), 48) : 48;
    const gap = TUNING.fx.phoneGap;
    const xs = phone ? [640 - (hit + gap), 640, 640 + (hit + gap)] : [520, 640, 760];
    const plusY = phone ? Math.round(372 + hit / 2) : 410;
    const letterY = phone ? Math.round(plusY + hit / 2 + gap + 24) : 470;
    const minusY = phone ? Math.round(letterY + 24 + gap + hit / 2) : 530;
    let okY = phone ? Math.round(minusY + hit / 2 + gap + Math.max(56, hit) / 2) : 610;
    if (phone && okY + Math.max(56, hit) / 2 > CONFIG.HEIGHT - 8) okY = Math.round(CONFIG.HEIGHT - 8 - Math.max(56, hit) / 2);
    addText(this, phone ? 24 : 640, phone ? plusY : 400, 'HIGH SCORE  ·  INITIALS', {
      fontSize: phone ? '22px' : '16px', color: CONFIG.COLORS.orangeCss, originX: phone ? 0 : 0.5, originY: 0.5,
    });
    this.slotText = [];
    for (let i = 0; i < 3; i += 1) {
      const x = xs[i];
      this.slotText.push(addText(this, x, letterY, 'A', {
        fontSize: '48px', color: CONFIG.COLORS.yellowCss, originX: 0.5, originY: 0.5,
      }));
      addButton(this, x, plusY, '+', () => this.nudge(i, 1), { w: 72, h: 48, fontSize: '24px' });
      addButton(this, x, minusY, '-', () => this.nudge(i, -1), { w: 72, h: 48, fontSize: '24px' });
    }
    addButton(this, 640, okY, 'OK', () => this.commitScore(), { w: 200, h: 56, primary: true });
    addButton(this, 1080, 640, 'SHOP', () => this.openShop(), { w: 200, h: 56 });
    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.paintSlots();
  }

  paintSlots() {
    for (let i = 0; i < 3; i += 1) {
      this.slotText[i].setText(this.letters[i]);
      this.slotText[i].setColor(i === this.slot ? CONFIG.COLORS.orangeCss : CONFIG.COLORS.yellowCss);
    }
  }

  nudge(i, dir) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = (alphabet.indexOf(this.letters[i]) + dir + 26) % 26;
    this.letters[i] = alphabet[idx];
    this.slot = i;
    this.paintSlots();
    Audio.play('click');
  }

  onKey(e) {
    if (!this.entering) return;
    const k = e.key;
    if (k === 'ArrowLeft') { this.slot = (this.slot + 2) % 3; this.paintSlots(); }
    else if (k === 'ArrowRight') { this.slot = (this.slot + 1) % 3; this.paintSlots(); }
    else if (k === 'ArrowUp') this.nudge(this.slot, 1);
    else if (k === 'ArrowDown') this.nudge(this.slot, -1);
    else if (k === 'Backspace') {
      this.letters[this.slot] = 'A';
      this.slot = Math.max(0, this.slot - 1);
      this.paintSlots();
    } else if (k === 'Enter') this.commitScore();
    else if (/^[a-zA-Z]$/.test(k)) {
      this.letters[this.slot] = k.toUpperCase();
      this.slot = Math.min(2, this.slot + 1);
      this.paintSlots();
    }
  }

  commitScore() {
    if (!this.entering) return;
    this.entering = false;
    const name = this.letters.join('');
    insertScore(Save.scores, this.scoreMode || 'story', name, Session.score);
    Save.dirtyScores = true;
    Session.scorePosted = true;
    Save.persistAll();
    if (Session.leaveAfterPost) {
      Session.leaveAfterPost = false;
      this.scene.start('Title');
      return;
    }
    this.scene.restart();
  }

  toMap() {
    this.scene.start('Map', { continueRun: true });
  }

  nextSortie() {
    const next = Session.sortieIndex + 1;
    const score = Session.score;
    const jokes = Session.jokes.slice();
    const kills = Session.kills;
    const wreck = Session.wreckKills;
    const delivered = Session.delivered;
    resetRun(next);
    Session.score = score;
    Session.sortieStartScore = score;
    Session.jokes = jokes;
    Session.kills = kills;
    Session.wreckKills = wreck;
    Session.delivered = delivered;
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : Session.autofire;
    this.scene.start('Briefing', { sortieIndex: next });
  }

  retry() {
    if (Session.mode === 'endless') {
      resetRun(0);
      Session.mode = 'endless';
      Session.noTimer = true;
      Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : Session.autofire;
      this.scene.start('Play', { sortieIndex: 0, endless: true });
      return;
    }
    const idx = Session.sortieIndex;
    const keep = Session.sortieStartScore || 0;
    resetRun(idx);
    Session.score = keep;
    Session.sortieStartScore = keep;
    Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : Session.autofire;
    this.scene.start('Briefing', { sortieIndex: idx });
  }
}
