import { QA_ALLOWED } from './build.js?v=1';
import { rng } from './rng.js?v=1';
import { Session, resetRun } from './session.js?v=1';
import { rankFor } from './data/zones.js?v=1';
import { listButtons } from './ui.js?v=1';
import { QaEvents, qaClear } from './qalog.js?v=1';

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

function startSortie(index, opts) {
  const i = Math.max(0, Math.min(3, index | 0));
  resetRun(i);
  Session.skipBriefing = true;
  Session.noEnemies = !!(opts && opts.noEnemies);
  Session.noTimer = !!(opts && opts.noTimer);
  const game = globalThis.__CHOPPAH_GAME;
  if (!game) return;
  const mgr = game.scene;
  ['Briefing', 'Play', 'EndCard', 'Scores', 'Credits', 'Title'].forEach((key) => {
    if (mgr.isActive(key) && key !== 'Play') mgr.stop(key);
  });
  if (mgr.isActive('Play')) mgr.stop('Play');
  mgr.start('Play', { sortieIndex: i, noEnemies: Session.noEnemies });
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
    state() {
      const w = world();
      const snap = w ? w.snapshot() : {
        carrying: null, hookOut: false, cargo: [], enemies: [], pad: { x: 0, y: 0, w: 0 }, player: { x: 0, y: 0 }, bossHp: 0,
      };
      return {
        scene: currentSceneKey(),
        sortie: Session.sortieIndex,
        score: Session.score,
        combo: Session.combo,
        comboMax: Session.comboMax,
        armor: Session.armor,
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
    killAllEnemies() { world()?.killAllEnemies(); },
    hurtPlayer() { world()?.hurtPlayer(true); },
    giveRockets(n) { Session.rockets = n | 0; },
    setGun(level) { Session.gunLevel = Math.max(1, Math.min(4, level | 0)); },
    forceBoss() {
      const w = world();
      if (w && !w.boss) w.spawnBoss();
      else startSortie(3, {});
    },
    setBossHp(n) { world()?.setBossHp(n); },
    finishSortie() { world()?.endSortie(); play()?.finish?.(); },
    godMode(bool) { Session.godMode = !!bool; },
    timeScale(n) { Session.timeScale = Math.max(0, Number(n) || 0); },
    rankFor(sortieIndex, score) { return rankFor(sortieIndex, score); },
    buttons() { return listButtons(); },
    bot(on) {
      Session.bot = !!on;
      const p = play();
      if (p && p.bot) p.bot.set(!!on);
    },
  };
}
