import { QA_ALLOWED } from './build.js?v=1';
import { CONFIG } from './config.js?v=1';
import { rng } from './rng.js?v=1';
import { Session, resetRun } from './session.js?v=1';
import { Save, writeProgress } from './save.js?v=1';
import { SORTIES, rankFor } from './data/zones.js?v=1';
import { listButtons, layoutInfo } from './ui.js?v=1';
import { QaEvents, qaClear } from './qalog.js?v=1';
import { Audio } from './audio.js?v=1';
import { unlock as unlockAch } from './achievements.js?v=1';
import { toastsShown } from './toast.js?v=1';
import { fxCounts } from './systems/fx.js?v=1';

export function qaEnabled() {
  if (!QA_ALLOWED) return false;
  try {
    return new URLSearchParams(globalThis.location?.search || '').get('qa') === '1';
  } catch (e) {
    return false;
  }
}

function play() {
  return globalThis.__CHOPPAH_PLAY || null;
}

function world() {
  return play()?.world || null;
}

function currentSceneKey() {
  const game = globalThis.__CHOPPAH_GAME;
  if (!game) return '';
  const names = game.scene.getScenes(true).map((s) => s.sys.settings.key);
  for (let i = 0; i < names.length; i += 1) {
    if (names[i] !== 'Overlay') return names[i];
  }
  return names[0] || '';
}

function launchPlay(data) {
  const game = globalThis.__CHOPPAH_GAME;
  if (!game) return;
  const mgr = game.scene;
  ['Briefing', 'Play', 'EndCard', 'Scores', 'Credits', 'Title', 'Map', 'Ending', 'Shop', 'Album', 'Awards', 'Settings'].forEach((key) => {
    if (mgr.isActive(key) && key !== 'Play') mgr.stop(key);
  });
  if (mgr.isActive('Play')) mgr.stop('Play');
  mgr.start('Play', data);
}

function startSortie(index, opts) {
  const i = Math.max(0, Math.min(SORTIES.length - 1, index | 0));
  resetRun(i);
  Session.skipBriefing = true;
  Session.noEnemies = !!(opts && opts.noEnemies);
  Session.noTimer = !!(opts && opts.noTimer);
  launchPlay({ sortieIndex: i, noEnemies: Session.noEnemies });
}

function bossState(w) {
  if (!w || !w.boss) return null;
  return {
    id: w.boss.id,
    hp: w.bossHp(),
    maxHp: w.boss.maxHp | 0,
    phase: w.boss.phase || 1,
  };
}

function endlessState(w) {
  if (!w || !w.endlessOn || !w.endless) return null;
  const e = w.endless;
  return {
    time: e.time,
    level: e.level,
    nextMiniBoss: e.nextMiniBoss,
    miniBosses: e.miniBosses,
  };
}

