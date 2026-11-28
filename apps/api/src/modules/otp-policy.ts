// Per-recipient delivery cooldown supplements the HTTP IP-based request limits.
// Store only short-lived normalized recipient keys and fail closed at capacity.
type OtpCooldown = ((email: string, now?: number) => boolean) & {
  release(email: string): boolean;
};

export function createOtpCooldown(windowMs = 30_000, capacity = 10_000) {
  const nextAllowed = new Map<string, number>();
  const tryAcquire: OtpCooldown = function (email: string, now = Date.now()) {
    const key = email.trim().toLowerCase();
    const next = nextAllowed.get(key) ?? 0;
    if (next > now) return false;
    if (nextAllowed.size >= capacity) {
      for (const [recipient, expiry] of nextAllowed) {
        if (expiry <= now) nextAllowed.delete(recipient);
      }
      if (nextAllowed.size >= capacity) return false;
    }
    nextAllowed.set(key, now + windowMs);
    return true;
  };
  tryAcquire.release = (email: string) => nextAllowed.delete(email.trim().toLowerCase());
  return tryAcquire;
}
