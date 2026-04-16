import { describe, it, expect } from 'vitest';
import { isSameOriginRequest } from '@/lib/origin-check';

function req(method: string, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/test', { method, headers });
}

describe('isSameOriginRequest', () => {
  it('allows GET regardless of origin', () => {
    expect(isSameOriginRequest(req('GET', { origin: 'https://evil.com' }))).toBe(true);
  });

  it('allows POST with matching host', () => {
    expect(
      isSameOriginRequest(req('POST', { origin: 'http://localhost', host: 'localhost' })),
    ).toBe(true);
  });

  it('blocks POST with foreign origin', () => {
    expect(
      isSameOriginRequest(req('POST', { origin: 'https://evil.com', host: 'localhost' })),
    ).toBe(false);
  });

  it('allows POST with no origin/referer (non-browser client)', () => {
    expect(isSameOriginRequest(req('POST', { host: 'localhost' }))).toBe(true);
  });
});
