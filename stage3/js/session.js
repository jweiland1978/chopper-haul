import { CONFIG, TUNING } from './config.js?v=2';
import { Save } from './save.js?v=2';

export const Session = {
  mode: 'story',
  sortieIndex: 0,
  score: 0,
  combo: 0,
  comboMax: 0,
  comboT: 0,
  armor: CONFIG.ARMOR,
  gunLevel: 1,
  rockets: CONFIG.ROCKETS_START,
  kills: 0,
  wreckKills: 0,
  delivered: 0,
  lastJoke: '',
  jokes: [],
  rank: null,
  paused: false,
  autofire: false,
  godMode: false,
  noEnemies: false,
  timeScale: 1,
  seed: 1,
  skipBriefing: false,
  bot: false,
  crashed: false,
  won: false,
  zoneClear: false,
  remaining: 70,
  duration: 70,
  confirmOpen: false,
  scorePosted: false,
  sortieStartScore: 0,
  endlessTime: 0,
  endlessMinis: 0,
  armorMax: CONFIG.ARMOR,
  reelMul: 1,
  ropeMax: CONFIG.ROPE_MAX,
  swingMax: 1.15,
  shockDamp: 0,
  luckyAdd: 0,
  bucksPaid: false,
  bucksGain: 0,
  sortieDelivered: 0,
  sortieWrecks: 0,
};

export function upgradeLevel(id) {
  const spec = TUNING.upgrades && TUNING.upgrades[id];
  if (!spec) return 0;
  const bag = Save.progress && Save.progress.upgrades;
  const n = bag ? Number(bag[id]) : 0;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(spec.max | 0, n | 0);
}

export function applyLoadout() {
  const U = TUNING.upgrades;
  const armorLv = upgradeLevel('armor');
  const gunLv = upgradeLevel('gun');
  const rocketLv = upgradeLevel('rockets');
  const winchLv = upgradeLevel('winch');
  const ropeLv = upgradeLevel('rope');
  const shockLv = upgradeLevel('shocks');
  const luckyLv = upgradeLevel('lucky');
  Session.armorMax = CONFIG.ARMOR + armorLv * (U.armor.hits || 1);
  Session.armor = Session.armorMax;
  Session.gunLevel = 1 + gunLv;
  Session.rockets = CONFIG.ROCKETS_START + rocketLv * (U.rockets.per || 5);
  Session.reelMul = 1 + winchLv * (U.winch.reel || 0);
  Session.ropeMax = CONFIG.ROPE_MAX + ropeLv * (U.rope.extra || 0);
  Session.swingMax = 1.15 + ropeLv * (U.rope.swing || 0);
  Session.shockDamp = shockLv * (U.shocks.damp || 0);
  Session.luckyAdd = luckyLv * (U.lucky.rare || 0);
}

export function resetRun(sortieIndex = 0) {
  Session.mode = 'story';
  Session.sortieIndex = sortieIndex;
  Session.score = 0;
  Session.combo = 0;
  Session.comboMax = 0;
  Session.comboT = 0;
  Session.armor = CONFIG.ARMOR;
  Session.gunLevel = 1;
  Session.rockets = CONFIG.ROCKETS_START;
  Session.kills = 0;
  Session.wreckKills = 0;
  Session.delivered = 0;
  Session.lastJoke = '';
  Session.jokes = [];
  Session.rank = null;
  Session.paused = false;
  Session.crashed = false;
  Session.won = false;
  Session.zoneClear = false;
  Session.confirmOpen = false;
  Session.skipBriefing = false;
  Session.scorePosted = false;
  Session.sortieStartScore = 0;
  Session.noEnemies = false;
  Session.noTimer = false;
  Session.endlessTime = 0;
  Session.endlessMinis = 0;
  Session.promptScore = false;
  Session.bucksPaid = false;
  Session.bucksGain = 0;
  Session.sortieDelivered = 0;
  Session.sortieWrecks = 0;
  applyLoadout();
}

export function resetStoryFromStart() {
  resetRun(0);
}
