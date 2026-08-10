import React, { useState } from 'react';
import { BirthRecord } from '../types';

interface FamilyPortalProps {
  records: BirthRecord[];
  onOpenCertificateModal: (record: BirthRecord) => void;
  onOpenZkModal: (record: BirthRecord) => void;
}

export const FamilyPortal: React.FC<FamilyPortalProps> = ({
  records,
  onOpenCertificateModal,
  onOpenZkModal
}) => {
  const [searchQuery, setSearchQuery] = useState('NAT-88392019');
  const [selectedRecord, setSelectedRecord] = useState<BirthRecord | null>(() => {
    return records.find(r => r.motherNationalId === 'NAT-88392019') || records[0] || null;
  });
  const [hasSearched, setHasSearched] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const q = searchQuery.trim().toLowerCase();
    const found = records.find(r => 
      r.motherNationalId.toLowerCase() === q ||
      r.id.toLowerCase() === q ||
      r.childTempId.toLowerCase() === q ||
      (r.fatherNationalId && r.fatherNationalId.toLowerCase() === q)
    );
    setSelectedRecord(found || null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
              CITIZEN & FAMILY DIGITAL PORTAL
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Official Birth Certificate Lookup & Wallet
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Access your newborn's cryptographically secured, tamper-proof birth certificate. Export official PDF or store on your mobile digital ID wallet.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <input
              type="text"
              required
              placeholder="Enter Mother National ID (e.g. NAT-88392019) or Reg ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            Search Certificate
          </button>
        </form>

        {/* Quick Sample Chips */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Try quick sample:</span>
          {records.slice(0, 3).map(r => (
            <button
              key={r.id}
              onClick={() => {
                setSearchQuery(r.motherNationalId);
                setSelectedRecord(r);
                setHasSearched(true);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              {r.motherNationalId} ({r.childFirstName})
            </button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      {!selectedRecord ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <h3 className="text-lg font-bold text-slate-200">No Birth Certificate Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No record matched the National ID or Registration ID "{searchQuery}". Please verify the mother's National Identity Number with the hospital.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">
                {selectedRecord.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                selectedRecord.status === 'Sealed_On_Chain'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {selectedRecord.status === 'Sealed_On_Chain' ? 'GOVERNMENT SEALED' : 'PENDING REGISTRAR SEAL'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenCertificateModal(selectedRecord)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                Download PDF / Print Official Certificate
              </button>

              <button
                onClick={() => onOpenZkModal(selectedRecord)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                View ZK Proof
              </button>
            </div>
          </div>

          {/* Certificate Card Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="border-4 border-slate-800 p-6 rounded-xl bg-slate-950 relative">
              {/* Header */}
              <div className="text-center border-b border-slate-800 pb-6 mb-6">
                <h3 className="text-2xl font-serif font-bold text-white tracking-wide uppercase">
                  State Civil Registration Office
                </h3>
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest mt-1">
                  OFFICIAL DECENTRALIZED DIGITAL BIRTH CERTIFICATE
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Secured by BIRTH-CHAIN Dual-Key Consensus & ZK-SNARK Architecture
                </p>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-800/80 pb-1">
                    Child Registration Details
                  </h4>
                  <div className="space-y-2 text-sm text-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Full Name:</span>
                      <strong className="text-white text-base font-semibold">{selectedRecord.childFirstName} {selectedRecord.childLastName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Date of Birth:</span>
                      <span className="font-mono">{new Date(selectedRecord.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} ({selectedRecord.timeOfBirth})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Place of Birth:</span>
                      <span>{selectedRecord.facilityName} ({selectedRecord.placeOfBirth.replace('_', ' ')})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Biological Sex:</span>
                      <span>{selectedRecord.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Weight & Gestation:</span>
                      <span>{selectedRecord.birthWeightGrams}g ({(selectedRecord.birthWeightGrams / 1000).toFixed(2)} kg) • {selectedRecord.gestationalAgeWeeks} Weeks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">APGAR Score:</span>
                      <span className="font-mono font-bold text-emerald-400">{selectedRecord.apgar1Min} (1 min) / {selectedRecord.apgar5Min} (5 min)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-800/80 pb-1">
                    Parental & Attestation Details
                  </h4>
                  <div className="space-y-2 text-sm text-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Mother's Name:</span>
                      <strong className="text-white">{selectedRecord.motherLegalName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Mother National ID:</span>
                      <span className="font-mono font-bold text-indigo-300">{selectedRecord.motherNationalId}</span>
                    </div>
                    {selectedRecord.fatherLegalName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs">Father's Name:</span>
                        <span>{selectedRecord.fatherLegalName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Attending Physician:</span>
                      <span>{selectedRecord.attendingPhysicianName} ({selectedRecord.attendingPhysicianLicense})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Hospital Node ID:</span>
                      <span className="font-mono">{selectedRecord.facilityId}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Proof Bar */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">ZERO-KNOWLEDGE BIRTH HASH (DEBICEL ANCHOR)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-blue-300 font-bold truncate">{selectedRecord.zkProof.birthHash}</span>
                    <button
                      onClick={() => copyToClipboard(selectedRecord.zkProof.birthHash)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Copy Birth Hash"
                    >
                      {copiedHash ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">IPFS AES-256 PII PAYLOAD CID</span>
                  <span className="text-emerald-300 font-mono block truncate mt-1">{selectedRecord.ipfsCid}</span>
                </div>
              </div>

              {/* Digital Wallet Badge Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Compatible with W3C Verifiable Credentials & Government Digital Wallet</span>
                </div>

                <div className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  IMMUTABLE DECENTRALIZED LEDGER
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
