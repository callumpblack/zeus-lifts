// Username + PIN auth helpers.
//
// Login stays on Supabase Auth (so RLS / auth.uid() keeps working), but the
// UI is username + 6-digit PIN. Each username maps deterministically to a
// synthetic email `<username>@zeuslifts.app`; the PIN is the account password.
// No real emails are ever sent (email confirmation must be OFF in Supabase).

export const AUTH_EMAIL_DOMAIN = "zeuslifts.app";

/** Lowercase + strip to a safe handle so it forms a valid email local-part. */
export function cleanUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

/** Deterministic synthetic email used as the Supabase login identifier. */
export function usernameToEmail(username: string): string {
  return `${cleanUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function isValidUsername(username: string): boolean {
  return cleanUsername(username).length >= 2;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

// During sign-up we create the user, save their profile, and (for Zeus) seed
// routines in one go. This flag lets AuthGate ignore the intermediate auth
// events so it doesn't briefly flash the persona picker mid-sign-up.
let _signingUp = false;
export function setSigningUp(v: boolean): void {
  _signingUp = v;
}
export function isSigningUp(): boolean {
  return _signingUp;
}
