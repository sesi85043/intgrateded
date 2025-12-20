import crypto from 'crypto';
import { db } from './db';
import { mailcowConfig } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a cryptographically secure password.
 * Uses Node's WebCrypto implementation for secure randomness.
 */
export function generateSecurePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  const randomValues = new Uint32Array(length);
  // Use Node's WebCrypto for secure randomness
  if (crypto.webcrypto && typeof crypto.webcrypto.getRandomValues === 'function') {
    crypto.webcrypto.getRandomValues(randomValues as unknown as Uint8Array);
  } else {
    // Fallback to randomFillSync if WebCrypto not available
    const buf = Buffer.allocUnsafe(length * 4);
    crypto.randomFillSync(buf);
    for (let i = 0; i < length; i++) randomValues[i] = buf.readUInt32LE(i * 4);
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

/**
 * Create a Mailcow mailbox using the configured Mailcow instance in the DB.
 * Format for local part: surname.firstname_department
 */
export async function createMailcowMailbox(firstName: string, lastName: string, department: string) {
  const config = await db.query.mailcowConfig.findFirst({
    where: eq(mailcowConfig.enabled, true),
  });

  if (!config || !config.instanceUrl || !config.apiKey || !config.domain) {
    throw new Error('Mailcow is not configured or enabled.');
  }

  const cleanLast = lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanFirst = firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanDept = (department || 'staff').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const localPart = `${cleanLast}.${cleanFirst}_${cleanDept}`;
  const email = `${localPart}@${config.domain}`;
  const password = generateSecurePassword(16);

  const res = await fetch(`${config.instanceUrl.replace(/\/$/, '')}/api/v1/add/mailbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      local_part: localPart,
      domain: config.domain,
      password,
      name: `${firstName} ${lastName}`,
      active: '1',
      quota: 3072,
    }),
  });

  const result = await res.json();
  if (Array.isArray(result) && result[0] && result[0].type === 'error') {
    throw new Error(`Mailcow Error: ${result[0].msg}`);
  }

  return { email, password };
}
