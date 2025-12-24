import { describe, it, expect } from 'vitest';
import { sanitizeHostname } from '../cpanel-client';

describe('sanitizeHostname', () => {
  it('strips protocol, port, and paths', () => {
    expect(sanitizeHostname('https://example.com:2083/')).toBe('example.com');
    expect(sanitizeHostname('http://example.com/some/path')).toBe('example.com');
    expect(sanitizeHostname('example.com:2083')).toBe('example.com');
    expect(sanitizeHostname('example.com')).toBe('example.com');
  });
});
