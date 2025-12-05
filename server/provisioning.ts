import crypto from 'crypto';
import { db } from './db';
import {
  teamMembers,
  chatwootConfig,
  chatwootAgents,
  chatwootTeams,
  mailcowConfig,
  departments,
  managedUsers,
  type TeamMember,
  type ChatwootConfig,
  type MailcowConfig,
  type Department,
} from '@shared/schema';
import { eq, and, like, sql } from 'drizzle-orm';

interface ProvisioningResult {
  success: boolean;
  platform: 'mailcow' | 'chatwoot';
  userId?: string | number;
  email?: string;
  error?: string;
}

interface FullProvisioningResult {
  mailcow?: ProvisioningResult;
  chatwoot?: ProvisioningResult;
  username: string;
  generatedEmail: string;
}

export class PlatformProvisioning {
  
  /**
   * Generate a username in firstname.lastname format with collision handling
   * Format: firstname.lastname (lowercase)
   * Collision: If exists, append increment (e.g., john.doe1, john.doe2)
   */
  async generateUsername(firstName: string, lastName: string, domain: string): Promise<string> {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
      .replace(/[^a-z.]/g, '') // Remove non-alphanumeric except dots
      .replace(/\.+/g, '.'); // Replace multiple dots with single dot
    
    // Check if email already exists in team_members
    const existingEmails = await db
      .select({ email: teamMembers.email })
      .from(teamMembers)
      .where(like(teamMembers.email, `${baseUsername}%@${domain}`));
    
    if (existingEmails.length === 0) {
      return baseUsername;
    }
    
    // Find the highest increment number
    const usedNumbers: number[] = [0];
    for (const row of existingEmails) {
      const match = row.email?.match(new RegExp(`^${baseUsername.replace('.', '\\.')}(\\d*)@`));
      if (match) {
        const num = match[1] ? parseInt(match[1], 10) : 0;
        usedNumbers.push(num);
      }
    }
    
    const nextNumber = Math.max(...usedNumbers) + 1;
    return `${baseUsername}${nextNumber}`;
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    return password;
  }

  /**
   * Get active Mailcow configuration
   */
  async getMailcowConfig(): Promise<MailcowConfig | null> {
    const [config] = await db
      .select()
      .from(mailcowConfig)
      .where(eq(mailcowConfig.enabled, true))
      .limit(1);
    return config || null;
  }

  /**
   * Get active Chatwoot configuration
   */
  async getChatwootConfig(): Promise<ChatwootConfig | null> {
    const [config] = await db
      .select()
      .from(chatwootConfig)
      .where(eq(chatwootConfig.enabled, true))
      .limit(1);
    return config || null;
  }

