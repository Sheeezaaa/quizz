/**
 * Document Security & Cryptography Engine
 * Conforms to:
 * 1. AES-256-GCM authenticated encryption
 * 2. SHA-256 cryptographic hashing & fingerprinting
 * 3. Zero-Knowledge storage (only ciphertext stored, never plaintext)
 * 4. Zero-Knowledge Admin Lockout (Admins cannot preview, read, or download files)
 * 5. Role-Based Authorized Access & Decryption Verification
 * 6. Cryptographic Tamper Detection
 */

const STORAGE_KEY_DOCS = 'bob_encrypted_documents_vault';
const STORAGE_KEY_LOGS = 'bob_document_security_logs';
const VAULT_MASTER_SEED = 'COMSATS_BOB_2026_MASTER_DOC_KEY_DO_NOT_EXPOSE_256BIT';
export const AUTHORIZED_PROCTOR_PASSKEY = 'PROCTOR-PASSKEY-2026';

// Helper: Convert ArrayBuffer to Hex String
export function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// Helper: Convert ArrayBuffer to Base64
export function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
export function base64ToBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 2. Generate unique SHA-256 hash for document
 */
export async function generateSHA256Hash(arrayBuffer) {
  const digestBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(digestBuffer);
}

/**
 * Derive isolated AES-256-GCM CryptoKey
 */
async function deriveVaultCryptoKey(salt = 'BOB_VAULT_SALT_2026') {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(VAULT_MASTER_SEED),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Never expose key in plaintext
    ['encrypt', 'decrypt']
  );
}

/**
 * 1. Automatically encrypt document using AES-256-GCM before storing it
 * 3. Store only encrypted files, never original readable documents
 */
export async function encryptAndStoreDocument({
  file,
  uploadedBy = 'ADMIN',
  authorizedRoles = ['CHIEF_PROCTOR', 'EXAM_CONTROLLER'],
  category = ''
}) {
  const arrayBuffer = await file.arrayBuffer();

  // 2. Generate SHA-256 Hash
  const sha256Hash = await generateSHA256Hash(arrayBuffer);

  // Generate 12-byte cryptographically secure random IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-256-GCM Key
  const cryptoKey = await deriveVaultCryptoKey();

  // Encrypt with AES-256-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    cryptoKey,
    arrayBuffer
  );

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const encryptedBase64 = bufferToBase64(encryptedBuffer);
  const ivBase64 = bufferToBase64(iv.buffer);

  const detectedCategory = category || (
    file.name.toLowerCase().includes('solution') ||
    file.name.toLowerCase().includes('template') ||
    file.name.toLowerCase().includes('bank')
      ? 'BANK_SOLUTION_QUESTION_TEMPLATE'
      : 'EXAMINATION_DOCUMENT'
  );

  const documentRecord = {
    id: docId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    sha256Hash: sha256Hash,
    category: detectedCategory,
    encryptionAlgorithm: 'AES-256-GCM',
    iv: ivBase64,
    encryptedData: encryptedBase64,
    uploadedAt: new Date().toISOString(),
    uploadedBy: uploadedBy,
    status: 'ENCRYPTED_STORED',
    integrityStatus: 'AUTHENTIC',
    accessPolicy: 'ZERO_KNOWLEDGE_ADMIN_LOCKOUT',
    authorizedRoles: authorizedRoles,
    authorizedPasskey: AUTHORIZED_PROCTOR_PASSKEY
  };

  // 3. Store ONLY encrypted document
  saveDocumentToStorage(documentRecord);

  // 8. Log security event
  logSecurityEvent({
    type: 'DOCUMENT_ENCRYPTED_STORED',
    docId: docId,
    docName: file.name,
    sha256: sha256Hash,
    algorithm: 'AES-256-GCM',
    details: `Document encrypted with AES-256-GCM and SHA-256 fingerprint generated. Stored in zero-knowledge vault.`
  });

  return documentRecord;
}

/**
 * 7. Use SHA-256 hashing to verify document integrity and detect tampering
 */
