import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the db module before importing provisioning so the module uses the mocked db
vi.mock('../db', () => {
  const mockConfig = {
    hostname: 'example.com',
    apiToken: 'token',
    cpanelUsername: 'cpuser',
    domain: 'example.com',
    enabled: true,
  };
  const mockDb = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([mockConfig]) }) }) }),
    insert: () => ({ values: () => { throw new Error('DB Insert Failure'); } }),
    pool: {},
  };
  return { db: mockDb };
});

import { createCpanelEmailAccount } from '../provisioning';
import { CpanelClient } from '../cpanel-client';

describe('createCpanelEmailAccount compensation behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes the cPanel account if DB insert fails', async () => {
    const createMock = vi.spyOn(CpanelClient.prototype, 'createEmailAccount').mockResolvedValue({ success: true, email: 'john.doe@example.com' } as any);
    const deleteMock = vi.spyOn(CpanelClient.prototype, 'deleteEmailAccount').mockResolvedValue({ success: true } as any);

    await expect(createCpanelEmailAccount('John', 'Doe', 'sales', 'team-1')).rejects.toThrow(/Failed to save email account to database/);

    expect(createMock).toHaveBeenCalled();
    // The actual email to delete is the generated username + domain
    expect(deleteMock).toHaveBeenCalledWith('doe.john_sales@example.com');
  });
});
