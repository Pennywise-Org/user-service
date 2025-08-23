import crypto, { createDecipheriv } from 'crypto';

export const encryptToken = (
  token: string,
  encryption_key: crypto.CipherKey,
  iv_length: number
): string => {
  const iv = crypto.randomBytes(iv_length);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryption_key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptToken = (encryptedToken: string, encryption_key: crypto.CipherKey): string => {
  try {
    const [iv, authTag, encrypted] = encryptedToken.split(':');
    if (!iv || !authTag || !encrypted) throw new Error('Malformed token structure');

    const decipher = createDecipheriv('aes-256-gcm', encryption_key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decryptedToken = decipher.update(encrypted, 'hex', 'utf8');
    decryptedToken += decipher.final('utf8');
    return decryptedToken;
  } catch (err) {
    throw new Error('Invalid refresh token');
  }
};