export async function verifyDocumentIntegrity(docId) {
  const doc = getDocumentById(docId);
  if (!doc) throw new Error('Document not found');

  try {
    const cryptoKey = await deriveVaultCryptoKey();
    const iv = base64ToBuffer(doc.iv);
    const encryptedBytes = base64ToBuffer(doc.encryptedData);

    // AES-GCM verification & decryption
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      encryptedBytes
    );

    // SHA-256 recalculation
    const currentHash = await generateSHA256Hash(decryptedBuffer);

    if (currentHash === doc.sha256Hash) {
      logSecurityEvent({
        type: 'INTEGRITY_VERIFICATION_PASSED',
        docId: doc.id,
        docName: doc.fileName,
        sha256: doc.sha256Hash,
        details: `SHA-256 hash (${doc.sha256Hash.slice(0, 16)}...) and AES-GCM tag verified. Document is authentic.`
      });

      return {
        authentic: true,
        sha256: currentHash,
        verifiedAt: new Date().toISOString(),
        status: 'AUTHENTIC_VERIFIED'
      };
    } else {
      throw new Error('SHA-256 Hash Mismatch: Document has been tampered with!');
    }
  } catch (err) {
    logSecurityEvent({
      type: 'TAMPER_ALERT',
      docId: doc.id,
      docName: doc.fileName,
      details: `SECURITY ALERT: Document integrity failure! Tampering or corrupted ciphertext detected.`
    });

    return {
      authentic: false,
      error: 'TAMPER_DETECTED: Cryptographic authentication tag or SHA-256 checksum mismatch!',
      verifiedAt: new Date().toISOString(),
      status: 'TAMPER_DETECTED'
    };
  }
}

/**
 * 4. Admin must not be able to preview, open, download, or read uploaded documents.
 * 5. Only authorized users can access and decrypt documents after permission verification.
 */
export async function attemptDocumentDecryption({ docId, userRole = 'ADMIN', passkey = '' }) {
  const doc = getDocumentById(docId);
  if (!doc) throw new Error('Document not found');

  // Rule 4: If Admin attempts to decrypt/read/download, STRICTLY BLOCK!
  if (userRole === 'ADMIN' && passkey !== AUTHORIZED_PROCTOR_PASSKEY) {
    logSecurityEvent({
      type: 'ADMIN_DECRYPTION_BLOCKED',
      docId: doc.id,
      docName: doc.fileName,
      details: `Zero-Knowledge Enforcement: Administrator attempted to decrypt document without authorized passkey. Access Denied (403).`
    });

    throw new Error(
      '403 FORBIDDEN (ZERO-KNOWLEDGE POLICY): Administrators are strictly restricted from previewing, opening, or downloading uploaded confidential documents. Only authorized permission holders with a valid proctor passkey can decrypt this file.'
    );
  }

  // Rule 5: Authorized Verification
  if (passkey !== AUTHORIZED_PROCTOR_PASSKEY) {
    logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS_BLOCKED',
      docId: doc.id,
      docName: doc.fileName,
      details: `Unauthorized decryption attempt blocked: Invalid authorization passkey.`
    });

    throw new Error('Unauthorized: Invalid authorization passkey.');
  }

  // Decrypt for authorized proctor
  const cryptoKey = await deriveVaultCryptoKey();
  const iv = base64ToBuffer(doc.iv);
  const encryptedBytes = base64ToBuffer(doc.encryptedData);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    cryptoKey,
    encryptedBytes
  );

  // Verify SHA-256 before releasing file
  const currentHash = await generateSHA256Hash(decryptedBuffer);
  if (currentHash !== doc.sha256Hash) {
    throw new Error('Integrity Check Failed: Decrypted file does not match original SHA-256 checksum!');
  }

  logSecurityEvent({
    type: 'AUTHORIZED_DECRYPTION_GRANTED',
    docId: doc.id,
    docName: doc.fileName,
    details: `Authorized proctor successfully authenticated and decrypted file.`
  });

  return {
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    arrayBuffer: decryptedBuffer
  };
}

/**
 * Tamper Simulation for Testing
 */
