// /life-story/server/utils/inviteCode.js

import crypto from 'crypto';

/**
 * Generate a unique, human-readable invite code
 * Format: XXXX-XXXX (8 characters, easy to share)
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let code = '';

  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Generate a unique invite code that doesn't exist in the database
 */
export async function generateUniqueInviteCode(pool) {
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    code = generateInviteCode();

    // Check if code exists
    const existing = await pool.query(
      'SELECT id FROM memory_circles WHERE invite_code = $1',
      [code]
    );

    if (existing.rows.length === 0) {
      return code;
    }

    attempts++;
  }

  throw new Error('Could not generate unique invite code');
}
