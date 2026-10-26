import { TUNING } from './config.js?v=1';
import { Session } from './session.js?v=1';
import { Save } from './save.js?v=1';

export function sortieBucks(sortieScore, rank, delivered, endless, endlessTime) {
  const b = TUNING.bucks;
  const score = Math.max(0, Number(sortieScore) || 0);
  let n = Math.floor(score * b.perScore);
  n += Math.max(0, delivered | 0) * b.perCargo;
  if (endless) n += Math.floor(Math.max(0, Number(endlessTime) || 0) / 60) * b.perMinute;
  else if (rank && b.rank && b.rank[rank]) n += b.rank[rank] | 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return n | 0;
}

// Pays once per sortie. Caller writes the save.
export function grantSortieBucks() {
  if (Session.bucksPaid) return Session.bucksGain | 0;
  const endless = Session.mode === 'endless';
  const n = sortieBucks(
    Session.sortieScore | 0,
    Session.rank,
    Session.sortieDelivered | 0,
    endless,
    Session.endlessTime || 0,
  );
  const cur = Save.progress.bucks | 0;
  Save.progress.bucks = Math.max(0, Math.min(9999999, cur + n));
  Save.dirtyProgress = true;
  Session.bucksPaid = true;
  Session.bucksGain = n;
  return n;
}
