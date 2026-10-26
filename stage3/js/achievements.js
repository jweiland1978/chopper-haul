import { TUNING } from './config.js?v=3';
import { Session } from './session.js?v=3';
import { Save, writeProgress } from './save.js?v=3';
import { CARGO } from './data/cargo.js?v=3';
import { ACHIEVEMENTS } from './data/achievements.js?v=3';
import { qaLog } from './qalog.js?v=3';
import { showToast } from './toast.js?v=3';

const BY_ID = {};
for (let i = 0; i < ACHIEVEMENTS.length; i += 1) BY_ID[ACHIEVEMENTS[i].id] = ACHIEVEMENTS[i];

export function unlock(id) {
  const row = BY_ID[id];
  if (!row) return false;
  if (!Array.isArray(Save.progress.achievements)) Save.progress.achievements = [];
  if (Save.progress.achievements.indexOf(id) >= 0) return false;
  Save.progress.achievements.push(id);
  Save.dirtyProgress = true;
  writeProgress(Save.progress);
  qaLog('achievement', { id });
  showToast(row.name, row.desc);
  return true;
}

export function onDeliver(c) {
  if (!c || !c.def) return;
  const id = c.id || c.def.id;
  if (!id || !CARGO[id]) return;
  if (!Save.progress.album || typeof Save.progress.album !== 'object' || Array.isArray(Save.progress.album)) {
    Save.progress.album = {};
  }
  Save.progress.album[id] = Math.min(9999, (Save.progress.album[id] | 0) + 1);
  Save.dirtyProgress = true;
  if (id === 'doug' && c.def.grip) unlock('doug');
  if (id === 'brenda' && (Save.progress.album.brenda | 0) >= TUNING.achievements.brenda) unlock('mooving');
  if (id === 'hottub' && (Number(c.water) || 0) >= TUNING.achievements.tubWater) unlock('hottub');
  if (id === 'potty') unlock('potty');
  if (id === 'cake') {
    const maxT = c.def.maxTiers || TUNING.cargo.cakeTiers;
    if ((c.tiers | 0) >= maxT) unlock('cake');
  }
}

export function onFridge() {
  unlock('fridge');
}

export function noteWreck() {
  if ((Session.sortieWrecks | 0) >= TUNING.achievements.wrecks) unlock('wrecking');
}

export function onBoss(id, mini) {
  if (mini) return;
  if (id === 'vulture') unlock('buzzard');
  if (id === 'blimp') unlock('blimp');
}

export function onLongRain() {
  unlock('longrain');
}

export function onSortieEnd() {
  if (Session.rank === 'S') unlock('srank');
  if (Session.mode === 'endless' && (Session.endlessTime || 0) >= TUNING.achievements.longSec) unlock('longrain');
}

export function onMaxed(level, max) {
  if ((max | 0) > 0 && (level | 0) >= (max | 0)) unlock('maxed');
}
