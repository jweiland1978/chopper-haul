import Phaser from '../phaser.js?v=3';
import { CONFIG, TUNING } from '../config.js?v=3';
import { Session } from '../session.js?v=3';
import { Save } from '../save.js?v=3';
import { Audio } from '../audio.js?v=3';
import { addRoundButton, addButton, addText, isPhone, phoneMinSize } from '../ui.js?v=3';

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

export class InputCtl {
  constructor(scene) {
    this.scene = scene;
    this.ax = 0;
    this.ay = 0;
    this.fireHeld = false;
    this.winchTap = false;
    this.pauseTap = false;
    this.enterTap = false;
    this.stickId = null;
    this.stickOx = 0;
    this.stickOy = 0;
    this.stickVx = 0;
    this.stickVy = 0;
    this.firePtr = null;
    this.fireDownAt = 0;
    this.fireHeldTouch = false;
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    // Latch taps from key events so a quick press between two slow frames is never lost.
    const k0 = this.keys;
    if (k0) {
      k0.k.on('down', () => { this.winchTap = true; });
      k0.shift.on('down', () => { this.winchTap = true; });
      k0.p.on('down', () => { this.pauseTap = true; });
      k0.esc.on('down', () => { this.pauseTap = true; });
      k0.enter.on('down', () => { this.enterTap = true; });
    }
    scene.input.addPointer(3);
    scene.input.addPointer(1);

    this.stickBase = scene.add.image(0, 0, 'stick-base').setScrollFactor(0).setDepth(70).setVisible(false).setAlpha(0.85);
    this.stickKnob = scene.add.image(0, 0, 'stick-knob').setScrollFactor(0).setDepth(71).setVisible(false);

    const phone = isPhone();
    const fireDia = phone ? Math.max(phoneMinSize(), CONFIG.TOUCH_FIRE_DIA) : CONFIG.TOUCH_FIRE_DIA;
    const winchDia = phone ? Math.max(phoneMinSize(), CONFIG.TOUCH_WINCH_DIA) : CONFIG.TOUCH_WINCH_DIA;
    let fireX = CONFIG.WIDTH - 88;
    let fireY = CONFIG.HEIGHT - 88;
    if (phone) {
      fireX = Math.min(fireX, CONFIG.WIDTH - 8 - fireDia / 2);
      fireY = Math.min(fireY, CONFIG.HEIGHT - 8 - fireDia / 2);
    }
    const winchY = fireY - fireDia - 18;
    this.fireBtn = addRoundButton(scene, fireX, fireY, fireDia, 'FIRE', {
      down: (ptr) => this.onFireDown(ptr),
      up: (ptr) => this.onFireUp(ptr),
      out: () => { this.fireHeldTouch = false; },
    });
    this.winchBtn = addRoundButton(scene, fireX, winchY, winchDia, 'WINCH', {
      down: () => {},
      up: () => { this.winchTap = true; Audio.unlock(); },
    });
    const pauseHit = phone ? phoneMinSize() : 0;
    const pauseW = phone ? Math.max(88, pauseHit) : 88;
    const pauseH = phone ? Math.max(48, pauseHit) : 48;
    const pauseX = phone ? CONFIG.WIDTH - 8 - pauseW / 2 : CONFIG.WIDTH - 64;
    const pauseY = phone ? 8 + pauseH / 2 : 36;
    this.pauseBtn = addButton(scene, pauseX, pauseY, 'PAUSE', () => { this.pauseTap = true; }, {
      w: 88, h: 48, fontSize: '16px', depth: 90,
    });

    this.syncFireCaption();

    scene.input.on('pointerdown', (ptr) => this.onPointerDown(ptr));
    scene.input.on('pointermove', (ptr) => this.onPointerMove(ptr));
    scene.input.on('pointerup', (ptr) => this.onPointerUp(ptr));

    this._winchEdge = false;
    this._pauseEdge = false;
    this._enterEdge = false;
  }

  syncFireCaption() {
    const on = Session.autofire;
    this.fireBtn.setCaption('FIRE', on ? 'ON' : 'OFF');
  }

  onFireDown(ptr) {
    this.fireHeldTouch = true;
    this.fireDownAt = this.scene.time.now;
    this.firePtr = ptr ? ptr.id : this.firePtr;
  }

  onFireUp(ptr) {
    const held = this.scene.time.now - this.fireDownAt;
    this.fireHeldTouch = false;
    if (held < 220 && isTouchDevice()) {
      Session.autofire = !Session.autofire;
      Save.settings.autofire = Session.autofire;
      Save.persistSettings();
      this.syncFireCaption();
    }
    this.firePtr = null;
  }

  onPointerDown(ptr) {
    Audio.unlock();
    if (Session.paused || Session.confirmOpen) return;
    if (ptr.x >= CONFIG.WIDTH * 0.5) return;
    if (this.stickId != null) return;
    if (ptr.y < 80 && ptr.x > CONFIG.WIDTH - 120) return;
    this.stickId = ptr.id;
    this.stickOx = ptr.x;
    this.stickOy = ptr.y;
    this.stickBase.setPosition(ptr.x, ptr.y).setVisible(true);
    this.stickKnob.setPosition(ptr.x, ptr.y).setVisible(true);
  }

  onPointerMove(ptr) {
    if (ptr.id !== this.stickId) return;
    const dx = ptr.x - this.stickOx;
    const dy = ptr.y - this.stickOy;
    const max = 70;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(max, len);
    this.stickVx = (dx / len) * (cl / max);
    this.stickVy = (dy / len) * (cl / max);
    this.stickKnob.setPosition(this.stickOx + (dx / len) * cl, this.stickOy + (dy / len) * cl);
  }

