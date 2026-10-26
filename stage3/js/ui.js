import { CONFIG, TUNING } from './config.js?v=3';
import { Audio } from './audio.js?v=3';

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

export function readLayout(game) {
  const g = game || globalThis.__CHOPPAH_GAME;
  let scale = 0;
  if (g) {
    try {
      const ds = g.scale && g.scale.displaySize;
      const gw = (g.scale && g.scale.gameSize && g.scale.gameSize.width) || CONFIG.WIDTH;
      const gh = (g.scale && g.scale.gameSize && g.scale.gameSize.height) || CONFIG.HEIGHT;
      if (ds && ds.width > 0 && ds.height > 0 && gw > 0 && gh > 0) {
        scale = Math.min(ds.width / gw, ds.height / gh);
      }
    } catch (err) { scale = 0; }
    if (!(scale > 0) && g.canvas && g.canvas.clientWidth > 0 && g.canvas.clientHeight > 0) {
      scale = Math.min(g.canvas.clientWidth / CONFIG.WIDTH, g.canvas.clientHeight / CONFIG.HEIGHT);
    }
  }
  let coarse = false;
  try {
    coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  } catch (err) { coarse = false; }
  const known = scale > 0;
  const cssScale = known ? scale : 1;
  const phone = !!(known && coarse && cssScale < TUNING.fx.phoneMaxScale);
  return { phone, cssScale };
}

export function layoutInfo() {
  return readLayout(globalThis.__CHOPPAH_GAME);
}

export function isPhone() {
  return layoutInfo().phone;
}

export function phoneMinSize() {
  const info = layoutInfo();
  if (!info.phone) return 48;
  const scale = info.cssScale > 0 ? info.cssScale : 1;
  return Math.max(TUNING.fx.phoneHitGame, Math.ceil(TUNING.fx.phoneHitCss / scale));
}

function phoneFont(size) {
  const raw = size || '18px';
  if (!isPhone()) return raw;
  const n = parseFloat(raw);
  if (Number.isFinite(n) && n < TUNING.fx.phoneBody) return TUNING.fx.phoneBody + 'px';
  return raw;
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
  rest.fontSize = phoneFont(rest.fontSize || '18px');
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
  const phone = isPhone();
  const min = phone ? phoneMinSize() : 48;
  const w = Math.max(min, opts.w || 260);
  const h = Math.max(min, opts.h || 56);
  const primary = !!opts.primary;
  const dim = !!opts.dim;
  const depth = opts.depth ?? 50;
  const fill = dim ? 0x242830 : (primary ? CONFIG.COLORS.orange : CONFIG.COLORS.panel);
  const rect = scene.add.rectangle(x, y, w, h, fill, dim ? 0.8 : 0.96).setDepth(depth);
  rect.setStrokeStyle(3, dim ? 0x5a6270 : (primary ? 0x7a3a08 : CONFIG.COLORS.orange));
  rect.setInteractive();
  const textStyle = {
    fontSize: opts.fontSize || '22px',
    color: dim ? '#8a9098' : (primary ? '#1a1008' : CONFIG.COLORS.text),
    originX: 0.5,
    originY: 0.5,
  };
  if (phone) {
    textStyle.align = 'center';
    textStyle.wordWrap = { width: Math.max(32, w - 24) };
  }
  const text = addText(scene, x, y, label, textStyle).setDepth(depth + 1);
  if (!dim) {
    rect.on('pointerover', () => rect.setFillStyle(primary ? 0xffd060 : 0x1c2a3c, 0.96));
    rect.on('pointerout', () => rect.setFillStyle(fill, 0.96));
  }
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
  const phone = isPhone();
  const d = Math.max(phone ? phoneMinSize() : 48, dia);
  const depth = opts.depth ?? 80;
  const img = scene.add.image(x, y, 'btn-round').setDisplaySize(d, d).setDepth(depth).setScrollFactor(0);
  const text = addText(scene, x, phone ? y - 12 : y - 6, label, {
    fontSize: opts.fontSize || '20px',
    color: '#1a1008',
    originX: 0.5,
    originY: 0.5,
    align: 'center',
  }).setDepth(depth + 1).setScrollFactor(0);
  const sub = addText(scene, x, phone ? y + 16 : y + 18, '', {
    fontSize: phone ? '20px' : '12px',
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

function pointerX(ptr, fallback) {
  if (ptr && typeof ptr.worldX === 'number') return ptr.worldX;
  if (ptr && typeof ptr.x === 'number') return ptr.x;
  return fallback;
}

// Full-width slider. Tap or drag anywhere on the track. Value is 0..1.
export function addSlider(scene, x, y, label, get, set) {
  const w = 640;
  const h = isPhone() ? Math.max(phoneMinSize(), 64) : 64;
  const depth = 50;
  const track = scene.add.rectangle(x, y, w, h, CONFIG.COLORS.panel, 0.96).setDepth(depth).setScrollFactor(0);
  track.setStrokeStyle(3, CONFIG.COLORS.orange);
  const fill = scene.add.rectangle(x - w / 2 + 8, y, 8, h - 18, CONFIG.COLORS.orange, 1)
    .setOrigin(0, 0.5).setDepth(depth + 1).setScrollFactor(0);
  const knob = scene.add.rectangle(x, y, 10, h - 10, CONFIG.COLORS.yellow, 1).setDepth(depth + 2).setScrollFactor(0);
  const text = addText(scene, x, y, label, {
    fontSize: '18px', color: CONFIG.COLORS.text, originX: 0.5, originY: 0.5,
  }).setDepth(depth + 3).setScrollFactor(0);
  const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0.001).setDepth(depth + 4).setScrollFactor(0);
  hit.setInteractive();
  registerButton(scene, hit, label, w, h);
  const paint = () => {
    let v = Number(get());
    if (!Number.isFinite(v)) v = 0;
    v = Math.min(1, Math.max(0, v));
    fill.width = Math.max(4, (w - 16) * v);
    knob.x = (x - w / 2) + v * w;
    text.setText(label + '  ' + Math.round(v * 100));
  };
  const applyAt = (px) => {
    let t = (px - (x - w / 2)) / w;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    set(Math.round(t * 100) / 100);
    paint();
  };
  hit.on('pointerdown', (ptr) => {
    if (ptr) ptr.event?.preventDefault?.();
    scene._slide = applyAt;
    applyAt(pointerX(ptr, x));
    Audio.unlock();
    Audio.play('click');
  });
  if (!scene._slideBound) {
    scene._slideBound = true;
    scene.input.on('pointermove', (ptr) => {
      if (!scene._slide || !ptr || !ptr.isDown) return;
      scene._slide(pointerX(ptr, x));
    });
    const end = () => { scene._slide = null; };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }
  paint();
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
