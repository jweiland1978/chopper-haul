export const QaEvents = [];

export function qaOn() {
  return !!globalThis.__QA_ON;
}

export function qaLog(type, extra) {
  if (!globalThis.__QA_ON) return;
  const row = { t: performance.now(), type };
  if (extra) {
    const keys = Object.keys(extra);
    for (let i = 0; i < keys.length; i += 1) row[keys[i]] = extra[keys[i]];
  }
  QaEvents.push(row);
}

export function qaClear() {
  QaEvents.length = 0;
}
