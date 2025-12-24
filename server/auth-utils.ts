import { db } from './db';
import { emailAccounts } from '@shared/schema';
import { eq, gte } from 'drizzle-orm';

/**
 * Check whether a team member has newly created email credentials within the threshold window.
 */
export async function hasNewCredentialsFor(teamMemberId: string, hoursWindow = Number(process.env.NEW_CREDENTIAL_HOURS) || 24): Promise<boolean> {
  const threshold = new Date(Date.now() - hoursWindow * 3600 * 1000);

  const results = await db.select().from(emailAccounts)
    .where(eq(emailAccounts.teamMemberId, teamMemberId), gte(emailAccounts.createdAt, threshold)).limit(1);

  return results && results.length > 0;
}

export default { hasNewCredentialsFor };