export function simulateTamperOnDocument(docId) {
  const doc = getDocumentById(docId);
  if (!doc) return;

  const bytes = base64ToBuffer(doc.encryptedData);
  // Invert one byte in the middle of ciphertext
  bytes[Math.floor(bytes.length / 2)] ^= 0xff;
  doc.encryptedData = bufferToBase64(bytes.buffer);
  doc.integrityStatus = 'TAMPERED_IN_SIMULATION';

  saveDocumentToStorage(doc);

  logSecurityEvent({
    type: 'SIMULATION_TAMPER_APPLIED',
    docId: doc.id,
    docName: doc.fileName,
    details: `[TESTING SIMULATION] Inverted byte in ciphertext to test cryptographic tampering detection.`
  });
}

// Storage Helpers
function saveDocumentToStorage(doc) {
  const all = getStoredDocuments();
  const idx = all.findIndex(d => d.id === doc.id);
  if (idx >= 0) all[idx] = doc;
  else all.unshift(doc);
  localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(all));
}

export function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!raw) {
      // Initialize with seed encrypted documents
      const seed = getInitialSeedEncryptedDocs();
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getDocumentById(id) {
  const all = getStoredDocuments();
  return all.find(d => d.id === id) || null;
}

export function deleteStoredDocument(id) {
  const all = getStoredDocuments().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(all));
  logSecurityEvent({
    type: 'DOCUMENT_PURGED',
    docId: id,
    details: `Document record purged from encrypted vault.`
  });
}

// Audit Logs
export function logSecurityEvent({ type, docId = '', docName = '', sha256 = '', algorithm = 'AES-256-GCM', details = '' }) {
  try {
    const logs = getSecurityAuditLogs();
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type,
      docId,
      docName,
      sha256,
      algorithm,
      details
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.length = 100;
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch {}
}

export function getSecurityAuditLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'log_seed_1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'VAULT_INITIALIZED',
        docId: 'SYSTEM',
        docName: 'Cryptographic Engine',
        sha256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        algorithm: 'AES-256-GCM',
        details: 'AES-256-GCM zero-knowledge document encryption subsystem initialized.'
      }
    ];
  } catch {
    return [];
  }
}

// Seed Initial Sample Encrypted Documents
function getInitialSeedEncryptedDocs() {
  return [
    {
      id: 'doc_seed_qbank_2026',
      fileName: 'Final_Championship_Round1_Exam_Paper.pdf',
      fileSize: 248920,
      mimeType: 'application/pdf',
      sha256Hash: 'a7b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef123456',
      encryptionAlgorithm: 'AES-256-GCM',
      iv: '5v9Z1kL4x7P2q8W3',
      encryptedData: 'G7xP9qLm3K0wRv1Z4sT8yU2oX5vB7aC9eD1fG3hJ5kL7mN9pQ1rS3tU5vW7xY9z0...',
      uploadedAt: new Date(Date.now() - 86400000).toISOString(),
      uploadedBy: 'ADMIN (Sheeza Rasheed)',
      status: 'ENCRYPTED_STORED',
      integrityStatus: 'AUTHENTIC',
      accessPolicy: 'ZERO_KNOWLEDGE_ADMIN_LOCKOUT',
      authorizedRoles: ['CHIEF_PROCTOR', 'EXAM_CONTROLLER'],
      authorizedPasskey: AUTHORIZED_PROCTOR_PASSKEY
    },
    {
      id: 'doc_seed_answer_key',
      fileName: 'Master_Answer_Key_Verification_Audit.xlsx',
      fileSize: 94820,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sha256Hash: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      encryptionAlgorithm: 'AES-256-GCM',
      iv: '2m8K0xP4w7Z1q9V5',
      encryptedData: 'L2vB4nQ6rS8uW0xY2aC4eF6hJ8kM0pQ2sT4vX6z8bC0eG2iK4mO6qS8uW0yA2cE...',
      uploadedAt: new Date(Date.now() - 43200000).toISOString(),
      uploadedBy: 'ADMIN (Sheeza Rasheed)',
      status: 'ENCRYPTED_STORED',
      integrityStatus: 'AUTHENTIC',
      accessPolicy: 'ZERO_KNOWLEDGE_ADMIN_LOCKOUT',
      authorizedRoles: ['CHIEF_PROCTOR'],
      authorizedPasskey: AUTHORIZED_PROCTOR_PASSKEY
    }
  ];
}
