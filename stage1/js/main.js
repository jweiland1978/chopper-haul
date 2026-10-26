import Phaser from './phaser.js?v=1';
import { CONFIG } from './config.js?v=1';
import { Save } from './save.js?v=1';
import { Audio } from './audio.js?v=1';
import { installQA } from './qa.js?v=1';
import { BootScene } from './scenes/boot.js?v=1';
import { OverlayScene } from './scenes/overlay.js?v=1';
import { TitleScene } from './scenes/title.js?v=1';
import { BriefingScene } from './scenes/briefing.js?v=1';
import { PlayScene } from './scenes/play.js?v=1';
import { EndCardScene } from './scenes/endcard.js?v=1';
import { ScoresScene } from './scenes/scores.js?v=1';
import { CreditsScene } from './scenes/credits.js?v=1';
import { isTouchDevice } from './systems/input.js?v=1';
import { Session } from './session.js?v=1';

Save.boot();
Audio.applySettings();
Session.autofire = isTouchDevice() ? Save.settings.autofire !== false : false;

const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('gesturestart', (e) => e.preventDefault());

const portrait = window.matchMedia ? window.matchMedia('(orientation: portrait) and (max-width: 900px)') : null;
const syncHidden = () => {
  const hidden = document.hidden || !!portrait?.matches;
  Audio.setHidden(hidden);
  if (hidden) Save.persistAll();
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
    BriefingScene,
    PlayScene,
    EndCardScene,
    ScoresScene,
    CreditsScene,
  ],
});

globalThis.__CHOPPAH_GAME = game;
installQA();
