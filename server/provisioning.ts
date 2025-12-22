import crypto from 'crypto';
import { db } from './db';
import { cpanelConfig, chatwootConfig, chatwootTeams, chatwootAgents, teamMembers, managedUsers, emailAccounts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { TeamMember, Department } from '@shared/schema';
import { CpanelClient, hashPassword, generateSecurePassword as generateCpanelPassword } from './cpanel-client';
import { ChatwootClient } from './chatwoot-client';

export function generateSecurePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  const buf = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[buf[i] % charset.length];
  }
  return password;
}

function generateUsername(firstName: string, lastName: string, departmentCode: string): string {
  const cleanLast = lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanFirst = firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanDept = (departmentCode || 'staff').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  // lastName.firstName_dept format
  return `${cleanLast}.${cleanFirst}_${cleanDept}`;
}

export async function createCpanelEmailAccount(firstName: string, lastName: string, department: string, teamMemberId: string) {
  const [config] = await db.select().from(cpanelConfig).where(eq(cpanelConfig.enabled, true)).limit(1);

  if (!config) {
    throw new Error('cPanel is not configured or enabled.');
  }

  const client = new CpanelClient({
    hostname: config.hostname,
    apiToken: config.apiToken,
    cpanelUsername: config.cpanelUsername,
  });

  const localPart = generateUsername(firstName, lastName, department);
  const email = `${localPart}@${config.domain}`;
  const password = generateCpanelPassword();

  const result = await client.createEmailAccount({
    email,
    password,
    firstName,
    lastName,
  });

  if (!result.success) {
    throw new Error(`cPanel Error: ${result.error}`);
  }

  // Save to Email Credentials / emailAccounts table
  await db.insert(emailAccounts).values({
    teamMemberId,
    email,
    passwordHash: hashPassword(password),
    provider: 'cpanel',
    status: 'active',
  });

  return { email, password };
}

async function createChatwootAgent(
  email: string,
  firstName: string,
  lastName: string,
  teamMemberId: string,
  departmentName: string,
  domain: string,
  password?: string
): Promise<{ success: boolean; agentId?: number; error?: string }> {
  const [config] = await db.select().from(chatwootConfig).where(eq(chatwootConfig.enabled, true)).limit(1);

  if (!config) {
    return { success: false, error: 'Chatwoot is not configured or enabled.' };
  }

  try {
    const client = new ChatwootClient({
      instanceUrl: config.instanceUrl,
      apiAccessToken: config.apiAccessToken,
      accountId: config.accountId,
    });

    const signature = `<b>${firstName} ${lastName}</b><br><em>${departmentName}</em><br>${domain}`;
    const agent = await client.createAgent(email, `${firstName} ${lastName}`, password, signature);
    
    await db.insert(chatwootAgents).values({
      teamMemberId,
      chatwootAgentId: agent.id,
      chatwootAgentEmail: email,
      isActive: true,
    });

    return { success: true, agentId: agent.id };
  } catch (error: any) {
    // Check if agent already exists (Chatwoot returns 422 if email is taken)
    if (error.message.includes('422')) {
      try {
        const client = new ChatwootClient({
          instanceUrl: config.instanceUrl,
          apiAccessToken: config.apiAccessToken,
          accountId: config.accountId,
        });
        const agents: any = await client.getAgents();
        const existingAgent = agents.data.find((a: any) => a.email.toLowerCase() === email.toLowerCase());
        
        if (existingAgent) {
          await db.insert(chatwootAgents).values({
            teamMemberId,
            chatwootAgentId: existingAgent.id,
            chatwootAgentEmail: email,
            isActive: true,
          });
          return { success: true, agentId: existingAgent.id };
        }
      } catch (innerErr) {
        console.error('Failed to recover existing Chatwoot agent:', innerErr);
      }
    }
    return { success: false, error: error.message };
  }
}

