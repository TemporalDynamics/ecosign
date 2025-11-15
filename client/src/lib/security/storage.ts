export function sanitizeStoragePath(path: string): string {
  if (!path) return '';
  return path
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .trim();
}

export function isPathAllowed(path: string, userId: string): boolean {
  const sanitized = sanitizeStoragePath(path);
  return sanitized.startsWith(`${userId}/`);
}

export function buildSignedURL(path: string, expiresInSeconds: number = 300) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const token = Buffer.from(`${path}:${expiresAt}`).toString('base64');
  return {
    url: `https://storage.local/${encodeURIComponent(path)}?token=${token}`,
    expiresAt
  };
}
