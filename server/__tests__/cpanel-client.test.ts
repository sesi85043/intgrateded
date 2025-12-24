import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CpanelClient } from '../cpanel-client';

describe('CpanelClient', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normalizes hostname and calls the correct endpoint when creating an email account', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ metadata: { result: 1 } }),
    };

    const fetchMock = vi.fn().mockResolvedValue(mockResponse as any);
    globalThis.fetch = fetchMock as any;

    const client = new CpanelClient({ hostname: 'https://example.com:2083/', apiToken: 'token', cpanelUsername: 'cpuser' });

    const res = await client.createEmailAccount({ email: 'foo@example.com', password: 'P@ssword1', firstName: 'Foo', lastName: 'Bar' });

    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://example.com:2087/execute/Email/addpop')).toBe(true);

    const calledOpts = fetchMock.mock.calls[0][1];
    expect(calledOpts.headers.Authorization).toContain('cpanel cpuser:token');
  });

  it('returns a useful error on non-JSON HTML responses', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      headers: { get: () => 'text/html' },
      text: async () => '<html>Unauthorized</html>',
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse as any) as any;

    const client = new CpanelClient({ hostname: 'example.com', apiToken: 'token', cpanelUsername: 'cpuser' });

    const res = await client.createEmailAccount({ email: 'foo@example.com', password: 'P@ssword1', firstName: 'Foo', lastName: 'Bar' });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Non-JSON response from cPanel/);
  });
});
