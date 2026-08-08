export const AUTHORIZATION_ACTIONS = {
  ORDER_VOID: 'order.void',
};

// How long a verified one-time grant remains usable before it must be re-verified.
export const GRANT_TTL_MS = 5 * 60 * 1000;

// Accepted TOTP clock-drift window, in +/- 30s steps either side of the current step.
export const TOTP_WINDOW_STEPS = 1;

// Brute-force protection for POST /totp/verify, keyed by the authorizing admin.
export const MAX_VERIFY_ATTEMPTS = 5;
export const VERIFY_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
