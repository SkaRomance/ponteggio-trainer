import { pbkdf2Sync, randomBytes, createHash } from 'node:crypto';

const args = process.argv.slice(2);
const useLegacySha256 = args.includes('--legacy-sha256');
const password = args.find((arg) => arg !== '--legacy-sha256');
const iterations = Number(process.env.MARS_AUTH_PBKDF2_ITERATIONS ?? '310000');

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password" [--legacy-sha256]');
  process.exit(1);
}

if (useLegacySha256) {
  const legacyHash = createHash('sha256').update(password, 'utf8').digest('hex');
  console.log(legacyHash);
  process.exit(0);
}

const salt = randomBytes(16).toString('base64url');
const digest = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
console.log(`pbkdf2_sha256$${iterations}$${salt}$${digest}`);
