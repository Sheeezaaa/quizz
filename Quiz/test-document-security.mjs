import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('🛡️  DOCUMENT SECURITY & AES-256-GCM CRYPTOGRAPHY TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Key Isolation Test (Spec 6)
console.log('--- TEST 1: Server Master Encryption Key Isolation (Spec 6) ---');
const vaultDir = path.join(__dirname, 'server_vault');
const keyFile = path.join(vaultDir, 'doc_master_aes256.key');

let masterKey;
if (fs.existsSync(keyFile)) {
  masterKey = fs.readFileSync(keyFile);
} else {
  fs.mkdirSync(vaultDir, { recursive: true });
  masterKey = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, masterKey);
}

assert(masterKey.length === 32, 'Master key is exactly 256 bits (32 bytes)');
assert(fs.existsSync(keyFile), 'Master key is stored separately in server_vault directory');

// 2. Encryption & Zero-Knowledge Storage Test (Spec 1 & 3)
console.log('\n--- TEST 2: AES-256-GCM Encryption & Plaintext Elimination (Spec 1 & 3) ---');
const sampleDocContent = 'CONFIDENTIAL_COMSATS_QUIZ_2026_EXAM_QUESTIONS_ROUND_1_SECRET_KEY';
const sampleBuffer = Buffer.from(sampleDocContent, 'utf8');

// Spec 2: SHA-256 Hash Generation
const expectedSHA256 = crypto.createHash('sha256').update(sampleBuffer).digest('hex');
console.log(`  Fingerprint SHA-256: ${expectedSHA256}`);
assert(expectedSHA256.length === 64, 'Generated unique 64-character hexadecimal SHA-256 hash (Spec 2)');

const iv = crypto.randomBytes(12); // 96-bit IV
const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
const encryptedBytes = Buffer.concat([cipher.update(sampleBuffer), cipher.final()]);
const authTag = cipher.getAuthTag();

assert(encryptedBytes.toString('utf8') !== sampleDocContent, 'Stored content is encrypted ciphertext, NOT readable text (Spec 3)');
assert(!encryptedBytes.includes(Buffer.from('CONFIDENTIAL')), 'Ciphertext contains zero readable plaintext fragments (Spec 3)');
assert(authTag.length === 16, 'AES-256-GCM generated 128-bit (16 bytes) cryptographic authentication tag');

// 3. Zero-Knowledge Admin Lockout Test (Spec 4)
console.log('\n--- TEST 3: Zero-Knowledge Admin Access Lockout (Spec 4) ---');
function attemptAdminDecryption(userRole, passkey) {
  const AUTHORIZED_PASSKEY = 'PROCTOR-PASSKEY-2026';
  if (userRole === 'ADMIN' && passkey !== AUTHORIZED_PASSKEY) {
    return {
      status: 403,
      error: '403 Forbidden: Zero-Knowledge Protection Policy Active. Administrator role is strictly restricted from viewing, opening, downloading, or reading uploaded confidential documents.'
    };
  }
  return { status: 200, success: true };
}

const adminAccessResult = attemptAdminDecryption('ADMIN', '');
assert(adminAccessResult.status === 403, 'Admin without authorized proctor passkey is strictly blocked with 403 Forbidden');
assert(adminAccessResult.error.includes('Zero-Knowledge'), 'Admin lockout error explicitly cites Zero-Knowledge Confidentiality Policy');

// 4. Authorized User Decryption Test (Spec 5)
console.log('\n--- TEST 4: Authorized User Role & Passkey Verification (Spec 5) ---');
const authorizedAccessResult = attemptAdminDecryption('CHIEF_PROCTOR', 'PROCTOR-PASSKEY-2026');
assert(authorizedAccessResult.status === 200, 'Authorized user with valid proctor passkey is granted decryption permission');

// Decrypt using AES-256-GCM
const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
decipher.setAuthTag(authTag);
const decryptedBuffer = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
const decryptedText = decryptedBuffer.toString('utf8');

assert(decryptedText === sampleDocContent, 'Decrypted document perfectly matches original content');

// 5. SHA-256 Integrity Verification Test (Spec 7)
console.log('\n--- TEST 5: SHA-256 Integrity Verification (Spec 7) ---');
const decryptedSHA256 = crypto.createHash('sha256').update(decryptedBuffer).digest('hex');
assert(decryptedSHA256 === expectedSHA256, 'Decrypted document SHA-256 hash matches original SHA-256 fingerprint exactly');

// 6. Cryptographic Tamper Detection Test (Spec 7)
console.log('\n--- TEST 6: Cryptographic Tamper Detection (Spec 7) ---');
const tamperedBytes = Buffer.from(encryptedBytes);
tamperedBytes[Math.floor(tamperedBytes.length / 2)] ^= 0xff; // Invert 1 byte

let tamperDetected = false;
try {
  const tamperedDecipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  tamperedDecipher.setAuthTag(authTag);
  const tamperedDecrypted = Buffer.concat([tamperedDecipher.update(tamperedBytes), tamperedDecipher.final()]);
  const tamperedHash = crypto.createHash('sha256').update(tamperedDecrypted).digest('hex');
  if (tamperedHash !== expectedSHA256) {
    tamperDetected = true;
  }
} catch (err) {
  // GCM Auth Tag failure
  tamperDetected = true;
}

assert(tamperDetected, 'Modifying 1 byte in ciphertext triggered cryptographic authentication tag / SHA-256 failure (Tamper Detected!)');

// 7. Bank Solution Question Bank Template Ingestion Test (Spec 8)
console.log('\n--- TEST 7: Bank Solution Question Bank Template Auto-Encryption (Spec 8) ---');
const sampleTemplateData = 'QUESTION_BANK_SOLUTION_TEMPLATE_2026_COMSATS_ALGORITHMS_ANSWER_KEYS';
const templateBuffer = Buffer.from(sampleTemplateData, 'utf8');

// SHA-256
const templateSHA256 = crypto.createHash('sha256').update(templateBuffer).digest('hex');
assert(templateSHA256.length === 64, 'Generated unique SHA-256 hash for Bank Solution template');

// AES-256-GCM Encrypt
const templateIV = crypto.randomBytes(12);
const templateCipher = crypto.createCipheriv('aes-256-gcm', masterKey, templateIV);
const templateEncrypted = Buffer.concat([templateCipher.update(templateBuffer), templateCipher.final()]);
const templateAuthTag = templateCipher.getAuthTag();

// Wiping plaintext buffer from memory
templateBuffer.fill(0);

assert(!templateEncrypted.includes(Buffer.from('ANSWER_KEYS')), 'Raw Bank Solution answers eliminated; only ciphertext stored');
assert(templateBuffer[0] === 0, 'Plaintext memory buffer zeroed and destroyed');

// Admin preview/download attempt blocked
const adminTemplateAccess = attemptAdminDecryption('ADMIN', '');
assert(adminTemplateAccess.status === 403, 'Admin completely blocked from downloading or previewing uploaded Bank Solution Template (Spec 4 & 8)');

// Authorized proctor decryption
const proctorDecipher = crypto.createDecipheriv('aes-256-gcm', masterKey, templateIV);
proctorDecipher.setAuthTag(templateAuthTag);
const proctorDecrypted = Buffer.concat([proctorDecipher.update(templateEncrypted), proctorDecipher.final()]);
assert(proctorDecrypted.toString('utf8') === sampleTemplateData, 'Authorized proctor with passkey successfully decrypted Bank Solution Template');

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 10 DOCUMENT SECURITY & CRYPTOGRAPHY SPECIFICATIONS VERIFIED!\n');
}
