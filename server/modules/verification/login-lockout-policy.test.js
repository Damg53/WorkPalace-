import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLoginFailureState,
  getNextLoginLockout,
  INITIAL_LOGIN_ATTEMPT_LIMIT,
  INITIAL_LOGIN_LOCKOUT_MINUTES,
  MAX_LOGIN_LOCKOUT_MINUTES,
  normalizeLoginAttemptState,
} from './login-lockout-policy.js';

test('database lockout fields are normalized before updating counters', () => {
  const state = normalizeLoginAttemptState({
    failed_attempts: 2,
    attempt_limit: 8,
    lockout_minutes: 15,
    locked_until: null,
    is_locked: null,
  });

  assert.deepEqual(getLoginFailureState(state), {
    failedAttempts: 3,
    lockedForMinutes: null,
  });
});

test('login lockout starts with eight failures and a 15-minute wait', () => {
  let state = {
    failedAttempts: 0,
    attemptLimit: INITIAL_LOGIN_ATTEMPT_LIMIT,
    lockoutMinutes: INITIAL_LOGIN_LOCKOUT_MINUTES,
  };

  for (let attempt = 1; attempt < 8; attempt += 1) {
    state = { ...state, ...getLoginFailureState(state) };
    assert.equal(state.lockedForMinutes, null);
  }
  assert.deepEqual(getLoginFailureState(state), { failedAttempts: 8, lockedForMinutes: 15 });
});

test('remaining attempts drop to three and then one as lockouts escalate', () => {
  assert.deepEqual(getNextLoginLockout(8, 15), { attemptLimit: 3, lockoutMinutes: 30 });
  assert.deepEqual(getNextLoginLockout(3, 30), { attemptLimit: 1, lockoutMinutes: 60 });
  assert.deepEqual(getLoginFailureState({ failedAttempts: 0, attemptLimit: 1, lockoutMinutes: 60 }), {
    failedAttempts: 1,
    lockedForMinutes: 60,
  });
});

test('lockout duration doubles but never exceeds 24 hours', () => {
  assert.deepEqual(getNextLoginLockout(1, 60), { attemptLimit: 1, lockoutMinutes: 120 });
  assert.deepEqual(getNextLoginLockout(1, MAX_LOGIN_LOCKOUT_MINUTES), {
    attemptLimit: 1,
    lockoutMinutes: MAX_LOGIN_LOCKOUT_MINUTES,
  });
});
