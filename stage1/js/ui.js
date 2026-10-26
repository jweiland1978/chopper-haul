import { CONFIG } from './config.js?v=1';
import { Audio } from './audio.js?v=1';

const BUTTONS = [];

function isShown(obj) {
  let o = obj;
  while (o) {
    if (!o.visible || (typeof o.alpha === 'number' && o.alpha < 0.05)) return false;
    o = o.parentContainer || null;
  }
  return true;
}

export function clearButtons(scene) {
  for (let i = BUTTONS.length - 1; i >= 0; i -= 1) {
    const b = BUTTONS[i];
    if (!b.obj || !b.obj.active || b.scene === scene) BUTTONS.splice(i, 1);
  }
}

export function listButtons() {
  const out = [];
  for (let i = 0; i < BUTTONS.length; i += 1) {
    const b = BUTTONS[i];
    if (!b.obj || !b.obj.active || !isShown(b.obj)) continue;
    if (b.scene && b.scene.sys && !b.scene.sys.isActive()) continue;
    out.push({
      label: b.label,
      x: b.obj.x - b.w / 2,
      y: b.obj.y - b.h / 2,
      w: b.w,
      h: b.h,
    });
  }
  return out;
}

export function registerButton(scene, obj, label, w, h) {
  const rec = { scene, obj, label, w, h };
  BUTTONS.push(rec);
  obj.once('destroy', () => {
    const i = BUTTONS.indexOf(rec);
    if (i >= 0) BUTTONS.splice(i, 1);
  });
  return rec;
}

export function addText(scene, x, y, content, style = {}) {
  const originX = style.originX ?? 0;
  const originY = style.originY ?? 0;
  const rest = { ...style };
  delete rest.originX;
  delete rest.originY;
  const text = scene.add.text(x, y, content, {
    fontFamily: CONFIG.FONTS.pixel,
    fontSize: '18px',
    color: CONFIG.COLORS.text,
    ...rest,
  });
  text.setOrigin(originX, originY);
  return text;
}

/**
 * Full-rect tappable button. Interactive object is a Rectangle (non-container)
 * so every corner of the drawn box is hittable. Hit area is (0,0,w,h) on the rect.
 */
export function addButton(scene, x, y, label, onClick, opts = {}) {
  const w = Math.max(48, opts.w || 260);
  const h = Math.max(48, opts.h || 56);
  const primary = !!opts.primary;
  const depth = opts.depth ?? 50;
  const fill = primary ? CONFIG.COLORS.orange : CONFIG.COLORS.panel;
  const rect = scene.add.rectangle(x, y, w, h, fill, 0.96).setDepth(depth);
  rect.setStrokeStyle(3, primary ? 0x7a3a08 : CONFIG.COLORS.orange);
  rect.setInteractive();
  const text = addText(scene, x, y, label, {
    fontSize: opts.fontSize || '22px',
    color: primary ? '#1a1008' : CONFIG.COLORS.text,
    originX: 0.5,
    originY: 0.5,
  }).setDepth(depth + 1);
  rect.on('pointerover', () => rect.setFillStyle(primary ? 0xffd060 : 0x1c2a3c, 0.96));
  rect.on('pointerout', () => rect.setFillStyle(fill, 0.96));
  rect.on('pointerdown', (ptr) => {
    if (ptr) ptr.event?.preventDefault?.();
    Audio.unlock();
    Audio.play('click');
  });
  rect.on('pointerup', (ptr) => {
    if (ptr) ptr.event?.preventDefault?.();
    onClick();
  });
  rect.setScrollFactor(0);
  text.setScrollFactor(0);
  const rec = registerButton(scene, rect, label, w, h);
  rect.setLabel = (v) => {
    text.setText(v);
    rec.label = v;
  };
  rect._label = text;
  rect.parts = [rect, text];
  return rect;
}

export function addRoundButton(scene, x, y, dia, label, handlers, opts = {}) {
  const d = Math.max(48, dia);
  const depth = opts.depth ?? 80;
  const img = scene.add.image(x, y, 'btn-round').setDisplaySize(d, d).setDepth(depth).setScrollFactor(0);
  const text = addText(scene, x, y - 6, label, {
    fontSize: opts.fontSize || '20px',
    color: '#1a1008',
    originX: 0.5,
    originY: 0.5,
    align: 'center',
  }).setDepth(depth + 1).setScrollFactor(0);
  const sub = addText(scene, x, y + 18, '', {
    fontSize: '12px',
    color: '#3a2010',
    originX: 0.5,
    originY: 0.5,
  }).setDepth(depth + 1).setScrollFactor(0);
  const hit = scene.add.rectangle(x, y, d, d, 0x000000, 0.001).setDepth(depth + 2).setScrollFactor(0);
  hit.setInteractive();
  hit.on('pointerdown', (ptr) => {
    if (ptr) ptr.event?.preventDefault?.();
    Audio.unlock();
    img.setScale((d / img.width) * 0.96);
    handlers.down?.(ptr);
  });
  hit.on('pointerup', (ptr) => {
    img.setDisplaySize(d, d);
    handlers.up?.(ptr);
  });
  hit.on('pointerout', () => {
    img.setDisplaySize(d, d);
    handlers.out?.(null);
  });
  const rec = registerButton(scene, hit, label, d, d);
  hit.setCaption = (main, extra) => {
    text.setText(main);
    sub.setText(extra || '');
    rec.label = extra ? `${main} ${extra}` : main;
  };
  hit._img = img;
  hit._label = text;
  hit._sub = sub;
  hit.parts = [img, text, sub, hit];
  return hit;
}

export function runTypewriter(scene, textObj, full, onDone) {
  let index = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    event.remove(false);
    textObj.setText(full);
    onDone();
  };
  // Wall-clock pacing: exactly TYPE_MS per character even when frames are slow.
  const start = performance.now();
  const event = scene.time.addEvent({
    delay: 10,
    loop: true,
    callback: () => {
      const want = Math.min(full.length, Math.floor((performance.now() - start) / CONFIG.TYPE_MS));
      if (want !== index) {
        index = want;
        textObj.setText(full.slice(0, index));
      }
      if (index >= full.length) finish();
    },
  });
  return { skip: finish, cancel: () => event.remove(false) };
}

export function addPanel(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(CONFIG.COLORS.ink, 0.88);
  g.fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(3, CONFIG.COLORS.orange, 1);
  g.strokeRect(x - w / 2, y - h / 2, w, h);
  g.setScrollFactor(0);
  return g;
}

export function pinOverlay(scene) {
  if (scene.scene.isActive('Overlay')) scene.scene.bringToTop('Overlay');
}
