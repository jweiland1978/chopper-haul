import { CONFIG } from './config.js?v=1';

const DEFAULT_SETTINGS = {
  sfx: 0.85,
  scanlines: true,
  autofire: true,
};

function warn(message, error) {
  console.warn('[CHOPPAH] ' + message, error || '');
}

function unit(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };
    return {
      sfx: unit(parsed.sfx, DEFAULT_SETTINGS.sfx),
      scanlines: parsed.scanlines !== false,
      autofire: parsed.autofire !== false,
    };
  } catch (error) {
    warn('Settings could not be read.', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings) {
  try {
    localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify({
      sfx: unit(settings.sfx, DEFAULT_SETTINGS.sfx),
      scanlines: !!settings.scanlines,
      autofire: settings.autofire !== false,
    }));
    return true;
  } catch (error) {
    warn('Settings could not be written.', error);
    return false;
  }
}

function zonesFromSorties(n) {
  let z = 0;
  if (n >= 4) z = 1;
  if (n >= 8) z = 2;
  if (n >= 12) z = 3;
  if (n >= 16) z = 4;
  return z;
}

function freshProgress() {
  return { sortiesCleared: 0, zonesCleared: 0, endlessUnlocked: false };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return freshProgress();
    const n = Number(parsed.sortiesCleared);
    const cleared = Number.isFinite(n) && n > 0 ? n | 0 : 0;
    const z = Number(parsed.zonesCleared);
    const zonesCleared = Math.max(Number.isFinite(z) && z > 0 ? z | 0 : 0, zonesFromSorties(cleared));
    return {
      sortiesCleared: cleared,
      zonesCleared,
      endlessUnlocked: !!(parsed.endlessUnlocked || cleared >= 4 || zonesCleared >= 1),
    };
  } catch (error) {
    warn('Save could not be read.', error);
    return freshProgress();
  }
}

export function writeProgress(progress) {
  try {
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
      version: CONFIG.SAVE_VERSION,
      sortiesCleared: (progress && progress.sortiesCleared) | 0,
      zonesCleared: (progress && progress.zonesCleared) | 0,
      endlessUnlocked: !!(progress && progress.endlessUnlocked),
    }));
    return true;
  } catch (error) {
    warn('Save could not be written.', error);
    return false;
  }
}

function normalizeTable(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (let i = 0; i < list.length && out.length < 10; i += 1) {
    const row = list[i];
    if (!row || typeof row !== 'object') continue;
    const score = Number(row.score);
    if (!Number.isFinite(score)) continue;
    const name = typeof row.name === 'string' ? row.name.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() : 'AAA';
    out.push({ name: (name + 'AAA').slice(0, 3), score: Math.max(0, score | 0) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 10);
}

export function loadScores() {
  try {
    const raw = localStorage.getItem(CONFIG.SCORES_KEY);
    if (!raw) return { story: [], endless: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { story: [], endless: [] };
    return {
      story: normalizeTable(parsed.story),
      endless: normalizeTable(parsed.endless),
    };
  } catch (error) {
    warn('Scores could not be read.', error);
    return { story: [], endless: [] };
  }
}

export function writeScores(scores) {
  try {
    localStorage.setItem(CONFIG.SCORES_KEY, JSON.stringify({
      story: normalizeTable(scores.story),
      endless: normalizeTable(scores.endless),
    }));
    return true;
  } catch (error) {
    warn('Scores could not be written.', error);
    return false;
  }
}

export function qualifies(scores, mode, score) {
  const table = mode === 'endless' ? scores.endless : scores.story;
  if (table.length < 10) return score > 0;
  return score > (table[table.length - 1].score || 0);
}

export function insertScore(scores, mode, name, score) {
  const key = mode === 'endless' ? 'endless' : 'story';
  const table = scores[key].slice();
  table.push({ name: (name || 'AAA').slice(0, 3).toUpperCase(), score: score | 0 });
  table.sort((a, b) => b.score - a.score);
  scores[key] = table.slice(0, 10);
  writeScores(scores);
  return scores;
}

export const Save = {
  settings: loadSettings(),
  progress: loadProgress(),
  scores: loadScores(),
  dirtyProgress: false,
  dirtyScores: false,

  boot() {
    this.settings = loadSettings();
    this.progress = loadProgress();
    this.scores = loadScores();
  },

  persistSettings() {
    writeSettings(this.settings);
  },

  markProgress(sortiesCleared) {
    const n = Math.max(this.progress.sortiesCleared | 0, sortiesCleared | 0);
    this.progress.sortiesCleared = n;
    this.dirtyProgress = true;
    writeProgress(this.progress);
  },

  persistAll() {
    if (this.dirtyProgress) writeProgress(this.progress);
    // Settings are written the moment they change (persistSettings), so a page hide on the title writes nothing.
    if (this.dirtyScores) writeScores(this.scores);
  },
};
