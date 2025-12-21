/**
 * @fileoverview cPanel API Client
 * Handles communication with cPanel UAPI for email account creation
 */

import crypto from 'crypto';

export interface CpanelCredentials {
  hostname: string;
  apiToken: string;
  cpanelUsername: string;
}

export interface EmailAccountData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  quota?: number; // In MB, default 512
}

export class CpanelClient {
  private hostname: string;
  private apiToken: string;
  private cpanelUsername: string;

  constructor(credentials: CpanelCredentials) {
    this.hostname = credentials.hostname;
    this.apiToken = credentials.apiToken;
    this.cpanelUsername = credentials.cpanelUsername;
  }

  /**
   * Create an email account in cPanel via UAPI
   * Uses cPanel's Email::addpop endpoint
   */
  async createEmailAccount(data: EmailAccountData): Promise<{ success: boolean; email: string; error?: string }> {
    try {
      const url = `https://${this.hostname}:2087/execute/Email/addpop`;

      const params = new URLSearchParams({
        email: data.email,
        password: data.password,
        quota: (data.quota || 512).toString(),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `cpanel ${this.cpanelUsername}:${this.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const result = await response.json() as any;

      // cPanel returns errors in metadata.result array
      if (!response.ok || (result.metadata && result.metadata.result === 0)) {
        const errorMsg = result.metadata?.reason || 'Unknown error';
        console.error(`[cPanel] Email creation failed: ${errorMsg}`);
        return { success: false, email: data.email, error: errorMsg };
      }

      console.log(`[cPanel] Email account created: ${data.email}`);
      return { success: true, email: data.email };
    } catch (error) {
      console.error('[cPanel] Email creation error:', error);
      return { 
        success: false, 
        email: data.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Suspend an email account in cPanel
   */
  async suspendEmailAccount(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://${this.hostname}:2087/execute/Email/suspendpop`;

      const params = new URLSearchParams({ email });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `cpanel ${this.cpanelUsername}:${this.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const result = await response.json() as any;

      if (!response.ok || (result.metadata && result.metadata.result === 0)) {
        const errorMsg = result.metadata?.reason || 'Unknown error';
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (error) {
      console.error('[cPanel] Email suspension error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete an email account from cPanel
   */
  async deleteEmailAccount(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://${this.hostname}:2087/execute/Email/delpop`;

      const params = new URLSearchParams({ email });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `cpanel ${this.cpanelUsername}:${this.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const result = await response.json() as any;

      if (!response.ok || (result.metadata && result.metadata.result === 0)) {
        const errorMsg = result.metadata?.reason || 'Unknown error';
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (error) {
      console.error('[cPanel] Email deletion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Hash password with salt for secure storage
 * @param password - Plain text password
 * @returns Hash with embedded salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash with salt
 * @returns True if password matches
 */
export function verifyPasswordHash(password: string, hash: string): boolean {
  try {
    const [salt, storedHash] = hash.split(':');
    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return computedHash === storedHash;
  } catch {
    return false;
  }
}
