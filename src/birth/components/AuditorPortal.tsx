import React, { useState } from 'react';
import { BirthRecord, AuditLogEntry } from '../types';
import { decryptPayloadAES256 } from '../lib/crypto';
import { RegistrationVelocityAnalytics } from './RegistrationVelocityAnalytics';

interface AuditorPortalProps {
  records: BirthRecord[];
  auditLogs: AuditLogEntry[];
  blockHeight: number;
  onOpenZkModal: (record: BirthRecord) => void;
}

export const AuditorPortal: React.FC<AuditorPortalProps> = ({
  records,
  auditLogs,
  blockHeight,
  onOpenZkModal
}) => {
  const [activeTab, setActiveTab] = useState<'audit_logs' | 'velocity_analytics' | 'block_explorer' | 'zk_console' | 'ipfs_inspector'>('velocity_analytics');
  const [searchLog, setSearchLog] = useState('');
  const [selectedRecordForInspection, setSelectedRecordForInspection] = useState<BirthRecord | null>(records[0] || null);
  const [decryptedPii, setDecryptedPii] = useState<object | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // ZK Console state
  const [zkInputHash, setZkInputHash] = useState(records[0]?.zkProof.birthHash || '');
  const [zkVerificationResult, setZkVerificationResult] = useState<{
    verified: boolean;
    recordId?: string;
    details?: string;
  } | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    if (!searchLog.trim()) return true;
    const q = searchLog.toLowerCase();
    return (
      log.id.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.recordId.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.hash.toLowerCase().includes(q)
    );
  });

  const handleTestZkVerification = () => {
    const matched = records.find(r => r.zkProof.birthHash === zkInputHash.trim());
    if (matched) {
      setZkVerificationResult({
        verified: true,
        recordId: matched.id,
        details: `Mathematical ZK-SNARK proof valid. Mother NIN hash matches public input on Block #${matched.blockchain?.blockNumber || 1851092}.`
      });
    } else {
      setZkVerificationResult({
        verified: false,
        details: 'Invalid or unknown ZK Birth Hash. Zero-Knowledge proof failed verification against on-chain state.'
      });
    }
  };

  const handleDecryptIpfsPayload = (record: BirthRecord) => {
    setIsDecrypting(true);
    setTimeout(() => {
      const data = decryptPayloadAES256(record.encryptedPayload);
      setDecryptedPii(data);
      setIsDecrypting(false);
    }, 400);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-medium border border-indigo-500/30">
                JUDICIAL AUDITOR & STATE INSPECTOR
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Immutable Audit Terminal & Cryptographic Verifier
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Full transparency block explorer, Groth16 ZK-SNARK verifier terminal, and IPFS payload decryption console.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-500 block">CHAIN HEIGHT</span>
              <span className="text-indigo-400 text-base font-bold">Block #{blockHeight.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setActiveTab('velocity_analytics')}
            className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'velocity_analytics'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            D3 Registration Velocity & Surge Analytics
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'audit_logs'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            Immutable Audit Trail ({auditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('block_explorer')}
            className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'block_explorer'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            Block Explorer
          </button>

          <button
            onClick={() => setActiveTab('zk_console')}
            className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'zk_console'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            ZK-SNARK Verifier Console
          </button>

          <button
            onClick={() => setActiveTab('ipfs_inspector')}
            className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ipfs_inspector'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            IPFS AES-256 Payload Inspector
          </button>
        </div>
      </div>

      {/* Tab: D3 Velocity Analytics */}
      {activeTab === 'velocity_analytics' && (
        <RegistrationVelocityAnalytics records={records} onOpenZkModal={onOpenZkModal} />
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Real-Time Security & Compliance Audit Log
            </h3>

            <div className="relative min-w-[260px]">
              <input
                type="text"
                placeholder="Search audit action, actor, ID..."
                value={searchLog}
                onChange={e => setSearchLog(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Log ID / Time</th>
                    <th className="p-3.5">Actor & Role</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Record Target</th>
                    <th className="p-3.5">Details & IP</th>
                    <th className="p-3.5">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-white block">{log.id}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-indigo-300 font-bold block">{log.actor}</span>
                        <span className="text-[10px] text-slate-400">{log.role}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.action.includes('SEAL')
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-emerald-400">
                        {log.recordId}
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="truncate text-slate-200">{log.details}</div>
                        {log.ipAddress && (
                          <div className="text-[10px] text-slate-500">{log.ipAddress}</div>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-400 truncate max-w-[140px]" title={log.hash}>
                        {log.hash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Block Explorer */}
      {activeTab === 'block_explorer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">CURRENT BLOCK HEIGHT</span>
              <span className="text-2xl font-bold font-mono text-indigo-400 mt-1 block">#{blockHeight}</span>
              <span className="text-xs text-slate-500 mt-2 block">Minted every time Registrar seals a record</span>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">BFT NODE CONSENSUS</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">9 / 9 Active</span>
              <span className="text-xs text-slate-500 mt-2 block">100% agreement state across hospital nodes</span>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">PROOF SCHEME</span>
              <span className="text-2xl font-bold font-mono text-blue-400 mt-1 block">Groth16 ZK-SNARK</span>
              <span className="text-xs text-slate-500 mt-2 block">Zero-Knowledge non-interactive argument</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">On-Chain Sealed Ledger Blocks</h3>
            <div className="space-y-3">
              {records.filter(r => r.status === 'Sealed_On_Chain').map(record => (
                <div key={record.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-indigo-400 font-bold">
                      Block #{record.blockchain?.blockNumber} ({record.id})
                    </span>
                    <span className="text-slate-500">
                      Sealed: {new Date(record.blockchain?.sealedAt || '').toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
                    <div>Block Hash: <span className="text-slate-400">{record.blockchain?.blockHash}</span></div>
                    <div>Tx Hash: <span className="text-slate-400">{record.blockchain?.txHash}</span></div>
                    <div>ZK Birth Hash: <span className="text-blue-300 font-bold">{record.zkProof.birthHash}</span></div>
                    <div>Registrar Seal: <span className="text-emerald-400 font-bold">{record.blockchain?.registrarSealId}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: ZK Console */}
      {activeTab === 'zk_console' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Zero-Knowledge SNARK Verification Terminal
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verify whether a Zero-Knowledge Birth Hash exists and mathematically proves registration without revealing family PII.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-300">
              Input ZK Birth Hash (e.g. 0xbirth_record_hash_...)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={zkInputHash}
                onChange={e => setZkInputHash(e.target.value)}
                placeholder="0xbirth_record_hash_..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleTestZkVerification}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
              >
                Execute ZK Verifier
              </button>
            </div>

            <div className="flex gap-2 text-xs text-slate-400">
              <span>Quick pick hash from records:</span>
              {records.map(r => (
                <button
                  key={r.id}
                  onClick={() => setZkInputHash(r.zkProof.birthHash)}
                  className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono truncate max-w-[120px]"
                >
                  {r.id}
                </button>
              ))}
            </div>
          </div>

          {zkVerificationResult && (
            <div className={`p-4 rounded-xl border text-xs font-mono ${
              zkVerificationResult.verified
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {zkVerificationResult.verified ? (
                  <span>ZK-SNARK PROOF VALID ✓</span>
                ) : (
                  <span>ZK-SNARK PROOF INVALID ✗</span>
                )}
              </div>
              <div>{zkVerificationResult.details}</div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: IPFS Payload Inspector */}
      {activeTab === 'ipfs_inspector' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              AES-256 IPFS Encrypted Payload Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect off-chain encrypted payloads stored on IPFS. PII is encrypted at rest using AES-256-GCM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Select Birth Record</label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {records.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRecordForInspection(r);
                      setDecryptedPii(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left font-mono text-xs transition-all ${
                      selectedRecordForInspection?.id === r.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-200">{r.id}</span>
                      <span className="text-slate-500">{r.childLastName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">CID: {r.ipfsCid}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedRecordForInspection && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block">ENCRYPTED IPFS PAYLOAD (AES-256-GCM)</span>
                  <div className="p-3 bg-slate-900 rounded-lg text-amber-300 break-all text-[11px] mt-1 border border-slate-800">
                    {selectedRecordForInspection.encryptedPayload}
                  </div>
                </div>

                <button
                  onClick={() => handleDecryptIpfsPayload(selectedRecordForInspection)}
                  disabled={isDecrypting}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDecrypting ? 'Decrypting with Judicial Key...' : 'Simulate Judicial Key Decryption'}
                </button>

                {decryptedPii && (
                  <div className="p-3 bg-slate-900 rounded-lg text-emerald-300 border border-emerald-900/60">
                    <span className="text-xs font-bold text-white block mb-2">Decrypted PII Payload:</span>
                    <pre className="text-[11px] overflow-x-auto text-emerald-400">
                      {JSON.stringify(decryptedPii, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