  onPointerUp(ptr) {
    if (ptr.id !== this.stickId) return;
    this.stickId = null;
    this.stickVx = 0;
    this.stickVy = 0;
    this.stickBase.setVisible(false);
    this.stickKnob.setVisible(false);
  }

  consumeWinch() {
    if (!this.winchTap) return false;
    this.winchTap = false;
    return true;
  }

  consumePause() {
    if (!this.pauseTap) return false;
    this.pauseTap = false;
    return true;
  }

  consumeEnter() {
    if (!this.enterTap) return false;
    this.enterTap = false;
    return true;
  }

  get firing() {
    return Session.autofire || this.fireHeld || this.fireHeldTouch;
  }

  poll() {
    const k = this.keys;
    let ax = this.stickVx;
    let ay = this.stickVy;
    if (k.left.isDown || k.a.isDown) ax -= 1;
    if (k.right.isDown || k.d.isDown) ax += 1;
    if (k.up.isDown || k.w.isDown) ay -= 1;
    if (k.down.isDown || k.s.isDown) ay += 1;
    const mag = Math.hypot(ax, ay);
    if (mag > 1) { ax /= mag; ay /= mag; }
    this.ax = ax;
    this.ay = ay;
    this.fireHeld = k.space.isDown || k.j.isDown;

  }

  hideTouch(hide) {
    const vis = !hide;
    (this.fireBtn.parts || [this.fireBtn]).forEach((p) => p.setVisible(vis));
    (this.winchBtn.parts || [this.winchBtn]).forEach((p) => p.setVisible(vis));
    (this.pauseBtn.parts || [this.pauseBtn]).forEach((p) => p.setVisible(vis));
  }
}

function collect(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    if (!n) continue;
    if (n.parts) {
      for (let j = 0; j < n.parts.length; j += 1) out.push(n.parts[j]);
    } else out.push(n);
  }
  return out;
}

function makeGroup(nodes) {
  const all = collect(nodes);
  const group = {
    visible: false,
    setVisible(v) {
      group.visible = !!v;
      for (let i = 0; i < all.length; i += 1) all[i].setVisible(!!v);
    },
  };
  group.setVisible(false);
  return group;
}

export function makePauseOverlay(scene, onResume, onQuit) {
  const phone = isPhone();
  const hit = phone ? Math.max(phoneMinSize(), 56) : 56;
  const gap = phone ? TUNING.fx.phoneGap : 0;
  const yR = phone ? 268 : 300;
  const yQ = phone ? Math.round(yR + hit + gap) : 372;
  const yS = phone ? Math.round(yQ + hit + gap) : 444;
  const panelH = phone ? Math.max(360, (yS - yR) + hit + 160) : 360;
  const panelY = phone ? Math.round((yR + yS) / 2 + 10) : 340;
  const titleY = phone ? Math.round(yR - hit / 2 - 28) : 210;
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.62).setInteractive().setScrollFactor(0).setDepth(200);
  const panel = scene.add.rectangle(640, panelY, phone ? 560 : 520, panelH, CONFIG.COLORS.ink, 0.96).setScrollFactor(0).setDepth(201);
  panel.setStrokeStyle(3, CONFIG.COLORS.orange);
  const title = addText(scene, 640, titleY, 'PAUSED', {
    fontSize: '40px', color: CONFIG.COLORS.orangeCss, originX: 0.5, originY: 0.5,
  }).setScrollFactor(0).setDepth(202);
  const resume = addButton(scene, 640, yR, 'RESUME', () => onResume(), { w: 280, h: 56, primary: true, depth: 203 });
  const quit = addButton(scene, 640, yQ, 'QUIT TO TITLE', () => onQuit(), { w: 280, h: 56, depth: 203 });
  const scan = addButton(scene, 640, yS, Save.settings.scanlines ? 'SCANLINES ON' : 'SCANLINES OFF', () => {
    Save.settings.scanlines = !Save.settings.scanlines;
    Save.persistSettings();
    scan.setLabel(Save.settings.scanlines ? 'SCANLINES ON' : 'SCANLINES OFF');
    scene.game.events.emit('scanlines');
  }, { w: 280, h: 48, fontSize: '18px', depth: 203 });
  const root = makeGroup([dim, panel, title, resume, quit, scan]);
  return { root, resume, quit, scan };
}

export function makeConfirm(scene, message, onYes, onNo) {
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setInteractive().setScrollFactor(0).setDepth(220);
  const panel = scene.add.rectangle(640, 360, 560, 280, CONFIG.COLORS.ink, 0.98).setScrollFactor(0).setDepth(221);
  panel.setStrokeStyle(3, CONFIG.COLORS.orange);
  const title = addText(scene, 640, 280, message, {
    fontSize: '22px', color: CONFIG.COLORS.text, originX: 0.5, originY: 0.5, align: 'center', wordWrap: { width: 500 },
  }).setScrollFactor(0).setDepth(222);
  const hint = addText(scene, 640, 470, 'ENTER = NO', {
    fontSize: '14px', color: CONFIG.COLORS.muted, originX: 0.5, originY: 0.5,
  }).setScrollFactor(0).setDepth(222);
  const no = addButton(scene, 520, 390, 'NO', () => onNo(), { w: 160, h: 56, primary: true, depth: 223 });
  const yes = addButton(scene, 760, 390, 'YES', () => onYes(), { w: 160, h: 56, depth: 223 });
  const root = makeGroup([dim, panel, title, hint, no, yes]);
  return { root, yes, no };
}
