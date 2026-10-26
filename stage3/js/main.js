import Phaser from './phaser.js?v=2';
import { CONFIG } from './config.js?v=2';
import { Save } from './save.js?v=2';
import { Audio } from './audio.js?v=2';
import { installQA } from './qa.js?v=2';
import { BootScene } from './scenes/boot.js?v=2';
import { OverlayScene } from './scenes/overlay.js?v=2';
import { TitleScene } from './scenes/title.js?v=2';
import { MapScene } from './scenes/map.js?v=2';
import { BriefingScene } from './scenes/briefing.js?v=2';
import { PlayScene } from './scenes/play.js?v=2';
import { EndingScene } from './scenes/ending.js?v=2';
import { EndCardScene } from './scenes/endcard.js?v=2';
import { ScoresScene } from './scenes/scores.js?v=2';
import { CreditsScene } from './scenes/credits.js?v=2';
import { ShopScene } from './scenes/shop.js?v=2';
import { AlbumScene } from './scenes/album.js?v=2';
import { AwardsScene } from './scenes/awards.js?v=2';
import { SettingsScene } from './scenes/settings.js?v=2';
import { isTouchDevice } from './systems/input.js?v=2';
import { Session } from './session.js?v=2';
import { readLayout } from './ui.js?v=2';

Save.boot();
Audio.applySettings();
Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;

const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('gesturestart', (e) => e.preventDefault());

const portrait = window.matchMedia ? window.matchMedia('(orientation: portrait) and (max-width: 900px)') : null;
let onPortrait = () => {};
let onLayout = () => {};
const syncHidden = () => {
  const hidden = document.hidden || !!portrait?.matches;
  Audio.setHidden(hidden);
  if (hidden) Save.persistAll();
  onPortrait();
  onLayout();
};
document.addEventListener('visibilitychange', syncHidden);
window.addEventListener('pagehide', () => {
  Audio.setHidden(true);
  Save.persistAll();
});
window.addEventListener('pageshow', syncHidden);
portrait?.addEventListener?.('change', syncHidden);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: '#081018',
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  fps: { target: 60 },
  audio: { disableWebAudio: true },
  input: {
    activePointers: 4,
  },
  scene: [
    BootScene,
    OverlayScene,
    TitleScene,
    MapScene,
    BriefingScene,
    PlayScene,
    EndingScene,
    EndCardScene,
    ScoresScene,
    CreditsScene,
    ShopScene,
    AlbumScene,
    AwardsScene,
    SettingsScene,
  ],
});

globalThis.__CHOPPAH_GAME = game;
installQA();

let appliedPhone = false;
let layingOut = false;
onPortrait = () => {
  const show = !!portrait?.matches;
  let ps = null;
  try {
    if (game.scene && game.scene.isActive('Play')) ps = game.scene.getScene('Play');
  } catch (err) { ps = null; }
  if (ps && ps.holdForRotate) ps.holdForRotate(show);
};
onLayout = () => {
  if (layingOut || !game) return;
  const info = readLayout(game);
  const flipped = info.phone !== appliedPhone;
  appliedPhone = info.phone;
  if (!flipped) return;
  layingOut = true;
  try {
    const scenes = game.scene.getScenes(true) || [];
    for (let i = 0; i < scenes.length; i += 1) {
      const sc = scenes[i];
      const key = sc && sc.sys && sc.sys.settings ? sc.sys.settings.key : '';
      if (!key || key === 'Overlay' || key === 'Play' || key === 'Boot') continue;
      const raw = sc.sys.settings.data;
      const data = raw && typeof raw === 'object' ? { ...raw } : raw;
      try { sc.scene.restart(data); } catch (err) { /* scene already stopping */ }
    }
  } finally {
    layingOut = false;
  }
};
game.scale.on('resize', () => onLayout());
window.addEventListener('resize', () => onLayout());
window.addEventListener('orientationchange', () => { onPortrait(); onLayout(); });
game.events.once('ready', () => onLayout());
