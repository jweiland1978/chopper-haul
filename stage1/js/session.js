import { CONFIG } from './config.js?v=1';

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
};

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
}

export function resetStoryFromStart() {
  resetRun(0);
}