export function installQA() {
  const on = qaEnabled();
  globalThis.__QA_ON = on;
  if (!on) {
    try { delete window.HELI; } catch (e) { window.HELI = undefined; }
    return;
  }
  qaClear();
  window.HELI = {
    log: QaEvents,
    seed(n) {
      rng.seed(n | 0);
      Session.seed = n | 0;
    },
    scene() { return currentSceneKey(); },
    audio() { return Audio.status(); },
    state() {
      const w = world();
      const snap = w ? w.snapshot() : {
        carrying: null, hookOut: false, cargo: [], enemies: [], pad: { x: 0, y: 0, w: 0 }, player: { x: 0, y: 0 }, bossHp: 0,
        pickups: { bubble: 0, magnet: 0, coffee: 0, stunned: 0 },
      };
      return {
        scene: currentSceneKey(),
        sortie: Session.sortieIndex,
        score: Session.score,
        combo: Session.combo,
        comboMax: Session.comboMax,
        armor: Session.armor,
        armorMax: Session.armorMax || CONFIG.ARMOR,
        gunLevel: Session.gunLevel,
        rockets: Session.rockets,
        carrying: snap.carrying,
        hookOut: snap.hookOut,
        cargo: snap.cargo,
        enemies: snap.enemies,
        pad: snap.pad,
        player: snap.player,
        autofire: Session.autofire,
        wreckKills: Session.wreckKills,
        kills: Session.kills,
        delivered: Session.delivered,
        bossHp: snap.bossHp,
        boss: bossState(w),
        endless: endlessState(w),
        pickups: snap.pickups || { bubble: 0, magnet: 0, coffee: 0, stunned: 0 },
        rank: Session.rank,
        paused: Session.paused,
      };
    },
    start(sortieIndex, opts) { startSortie(sortieIndex, opts); },
    setPlayer(x, y) {
      const w = world();
      if (!w) return;
      w.px = x; w.py = y;
      w.playerImg.setPosition(x, y);
      w.rotor.setPosition(x, y - 28);
    },
    spawnEnemy(type, x, y) { const e = world()?.spawnEnemy(type, x, y); return e ? e.uid : null; },
    givePickup(type) { return !!world()?.givePickup(type); },
    killAllEnemies() { world()?.killAllEnemies(); },
    hurtPlayer() { world()?.hurtPlayer(true); },
    giveRockets(n) { Session.rockets = n | 0; },
    setGun(level) { Session.gunLevel = Math.max(1, Math.min(4, level | 0)); },
    forceBoss(id) {
      const w = world();
      if (id) {
        if (w) w.forceBoss(id);
        return;
      }
      if (w && !w.boss) w.spawnBoss();
      else startSortie(3, {});
    },
    setBossHp(n) { world()?.setBossHp(n); },
    startEndless(opts) {
      resetRun(0);
      Session.mode = 'endless';
      Session.noTimer = true;
      Session.skipBriefing = true;
      Session.noEnemies = !!(opts && opts.noEnemies);
      launchPlay({ sortieIndex: 0, endless: true, noEnemies: Session.noEnemies });
    },
    endlessSkip(seconds) { world()?.endlessSkip(seconds); },
    unlockEndless() {
      Save.progress.endlessUnlocked = true;
      Save.dirtyProgress = true;
      writeProgress(Save.progress);
    },
    finishSortie() { world()?.endSortie(); play()?.finish?.(); },
    godMode(bool) { Session.godMode = !!bool; },
    timeScale(n) { Session.timeScale = Math.max(0, Number(n) || 0); },
    rankFor(sortieIndex, score) { return rankFor(sortieIndex, score); },
    buttons() { return listButtons(); },
    progress() {
      const p = Save.progress || {};
      const upgrades = {};
      const srcU = (p.upgrades && typeof p.upgrades === 'object') ? p.upgrades : {};
      const uk = Object.keys(srcU);
      for (let i = 0; i < uk.length; i += 1) {
        const n = srcU[uk[i]] | 0;
        if (n > 0) upgrades[uk[i]] = n;
      }
      const album = {};
      const srcA = (p.album && typeof p.album === 'object') ? p.album : {};
      const ak = Object.keys(srcA);
      for (let i = 0; i < ak.length; i += 1) {
        const n = srcA[ak[i]] | 0;
        if (n > 0) album[ak[i]] = n;
      }
      return {
        bucks: p.bucks | 0,
        upgrades,
        achievements: Array.isArray(p.achievements) ? p.achievements.slice() : [],
        album,
      };
    },
    giveBucks(n) {
      const add = Number(n);
      if (!Number.isFinite(add)) return Save.progress.bucks | 0;
      const next = (Save.progress.bucks | 0) + (add | 0);
      Save.progress.bucks = Math.max(0, Math.min(9999999, next));
      Save.dirtyProgress = true;
      writeProgress(Save.progress);
      return Save.progress.bucks | 0;
    },
    unlock(achId) { return unlockAch(achId); },
    settings() {
      const s = Save.settings || {};
      return {
        sfx: s.sfx,
        music: s.music,
        scanlines: !!s.scanlines,
        autofire: s.autofire !== false,
        reduceFx: !!s.reduceFx,
      };
    },
    toasts() { return toastsShown(); },
    fx() { return fxCounts(); },
    layout() {
      const info = layoutInfo();
      return { phone: !!info.phone, cssScale: info.cssScale };
    },
    bot(on) {
      Session.bot = !!on;
      const p = play();
      if (p && p.bot) p.bot.set(!!on);
    },
  };
}
