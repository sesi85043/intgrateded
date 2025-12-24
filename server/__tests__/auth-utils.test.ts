import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => {
  return {
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 'row' }]) }) }) }),
      pool: {},
    }
  };
});

import { hasNewCredentialsFor } from '../auth-utils';

describe('hasNewCredentialsFor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when there are recent credentials', async () => {
    const res = await hasNewCredentialsFor('member-1', 24);
    expect(res).toBe(true);
  });
});
