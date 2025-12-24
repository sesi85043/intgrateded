import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => {
  const mockDb = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 'row' }]) }) }) }),
  };
  return {
    db: mockDb,
    // Expose top-level `pool` as some modules import it directly
    pool: {},
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