  /**
   * Create a mailbox in Mailcow
   */
  async createMailcowMailbox(
    username: string,
    domain: string,
    fullName: string,
    password: string,
    quotaMB: number = 3072
  ): Promise<ProvisioningResult> {
    const config = await this.getMailcowConfig();
    
    if (!config) {
      return {
        success: false,
        platform: 'mailcow',
        error: 'Mailcow configuration not found or disabled',
      };
    }

    const email = `${username}@${domain}`;

    try {
      const response = await fetch(`${config.instanceUrl}/api/v1/add/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: '1',
          local_part: username,
          domain: domain,
          name: fullName,
          password: password,
          password2: password,
          quota: quotaMB.toString(),
          force_pw_update: '0',
          tls_enforce_in: '0',
          tls_enforce_out: '0',
        }),
      });

      const data = await response.json();

      if (response.ok && (data.type === 'success' || data[0]?.type === 'success')) {
        return {
          success: true,
          platform: 'mailcow',
          email: email,
        };
      }

      return {
        success: false,
        platform: 'mailcow',
        error: data.msg || data[0]?.msg || 'Failed to create mailbox',
      };
    } catch (error) {
      return {
        success: false,
        platform: 'mailcow',
        error: error instanceof Error ? error.message : 'Network error connecting to Mailcow',
      };
    }
  }

  /**
   * Create an agent in Chatwoot
   */
  async createChatwootAgent(
    email: string,
    name: string,
    role: 'agent' | 'administrator' = 'agent'
  ): Promise<ProvisioningResult> {
    const config = await this.getChatwootConfig();

    if (!config) {
      return {
        success: false,
        platform: 'chatwoot',
        error: 'Chatwoot configuration not found or disabled',
      };
    }

    try {
      const response = await fetch(
        `${config.instanceUrl}/api/v1/accounts/${config.accountId}/agents`,
        {
          method: 'POST',
          headers: {
            'api_access_token': config.apiAccessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            email: email,
            role: role,
            auto_offline: false,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.id) {
        return {
          success: true,
          platform: 'chatwoot',
          userId: data.id,
          email: email,
        };
      }

      return {
        success: false,
        platform: 'chatwoot',
        error: data.error || data.message || 'Failed to create agent',
      };
    } catch (error) {
      return {
        success: false,
        platform: 'chatwoot',
        error: error instanceof Error ? error.message : 'Network error connecting to Chatwoot',
      };
    }
  }

  /**
   * Add agent to a Chatwoot team
   */
  async addAgentToTeam(agentId: number, teamId: number): Promise<boolean> {
    const config = await this.getChatwootConfig();
    if (!config) return false;

    try {
      const response = await fetch(
        `${config.instanceUrl}/api/v1/accounts/${config.accountId}/teams/${teamId}/team_members`,
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

      return response.ok;
    } catch (error) {
      console.error('Failed to add agent to team:', error);
      return false;
    }
  }

  /**
   * Get Chatwoot team ID for a department
   */
  async getChatwootTeamForDepartment(departmentId: string): Promise<number | null> {
    const [team] = await db
      .select()
      .from(chatwootTeams)
      .where(eq(chatwootTeams.departmentId, departmentId))
      .limit(1);
    
    return team?.chatwootTeamId || null;
  }

  /**
   * Generate Chatwoot SSO token using HMAC-SHA256
   * Token format: HMAC_SHA256(user_email, chatwoot_sso_key)
   */
  generateChatwootSSOToken(email: string, ssoKey: string): string {
    const hmac = crypto.createHmac('sha256', ssoKey);
    hmac.update(email);
    return hmac.digest('hex');
  }

  /**
   * Get Chatwoot SSO login URL for a team member
   */
  async getChatwootSSOUrl(email: string): Promise<string | null> {
    const config = await this.getChatwootConfig();
    if (!config || !config.ssoEnabled || !config.webhookSecret) {
      return null;
    }

    const ssoToken = this.generateChatwootSSOToken(email, config.webhookSecret);
    return `${config.instanceUrl}/sso/login?email=${encodeURIComponent(email)}&sso_auth_token=${ssoToken}`;
  }

  /**
   * Full provisioning workflow for a new team member
   * Creates both Mailcow mailbox and Chatwoot agent
   */
  async provisionTeamMember(
    teamMember: TeamMember,
    department: Department,
    options: {
      createMailbox?: boolean;
      createChatwootAgent?: boolean;
      assignToTeam?: boolean;
    } = { createMailbox: true, createChatwootAgent: true, assignToTeam: true }
  ): Promise<FullProvisioningResult> {
    const mailcowConf = await this.getMailcowConfig();
    const chatwootConf = await this.getChatwootConfig();

    const domain = mailcowConf?.domain || 'mmallelectronics.co.za';
    const username = await this.generateUsername(
      teamMember.firstName,
      teamMember.lastName,
      domain
    );
    const generatedEmail = `${username}@${domain}`;
    const password = this.generateSecurePassword();
    const fullName = `${teamMember.firstName} ${teamMember.lastName}`;

    const result: FullProvisioningResult = {
      username,
      generatedEmail,
    };

    // Create Mailcow mailbox
    if (options.createMailbox && mailcowConf) {
      result.mailcow = await this.createMailcowMailbox(
        username,
        domain,
        fullName,
        password
      );

      if (result.mailcow.success) {
        // Update managed_users with Mailcow info
        await this.updateManagedUserPlatform(
          teamMember.id,
          'mailcow',
          generatedEmail,
          { email: generatedEmail }
        );
      }
    }

    // Create Chatwoot agent
    if (options.createChatwootAgent && chatwootConf) {
      // Use the generated email for Chatwoot if mailbox was created, otherwise use team member email
      const agentEmail = result.mailcow?.success ? generatedEmail : teamMember.email;
      
      result.chatwoot = await this.createChatwootAgent(agentEmail, fullName);

      if (result.chatwoot.success && result.chatwoot.userId) {
        // Save Chatwoot agent mapping
        await db.insert(chatwootAgents).values({
          teamMemberId: teamMember.id,
          chatwootAgentId: result.chatwoot.userId as number,
          chatwootAgentEmail: agentEmail,
          isActive: true,
        });

        // Update managed_users with Chatwoot info
        await this.updateManagedUserPlatform(
          teamMember.id,
          'chatwoot',
          String(result.chatwoot.userId),
          { agentId: result.chatwoot.userId, email: agentEmail }
        );

        // Assign agent to team if requested
        if (options.assignToTeam) {
          const teamId = await this.getChatwootTeamForDepartment(teamMember.departmentId);
          if (teamId) {
            await this.addAgentToTeam(result.chatwoot.userId as number, teamId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Update or create managed_users entry with platform info
   */
  private async updateManagedUserPlatform(
    teamMemberId: string,
    platform: string,
    platformUserId: string,
    additionalData: Record<string, unknown> = {}
  ): Promise<void> {
    // Check if managed user exists
    const [existing] = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.teamMemberId, teamMemberId))
      .limit(1);

    if (existing) {
      // Update existing record
      const platforms = existing.platforms.includes(platform)
        ? existing.platforms
        : [...existing.platforms, platform];
      
      const platformUserIds = {
        ...(existing.platformUserIds as Record<string, string>),
        [platform]: platformUserId,
      };

      await db
        .update(managedUsers)
        .set({
          platforms,
          platformUserIds,
          updatedAt: new Date(),
        })
        .where(eq(managedUsers.id, existing.id));
    } else {
      // Get team member info for managed user creation
      const [member] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .limit(1);

      if (member) {
        await db.insert(managedUsers).values({
          email: member.email,
          fullName: `${member.firstName} ${member.lastName}`,
          teamMemberId: teamMemberId,
          platforms: [platform],
          platformUserIds: { [platform]: platformUserId },
          roles: {},
          status: 'active',
        });
      }
    }
  }

  /**
   * Test Mailcow connection
   */
  async testMailcowConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getMailcowConfig();
    if (!config) {
      return { success: false, message: 'Mailcow configuration not found' };
    }

    try {
      const response = await fetch(`${config.instanceUrl}/api/v1/get/domain/all`, {
        headers: {
          'X-API-Key': config.apiKey,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Mailcow connection successful' };
      }
      return { success: false, message: `Mailcow API returned ${response.status}` };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Test Chatwoot connection
   */
  async testChatwootConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getChatwootConfig();
    if (!config) {
      return { success: false, message: 'Chatwoot configuration not found' };
    }

    try {
      const response = await fetch(
        `${config.instanceUrl}/api/v1/accounts/${config.accountId}/agents`,
        {
          headers: {
            'api_access_token': config.apiAccessToken,
          },
        }
      );

      if (response.ok) {
        return { success: true, message: 'Chatwoot connection successful' };
      }
      return { success: false, message: `Chatwoot API returned ${response.status}` };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Delete Mailcow mailbox
   */
  async deleteMailcowMailbox(email: string): Promise<boolean> {
    const config = await this.getMailcowConfig();
    if (!config) return false;

    try {
      const response = await fetch(`${config.instanceUrl}/api/v1/delete/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([email]),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete Mailcow mailbox:', error);
      return false;
    }
  }

  /**
   * Delete Chatwoot agent
   */
  async deleteChatwootAgent(agentId: number): Promise<boolean> {
    const config = await this.getChatwootConfig();
    if (!config) return false;

    try {
      const response = await fetch(
        `${config.instanceUrl}/api/v1/accounts/${config.accountId}/agents/${agentId}`,
        {
          method: 'DELETE',
          headers: {
            'api_access_token': config.apiAccessToken,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to delete Chatwoot agent:', error);
      return false;
    }
  }
}

// Export singleton instance
export const provisioning = new PlatformProvisioning();
