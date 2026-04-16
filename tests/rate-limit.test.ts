import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows under the limit and blocks over it', () => {
    const key = `t:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 10_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 3, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window', async () => {
    const key = `t:${Math.random()}`;
    rateLimit(key, 1, 50);
    expect(rateLimit(key, 1, 50).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(rateLimit(key, 1, 50).allowed).toBe(true);
  });
});
