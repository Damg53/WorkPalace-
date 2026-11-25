export const INITIAL_LOGIN_ATTEMPT_LIMIT = 8;
export const INITIAL_LOGIN_LOCKOUT_MINUTES = 15;
export const MAX_LOGIN_LOCKOUT_MINUTES = 24 * 60;

export function normalizeLoginAttemptState(row) {
  return {
    failedAttempts: Number(row.failed_attempts),
    attemptLimit: Number(row.attempt_limit),
    lockoutMinutes: Number(row.lockout_minutes),
    lockedUntil: row.locked_until,
    isLocked: row.is_locked,
  };
}

export function getNextLoginLockout(attemptLimit, lockoutMinutes) {
  return {
    attemptLimit: attemptLimit > 3 ? 3 : 1,
    lockoutMinutes: Math.min(lockoutMinutes * 2, MAX_LOGIN_LOCKOUT_MINUTES),
  };
}

export function getLoginFailureState({ failedAttempts, attemptLimit, lockoutMinutes }) {
  const nextFailedAttempts = failedAttempts + 1;
  const isLocked = nextFailedAttempts >= attemptLimit;
  return {
    failedAttempts: nextFailedAttempts,
    lockedForMinutes: isLocked ? lockoutMinutes : null,
  };
}
