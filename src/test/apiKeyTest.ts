import { Buffer } from 'buffer';

const encryptionKey: string = process.env.ENCRYPTION_KEY || '';
const secret: string = process.env.SECRET || '';

function isHex(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value);
}

function logKeyInfo(label: string, key: string, expectedLength: number): void {
  console.log(`${label}: ${key}`);
  console.log(`${label} length: ${key.length} (should be ${expectedLength})`);
  console.log(`${label} is hex: ${isHex(key) ? 'YES' : 'NO'}\n`);

  try {
    const keyBuf = Buffer.from(key, 'hex');
    console.log(`hex2bin ${label}: SUCCESS (length: ${keyBuf.length})\n`);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`hex2bin ${label}: FAILED - ${err.message}\n`);
    } else {
      console.error(`hex2bin ${label}: FAILED - Unknown error\n`);
    }
  }
}
logKeyInfo('ENCRYPTION_KEY', encryptionKey, 64);
logKeyInfo('SECRET', secret, 64);