async function assignAgentToTeam(
  agentId: number,
  departmentId: string
): Promise<{ success: boolean; teamId?: number; error?: string }> {
  const [config] = await db.select().from(chatwootConfig).where(eq(chatwootConfig.enabled, true)).limit(1);

  if (!config) {
    return { success: false, error: 'Chatwoot is not configured.' };
  }

  const [team] = await db.select().from(chatwootTeams).where(eq(chatwootTeams.departmentId, departmentId));

  if (!team) {
    return { success: false, error: 'No Chatwoot team mapped to this department.' };
  }

  try {
    const response = await fetch(
      `${config.instanceUrl}/api/v1/accounts/${config.accountId}/teams/${team.chatwootTeamId}/team_members`,
      {
        method: 'POST',
        headers: {
          'api_access_token': config.apiAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: [agentId],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    return { success: true, teamId: team.chatwootTeamId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface ProvisionOptions {
  createMailbox?: boolean;
  createChatwootAgent?: boolean;
  assignToTeam?: boolean;
}

export interface ProvisionResult {
  username: string;
  generatedEmail?: string;
  mailcow?: {
    success: boolean;
    email?: string;
    password?: string;
    error?: string;
  };
  chatwoot?: {
    success: boolean;
    agentId?: number;
    teamId?: number;
    error?: string;
  };
}

export async function provisionTeamMember(
  member: TeamMember,
  department: Department,
  options: ProvisionOptions = {}
): Promise<ProvisionResult> {
  const { createMailbox = true, createChatwootAgent: createAgent = true, assignToTeam = true } = options;

  const username = generateUsername(member.firstName, member.lastName, department.code);
  const result: ProvisionResult = { username };

  let generatedEmail = member.email;

  if (createMailbox) {
    try {
      const mailboxResult = await createCpanelEmailAccount(
        member.firstName,
        member.lastName,
        department.code,
        member.id
      );
      result.mailcow = {
        success: true,
        email: mailboxResult.email,
        password: mailboxResult.password,
      };
      generatedEmail = mailboxResult.email;
      result.generatedEmail = generatedEmail;

      await db.update(teamMembers)
        .set({ 
          email: generatedEmail,
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.id, member.id));

    } catch (error: any) {
      result.mailcow = { success: false, error: error.message };
    }
  }

  if (createAgent) {
    const [cpanelCfg] = await db.select().from(cpanelConfig).where(eq(cpanelConfig.enabled, true)).limit(1);
    const domain = cpanelCfg?.domain || 'company.com';
    
    const agentResult = await createChatwootAgent(
      generatedEmail,
      member.firstName,
      member.lastName,
      member.id,
      department.name,
      domain,
      result.mailcow?.password
    );

    result.chatwoot = {
      success: agentResult.success,
      agentId: agentResult.agentId,
      error: agentResult.error,
    };

    if (agentResult.success && agentResult.agentId && assignToTeam) {
      const teamResult = await assignAgentToTeam(agentResult.agentId, department.id);
      if (teamResult.success) {
        result.chatwoot.teamId = teamResult.teamId;
      } else {
        console.warn(`Chatwoot team assignment failed for agent ${agentResult.agentId}: ${teamResult.error}`);
        result.chatwoot.error = (result.chatwoot.error || '') + ` Team assignment failed: ${teamResult.error}`;
      }
    }
  }

  const platforms: string[] = [];
  const platformUserIds: Record<string, any> = {};

  if (result.mailcow?.success) {
    platforms.push('cpanel');
    platformUserIds['cpanel'] = { email: result.mailcow.email };
  }

  if (result.chatwoot?.success) {
    platforms.push('chatwoot');
    platformUserIds['chatwoot'] = { 
      agentId: result.chatwoot.agentId,
      teamId: result.chatwoot.teamId,
    };
  }

  if (platforms.length > 0) {
    const [existingManagedUser] = await db.select()
      .from(managedUsers)
      .where(eq(managedUsers.teamMemberId, member.id));

    if (existingManagedUser) {
      const combinedPlatforms = [...(existingManagedUser.platforms || []), ...platforms];
      const updatedPlatforms = Array.from(new Set(combinedPlatforms));
      const existingPlatformIds = (existingManagedUser.platformUserIds || {}) as Record<string, any>;
      const updatedPlatformUserIds = { ...existingPlatformIds, ...platformUserIds };

      await db.update(managedUsers)
        .set({
          platforms: updatedPlatforms,
          platformUserIds: updatedPlatformUserIds,
          updatedAt: new Date(),
        })
        .where(eq(managedUsers.id, existingManagedUser.id));
    } else {
      await db.insert(managedUsers).values({
        email: generatedEmail,
        fullName: `${member.firstName} ${member.lastName}`,
        teamMemberId: member.id,
        platforms,
        platformUserIds,
        roles: {},
        status: 'active',
      });
    }
  }

  return result;
}

export const provisioning = {
  generateSecurePassword,
  createCpanelEmailAccount,
  provisionTeamMember,
};
