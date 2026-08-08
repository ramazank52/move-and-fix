import { describe, expect, it } from 'vitest';
import { rateLimiters, csrfProtection } from '../server/_core/security';

describe('CSRF Protection (Critical 4)', () => {
  it('generates and verifies CSRF tokens', () => {
    const sessionId = 'test-session-1';
    const token = csrfProtection.generateToken(sessionId);
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex

    const valid = csrfProtection.verifyToken(sessionId, token);
    expect(valid).toBe(true);
  });

  it('rejects invalid CSRF tokens', () => {
    const sessionId = 'test-session-2';
    csrfProtection.generateToken(sessionId);

    const valid = csrfProtection.verifyToken(sessionId, 'invalid-token');
    expect(valid).toBe(false);
  });

  it('rejects tokens for unknown sessions', () => {
    const valid = csrfProtection.verifyToken('unknown-session', 'any-token');
    expect(valid).toBe(false);
  });

  it('generates different tokens for different sessions', () => {
    const token1 = csrfProtection.generateToken('session-a');
    const token2 = csrfProtection.generateToken('session-b');
    expect(token1).not.toBe(token2);
  });
});

describe('Rate Limiting (Critical 5)', () => {
  it('rateLimiters are functions (middleware)', () => {
    expect(typeof rateLimiters.general).toBe('function');
    expect(typeof rateLimiters.login).toBe('function');
    expect(typeof rateLimiters.payment).toBe('function');
    expect(typeof rateLimiters.apiKey).toBe('function');
  });

  it('allows first request through', () => {
    const mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const mockRes = {
      status: () => ({ json: () => {} }),
    };
    let called = false;
    rateLimiters.general(
      mockReq as never,
      mockRes as never,
      () => { called = true; },
    );
    expect(called).toBe(true);
  });

  it('blocks after exceeding limit', () => {
    // Çok sayıda istek göndererek limiti aş
    let blocked = false;
    let statusCode = 0;
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return { json: () => { blocked = true; } };
      },
    };

    // 100 istek gönder (general limit: 100/dakika)
    for (let i = 0; i < 105; i++) {
      rateLimiters.general(
        { ip: '10.0.0.1', socket: { remoteAddress: '10.0.0.1' } } as never,
        mockRes as never,
        () => {},
      );
    }
    expect(blocked).toBe(true);
    expect(statusCode).toBe(429);
  });
});
