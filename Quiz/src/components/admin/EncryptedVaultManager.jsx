import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  EyeOff,
  KeyRound,
  FileUp,
  Search,
  ExternalLink,
  Ban
} from 'lucide-react';
import {
  apiGetEncryptedDocuments,
  apiUploadEncryptedDocument,
  apiVerifyDocumentIntegrity,
  apiAttemptDocumentDecryption,
  apiGetDocumentSecurityLogs,
  apiDeleteEncryptedDocument,
  apiSimulateTamper
} from '../../utils/api';
import { AUTHORIZED_PROCTOR_PASSKEY } from '../../utils/documentSecurity';

export default function EncryptedVaultManager({ isDark = true }) {
  const [documents, setDocuments] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [copiedHash, setCopiedHash] = useState('');
  
  // Verification State
  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // Decryption Modal State
  const [activeDecryptionDoc, setActiveDecryptionDoc] = useState(null);
  const [decryptionPasskey, setDecryptionPasskey] = useState('');
  const [decryptionRole, setDecryptionRole] = useState('ADMIN');
  const [decryptionError, setDecryptionError] = useState('');
  const [decryptionSuccess, setDecryptionSuccess] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Load documents and logs on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, logs] = await Promise.all([
        apiGetEncryptedDocuments(),
        apiGetDocumentSecurityLogs()
      ]);
      setDocuments(docs || []);
      setSecurityLogs(logs || []);
    } catch (err) {
      console.error('Failed to load encrypted vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Computing SHA-256 fingerprint & encrypting with AES-256-GCM...');
    setUploadError('');

    try {
      await apiUploadEncryptedDocument(file);
      setUploadStatus('Document encrypted with AES-256-GCM and stored in Zero-Knowledge Vault!');
      await loadData();
      setTimeout(() => setUploadStatus(''), 4000);
    } catch (err) {
      setUploadError(err.message || 'Encryption failed.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleVerifyIntegrity = async (docId) => {
    setVerifyingDocId(docId);
    setVerificationResult(null);
    try {
      const res = await apiVerifyDocumentIntegrity(docId);
      setVerificationResult({ docId, ...res });
      await loadData();
    } catch (err) {
      setVerificationResult({
        docId,
        authentic: false,
        error: err.message || 'Integrity check failed'
      });
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleAttemptDecryption = async (e) => {
    e.preventDefault();
    if (!activeDecryptionDoc) return;

    setIsDecrypting(true);
    setDecryptionError('');
    setDecryptionSuccess(null);

    try {
      const result = await apiAttemptDocumentDecryption(
        activeDecryptionDoc.id,
        decryptionPasskey,
        decryptionRole
      );

      setDecryptionSuccess({
        message: 'Permission Verified! Decrypted document is ready for download.',
        fileName: result.fileName,
        fileBase64: result.fileBase64,
        arrayBuffer: result.arrayBuffer,
        mimeType: result.mimeType
      });
      await loadData();
    } catch (err) {
      setDecryptionError(err.message || 'Decryption failed.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownloadDecrypted = () => {
    if (!decryptionSuccess) return;
    try {
      let blob;
      if (decryptionSuccess.arrayBuffer) {
        blob = new Blob([decryptionSuccess.arrayBuffer], { type: decryptionSuccess.mimeType });
      } else if (decryptionSuccess.fileBase64) {
        const byteCharacters = atob(decryptionSuccess.fileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: decryptionSuccess.mimeType });
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = decryptionSuccess.fileName || 'decrypted_document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Download error: ' + err.message);
    }
  };

  const handleSimulateTamper = async (docId) => {
    if (!window.confirm('Simulate Tampering: This will flip 1 byte in the stored AES-256-GCM ciphertext to test whether the system detects tampering. Proceed?')) return;
    try {
      await apiSimulateTamper(docId);
      alert('Tampering simulated! Now click "Verify Integrity" on this document to observe the cryptographic failure.');
      await loadData();
    } catch (err) {
      alert('Tamper simulation error: ' + err.message);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to permanently purge this encrypted document?')) return;
    try {
      await apiDeleteEncryptedDocument(docId);
      await loadData();
    } catch (err) {
      alert('Error purging document: ' + err.message);
    }
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(''), 2000);
  };

  const filteredDocs = documents.filter(d => 
    d.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.sha256Hash?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP SECURITY ARCHITECTURE BANNER */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl relative overflow-hidden ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-700/40">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  AES-256-GCM Authenticated Encryption
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  SHA-256 Tamper Proof
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Zero-Knowledge Admin Lockout
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight">
                Secure Document Cryptography & Encrypted Vault
              </h2>
              <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Every uploaded exam paper, answer key, and confidential document is automatically encrypted with <strong>AES-256-GCM</strong> and fingerprinted with <strong>SHA-256</strong>. Only ciphertext is stored. Administrators are locked out under Zero-Knowledge Confidentiality Policy.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Vault</span>
          </button>
        </div>

        {/* 5 Core Cryptographic Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 text-xs">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-sky-400 font-bold block mb-1">🔐 1. AES-256-GCM</span>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Military-grade symmetric encryption with 128-bit authentication tags and 96-bit random IVs.
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-emerald-400 font-bold block mb-1">🛡️ 2. SHA-256 Fingerprint</span>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Unique 64-character hash guarantees document integrity and detects any bit modification.
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-amber-400 font-bold block mb-1">🚫 3. Zero-Knowledge Admin</span>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Admins upload and monitor documents but cannot preview, read, or download plaintext files.
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-indigo-400 font-bold block mb-1">🔑 4. Isolated Server Key</span>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Encryption keys stored securely in server vault, completely isolated from documents.
            </p>
          </div>
        </div>
      </div>

      {/* 2. AUTOMATIC ENCRYPTION UPLOAD DROPZONE */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-lg ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-black text-lg sm:text-xl">
              Upload Document or Bank Solution Question Bank Template for AES-256-GCM Encryption
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Accepts Bank Solution Question Bank Templates (.xlsx, .xls, .csv), PDF, DOCX, TXT, JSON, and ZIP. Every document is hashed with SHA-256 and encrypted before storing. Admin preview & download are completely disabled.
            </p>
          </div>
        </div>

        <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          isUploading
            ? 'border-sky-500 bg-sky-500/5'
            : isDark
              ? 'border-slate-700 hover:border-sky-500 bg-slate-950/40 hover:bg-slate-950/80'
              : 'border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50'
        }`}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.json,.zip,.png,.jpg"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <FileUp className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <div className="text-center">
            <strong className="block text-sm font-bold">
              {isUploading ? 'Encrypting & Storing Document...' : 'Click to select or drag document to encrypt'}
            </strong>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Files are immediately hashed (SHA-256) and encrypted (AES-256-GCM). Plaintext is never saved.
            </span>
          </div>
        </label>

        {uploadStatus && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* 3. ENCRYPTED DOCUMENTS TABLE & REPOSITORY */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-lg space-y-5 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-black text-lg sm:text-xl">
              Encrypted Document Vault Records ({filteredDocs.length})
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              All records below are stored as encrypted ciphertext with corresponding SHA-256 checksums.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name or SHA-256..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
              }`}
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center text-xs ${
            isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            No encrypted documents found in vault. Upload a document above to encrypt and secure it.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredDocs.map((doc) => {
              const isVerifying = verifyingDocId === doc.id;
              const hasVerification = verificationResult && verificationResult.docId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                    isDark ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-bold text-slate-100 dark:text-white">
                            {doc.fileName}
                          </strong>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            {doc.encryptionAlgorithm || 'AES-256-GCM'}
                          </span>
                          {(doc.category === 'BANK_SOLUTION_QUESTION_TEMPLATE' || (doc.fileName && (doc.fileName.toLowerCase().includes('solution') || doc.fileName.toLowerCase().includes('template') || doc.fileName.toLowerCase().includes('bank')))) && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              Bank Solution Template
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {(doc.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Zero Knowledge Protection Badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                        <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Zero-Knowledge Locked</span>
                      </span>
                    </div>
                  </div>

                  {/* SHA-256 Fingerprint Display */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-emerald-400 font-bold uppercase text-[10px] shrink-0">SHA-256:</span>
                      <span className="truncate text-slate-300 select-all" title={doc.sha256Hash}>
                        {doc.sha256Hash}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyHash(doc.sha256Hash)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedHash === doc.sha256Hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash === doc.sha256Hash ? 'Copied' : 'Copy Hash'}</span>
                    </button>
                  </div>

                  {/* Integrity Verification Result Banner (if run) */}
                  {hasVerification && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                      verificationResult.authentic
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}>
                      {verificationResult.authentic ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Verified Authentic ✓</strong> AES-256-GCM authentication tag and SHA-256 hash match 100%. No tampering detected.
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            <strong>TAMPER DETECTED ⚠️</strong> Cryptographic hash verification failed! Ciphertext has been modified or corrupted.
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions Bar: Spec 4, 5, 7, 10 */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Spec 7: Verify Integrity Button */}
                      <button
                        type="button"
                        onClick={() => handleVerifyIntegrity(doc.id)}
                        disabled={isVerifying}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Cryptographically verify SHA-256 and GCM auth tag"
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                        <span>{isVerifying ? 'Verifying...' : 'Verify Integrity'}</span>
                      </button>

                      {/* Spec 4: Admin Preview/Read Locked Button */}
                      <button
                        type="button"
                        onClick={() => {
                          alert('403 Forbidden (Zero-Knowledge Admin Lockout): Under University Confidentiality Policy, Administrators are strictly prohibited from previewing, opening, reading, or downloading uploaded examination documents. Decryption requires authorized proctor credentials.');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                        title="Admin preview strictly blocked under Zero-Knowledge rule"
                      >
                        <Ban className="w-3.5 h-3.5 text-slate-500" />
                        <span>Admin Preview Locked</span>
                      </button>

                      {/* Spec 5: Authorized Decryption Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDecryptionDoc(doc);
                          setDecryptionPasskey('');
                          setDecryptionError('');
                          setDecryptionSuccess(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Authorized Proctor Decryption Access"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                        <span>Authorized Decrypt</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Spec 10: Simulate Tamper Test */}
                      <button
                        type="button"
                        onClick={() => handleSimulateTamper(doc.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer"
                        title="Simulate 1-byte tamper to test cryptographic detection"
                      >
                        Simulate Tamper
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete encrypted document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SECURITY & CRYPTOGRAPHIC AUDIT LOGS */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-lg space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-lg sm:text-xl">
              Cryptographic Security & Tamper Audit Trail ({securityLogs.length})
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Immutable log of every document upload, AES-256-GCM encryption, integrity check, and lockout event.
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {securityLogs.length === 0 ? (
            <div className={`p-4 rounded-xl text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              No security audit events recorded yet.
            </div>
          ) : (
            securityLogs.map((log) => {
              const isAlert = log.type.includes('ALERT') || log.type.includes('BLOCKED');
              const isSuccess = log.type.includes('PASSED') || log.type.includes('GRANTED') || log.type.includes('STORED');

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    isAlert
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : isSuccess
                        ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isAlert
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}>
                      {log.type}
                    </span>
                    {log.docName && (
                      <strong className="font-bold text-slate-100">{log.docName}</strong>
                    )}
                    <span className="text-slate-300">{log.details}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. AUTHORIZED USER DECRYPTION MODAL DIALOG */}
      {activeDecryptionDoc && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl p-6 sm:p-7 bg-[#0b1120] border-2 border-slate-700 shadow-2xl text-white relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-base">Authorized Decryption</h4>
                  <span className="text-xs text-slate-400 font-mono truncate block max-w-xs">
                    {activeDecryptionDoc.fileName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDecryptionDoc(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttemptDecryption} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Select Access Role:</label>
                <select
                  value={decryptionRole}
                  onChange={(e) => setDecryptionRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-sky-500"
                >
                  <option value="ADMIN">ADMIN (Zero-Knowledge Lockout Mode)</option>
                  <option value="CHIEF_PROCTOR">CHIEF_PROCTOR (Authorized Role)</option>
                  <option value="EXAM_CONTROLLER">EXAM_CONTROLLER (Authorized Role)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Note: If role is ADMIN, zero-knowledge security rule will strictly block decryption.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Authorized Proctor Secret Passkey:
                </label>
                <input
                  type="password"
                  value={decryptionPasskey}
                  onChange={(e) => setDecryptionPasskey(e.target.value)}
                  placeholder="Enter proctor passkey (e.g. PROCTOR-PASSKEY-2026)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {decryptionError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{decryptionError}</span>
                </div>
              )}

              {decryptionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">{decryptionSuccess.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadDecrypted}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download Decrypted Document</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDecryptionDoc(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDecrypting}
                  className="w-1/2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-sky-600/30"
                >
                  {isDecrypting ? 'Verifying...' : 'Verify & Decrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
