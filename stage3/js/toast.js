let shown = 0;
const pending = [];

export function toastsShown() {
  return shown;
}

export function noteToast() {
  shown += 1;
}

function overlayScene() {
  const game = globalThis.__CHOPPAH_GAME;
  if (!game || !game.scene) return null;
  try {
    const overlay = game.scene.getScene('Overlay');
    if (overlay && overlay.sys && overlay.sys.isActive() && typeof overlay.enqueueToast === 'function') return overlay;
  } catch (e) { /* scene manager not ready */ }
  return null;
}

export function showToast(title, sub) {
  const overlay = overlayScene();
  if (overlay) {
    overlay.enqueueToast(title, sub || '');
    return;
  }
  pending.push({ title: title || '', sub: sub || '' });
}

export function drainToasts(overlay) {
  if (!overlay || typeof overlay.enqueueToast !== 'function') return;
  while (pending.length) {
    const row = pending.shift();
    overlay.enqueueToast(row.title, row.sub);
  }
}
