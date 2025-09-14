import crypto from "crypto";

const encryptionKey = process.env.ENCRYPTION_KEY || "";
const secret = process.env.SECRET || "";

console.log(`ENCRYPTION_KEY: ${encryptionKey}`);
console.log(`ENCRYPTION_KEY length: ${encryptionKey.length} (should be 64)`);
console.log(
  `ENCRYPTION_KEY is hex: ${
    /^[0-9a-fA-F]+$/.test(encryptionKey) ? "YES" : "NO"
  }\n`
);

console.log(`SECRET: ${secret}`);
console.log(`SECRET length: ${secret.length} (should be 64)`);
console.log(`SECRET is hex: ${/^[0-9a-fA-F]+$/.test(secret) ? "YES" : "NO"}\n`);

try {
  const keyBuf = Buffer.from(encryptionKey, "hex");
  console.log(`hex2bin ENCRYPTION_KEY: SUCCESS (length: ${keyBuf.length})`);
} catch (err) {
  console.error(`hex2bin ENCRYPTION_KEY: FAILED - ${err.message}`);
}

try {
  const secretBuf = Buffer.from(secret, "hex");
  console.log(`hex2bin SECRET: SUCCESS (length: ${secretBuf.length})`);
} catch (err) {
  console.error(`hex2bin SECRET: FAILED - ${err.message}`);
}
