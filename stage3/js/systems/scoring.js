import { CONFIG } from '../config.js?v=1';
import { Session } from '../session.js?v=1';
import { Audio } from '../audio.js?v=1';
import { qaLog } from '../qalog.js?v=1';
import { noteWreck } from '../achievements.js?v=1';
import { comboPop } from './fx.js?v=1';

export function bumpCombo(wreck) {
  const prev = Session.comboT > 0 ? (Session.combo | 0) : 0;
  if (Session.comboT > 0) {
    Session.combo = Math.min(CONFIG.COMBO_MAX, Session.combo + (wreck ? 2 : 1));
  } else {
    Session.combo = wreck ? 2 : 1;
  }
  if (Session.combo < 1) Session.combo = 1;
  if (Session.combo > Session.comboMax) Session.comboMax = Session.combo;
  Session.comboT = CONFIG.COMBO_WINDOW;
  Audio.play('combo');
  if (Session.combo > prev) comboPop(Session.combo);
}

export function resetCombo() {
  if (Session.combo > 0) qaLog('comboReset', { combo: Session.combo });
  Session.combo = 0;
  Session.comboT = 0;
}

export function tickCombo(dt) {
  if (Session.comboT > 0) {
    Session.comboT -= dt;
    if (Session.comboT <= 0) {
      Session.comboT = 0;
      Session.combo = 0;
    }
  }
}

export function addScore(n) {
  Session.score += n | 0;
  return n | 0;
}

export function awardKill(base, wreck) {
  bumpCombo(wreck);
  const pts = wreck ? base * 2 : base;
  addScore(pts);
  Session.kills += 1;
  if (wreck) {
    Session.wreckKills += 1;
    Session.sortieWrecks = (Session.sortieWrecks | 0) + 1;
    noteWreck();
  }
  qaLog('kill', { wreck: !!wreck, points: pts, combo: Session.combo });
  return pts;
}

export function awardDeliver(base, hot) {
  const pts = hot ? base * Math.max(4, Session.combo) : base;
  addScore(pts);
  Session.delivered += 1;
  Session.sortieDelivered = (Session.sortieDelivered | 0) + 1;
  qaLog('deliver', { points: pts, hot: !!hot, combo: Session.combo });
  return pts;
}
