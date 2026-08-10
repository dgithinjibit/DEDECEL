import React, { useState } from 'react';
import { DeathCertificate, UserPersona } from '../../types';
import { CryptoEngine } from '../../services/cryptoEngine';
import { NearAnchorBadge } from '../NearAnchorBadge';
import { AnchorOutcome } from '../../services/deathRegistry';

interface RegistrarDashboardProps {
  persona: UserPersona;
  certificates: DeathCertificate[];
  onApproveCertificate: (cert: DeathCertificate) => void;
  onRevokeCertificate: (cert: DeathCertificate, reason: string) => void;
  onOpenExplorer: () => void;
  /** Task #3: NEAR anchoring result per cert id, for the on-chain / NearBlocks badge. */
  anchorOutcomes?: Record<string, AnchorOutcome>;
}

export const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({
  persona,
  certificates,
  onApproveCertificate,
  onRevokeCertificate,
  onOpenExplorer,
  anchorOutcomes = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCert, setSelectedCert] = useState<DeathCertificate | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const pendingCerts = certificates.filter(c => c.status === 'SIGNED_MEDICAL' || c.status === 'AMENDED');
  const sealedCerts = certificates.filter(c => c.status === 'SEALED_ONCHAIN');
  const revokedCerts = certificates.filter(c => c.status === 'REVOKED');

  const filteredCerts = certificates.filter(c => 
    c.deceasedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nationalId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = (cert: DeathCertificate) => {
    onApproveCertificate(cert);
    // The real anchoring result (on-chain tx vs off-chain placeholder) is shown by the
    // NearAnchorBadge on the sealed card + the app-level result panel — no over-claiming alert.
    setSelectedCert(null);
  };

  const handleRevoke = (cert: DeathCertificate) => {
    if (!revocationReason) {
      alert('Please enter a reason for revocation/audit.');
      return;
    }
    onRevokeCertificate(cert, revocationReason);
    alert(`Certificate #${cert.id} status set to REVOKED on smart contract.`);
    setShowRevokeModal(false);
    setSelectedCert(null);
    setRevocationReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-sm">
            REG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Civil Registrar & National Seal Authority</h1>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Government Node
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <strong className="text-slate-200">{persona.name}</strong> • Authority ID: <code className="text-cyan-400">{persona.licenseOrId}</code>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Pending Approval</p>
            <p className="text-lg font-bold text-amber-300">{pendingCerts.length}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">On-Chain Sealed</p>
            <p className="text-lg font-bold text-emerald-300">{sealedCerts.length}</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Revoked</p>
            <p className="text-lg font-bold text-rose-300">{revokedCerts.length}</p>
          </div>
        </div>
      </div>

      {/* Main Approval Grid & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Government Death Registration Verification Queue</h2>
            <p className="text-xs text-slate-400">Review medical sign-offs and issue official state death certificates.</p>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by Name, ID, Cert #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
        </div>

        {/* Certificate Cards List */}
        {filteredCerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No death certificate records found matching search query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCerts.map((cert) => {
              const isPending = cert.status === 'SIGNED_MEDICAL' || cert.status === 'AMENDED';
              const isSealed = cert.status === 'SEALED_ONCHAIN';
              const isRevoked = cert.status === 'REVOKED';

              return (
                <div 
                  key={cert.id} 
                  className={`bg-slate-950/80 border rounded-2xl p-5 space-y-4 transition relative ${
                    isPending 
                      ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' 
                      : isSealed 
                      ? 'border-emerald-500/30' 
                      : 'border-rose-500/30 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        #{cert.id}
                      </span>
                      <h3 className="font-bold text-white text-base mt-1">
                        {cert.firstName ? [cert.firstName, cert.secondName, cert.lastName].filter(Boolean).join(' ') : cert.deceasedName}
                      </h3>
                      <p className="text-xs text-slate-400">National ID: <span className="font-mono text-slate-300">{cert.nationalId}</span></p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      isSealed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {cert.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <p className="text-[10px] text-slate-500">Date of Death</p>
                      <p className="font-medium text-slate-200">{cert.dateOfDeath} ({cert.ageAtDeath} yrs)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Attending MD</p>
                      <p className="font-medium text-slate-200 truncate">{cert.attendingPhysicianName}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500">Diagnosed ICD-10 Cause</p>
                      <p className="font-medium text-cyan-300 truncate">{cert.causeOfDeathICD10}</p>
                    </div>
                  </div>

                  {/* Verification Badges */}
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span>MD Signature: Verified ({cert.physicianSignatureHash?.substring(0, 16)}...)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span>ZK Proof: {cert.zeroKnowledgeProof.substring(0, 20)}...</span>
                    </div>
                  </div>

                  {/* Task #3: real NEAR anchoring status + NearBlocks link (sealed certs). */}
                  {isSealed && (
                    <div className="pt-2 border-t border-slate-800">
                      <NearAnchorBadge txId={anchorOutcomes[cert.id]?.txId ?? null} compact />
                    </div>
                  )}

                  {/* Smart Contract Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(cert)}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold py-2 rounded-none text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                        >
                          <span>Apply On-Chain State Seal</span>
                        </button>
                        <button
                          onClick={() => { setSelectedCert(cert); setShowRevokeModal(true); }}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-2 rounded-none text-xs font-medium transition"
                        >
                          Revoke
                        </button>
                      </>
                    )}

                    {isSealed && (
                      <div className="w-full flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-1 font-semibold">
                          Official State Seal Active
                        </span>
                        <button
                          onClick={onOpenExplorer}
                          className="text-cyan-400 hover:underline text-[11px] flex items-center gap-1"
                        >
                          <span>Block #{cert.blockNumber} ›</span>
                        </button>
                      </div>
                    )}

                    {isRevoked && (
                      <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                        Revoked by Judicial/Registrar Order
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && selectedCert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Revoke Certificate #{selectedCert.id}</span>
            </h3>

            <p className="text-xs text-slate-300">
              Revoking a certificate triggers an on-chain smart contract event marking this certificate invalid for legal probate or insurance claims.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Reason for Revocation *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Erroneous identity reported, duplicate record, or ongoing judicial investigation."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(selectedCert)}
                className="px-4 py-2 rounded-none bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Confirm On-Chain Revocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
