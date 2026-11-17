import { pool } from '../db';

export type DependencyStatus = 'ok' | 'unavailable';

// A bounded probe prevents a stalled database from hanging a request. The
// health endpoint and the Security Center share the same implementation.
export function checkDatabase(timeoutMs = 3000): Promise<DependencyStatus> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (status: DependencyStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(status);
    };

    const timer = setTimeout(() => finish('unavailable'), timeoutMs);
    pool
      .query('SELECT 1')
      .then(() => finish('ok'))
      .catch(() => finish('unavailable'));
  });
}
