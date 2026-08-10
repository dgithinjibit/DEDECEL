import React, { useState } from 'react';
import { BirthRecord } from '../types';

interface RegistrarPortalProps {
  records: BirthRecord[];
  onSealRecord: (recordId: string, registrarName: string, sealId: string) => Promise<void>;
  onRejectRecord?: (recordId: string, reason: string) => void;
  onOpenCertificateModal: (record: BirthRecord) => void;
  onOpenZkModal: (record: BirthRecord) => void;
}

export const RegistrarPortal: React.FC<RegistrarPortalProps> = ({
  records,
  onSealRecord,
  onRejectRecord,
  onOpenCertificateModal,
  onOpenZkModal
}) => {
  const [registrarName, setRegistrarName] = useState('Hon. Marcus Vance, Chief Registrar');
  const [sealId, setSealId] = useState('SEAL-NY-CIVIL-9012');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'pending' | 'sealed' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSealing, setIsSealing] = useState(false);

  const pendingRecords = records.filter(r => r.status === 'Pending_Registrar_Seal');
  const sealedRecords = records.filter(r => r.status === 'Sealed_On_Chain');

  const displayedRecords = records.filter(r => {
    if (filterTab === 'pending' && r.status !== 'Pending_Registrar_Seal') return false;
    if (filterTab === 'sealed' && r.status !== 'Sealed_On_Chain') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.childTempId.toLowerCase().includes(q) ||
        r.childLastName.toLowerCase().includes(q) ||
        r.motherNationalId.toLowerCase().includes(q) ||
        r.facilityName.toLowerCase().includes(q) ||
        r.zkProof.birthHash.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSeal = async (recordId: string) => {
    setSelectedRecordId(recordId);
    setIsSealing(true);
    try {
      await onSealRecord(recordId, registrarName, sealId);
    } catch (err) {
      console.error(err);
      alert('Error affixing government seal.');
    } finally {
      setIsSealing(false);
      setSelectedRecordId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-medium border border-amber-500/30">
                CIVIL REGISTRAR GENERAL SEALS
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Government Approval & Blockchain Block Minter
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Review medical dual signatures, verify ZK-SNARK hashes, and affix the State Civil Seal to lock birth records on-chain.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block">PENDING REVIEWS</span>
              <span className="text-amber-400 text-lg font-bold">{pendingRecords.length} Records</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-500 block">ON-CHAIN SEALED</span>
              <span className="text-emerald-400 text-lg font-bold">{sealedRecords.length} Sealed</span>
            </div>
          </div>
        </div>

        {/* Registrar Credentials Input */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Active Registrar Name
            </label>
            <input
              type="text"
              value={registrarName}
              onChange={e => setRegistrarName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Government Seal Serial ID
            </label>
            <input
              type="text"
              value={sealId}
              onChange={e => setSealId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Seal ({pendingRecords.length})
          </button>
          <button
            onClick={() => setFilterTab('sealed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterTab === 'sealed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sealed On-Chain ({sealedRecords.length})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Records ({records.length})
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Search Reg ID, Mother NIN, Name, Hash..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Records Grid */}
      {displayedRecords.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <p className="text-base font-semibold text-slate-300">No birth records found matching this filter.</p>
          <p className="text-xs text-slate-500 mt-1">All pending registrations have been processed or search query yielded no results.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRecords.map(record => {
            const isPending = record.status === 'Pending_Registrar_Seal';
            const isSealed = record.status === 'Sealed_On_Chain';

            return (
              <div
                key={record.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md ${
                  isPending
                    ? 'border-amber-500/40 hover:border-amber-500'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-base font-bold text-white">
                        {record.id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Temp: {record.childTempId}
                      </span>
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-medium border border-amber-500/30 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                          PENDING REGISTRAR SEAL
                        </span>
                      )}
                      {isSealed && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30 flex items-center gap-1">
                          SEALED ON BLOCKCHAIN
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-slate-100">
                      Child: {record.childFirstName} {record.childLastName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Born: {new Date(record.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {record.timeOfBirth} • {record.gender} • {record.birthWeightGrams}g
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpenZkModal(record)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                    >
                      Verify ZK Proof
                    </button>

                    <button
                      onClick={() => onOpenCertificateModal(record)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                    >
                      Certificate Preview
                    </button>

                    {isPending && (
                      <button
                        onClick={() => handleSeal(record.id)}
                        disabled={isSealing && selectedRecordId === record.id}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        {isSealing && selectedRecordId === record.id ? 'MINTING BLOCK...' : 'AFFIX SEAL & MINT BLOCK'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Technical Dual Key Verification Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">MOTHER NATIONAL ID</span>
                    <span className="text-indigo-300 font-bold">{record.motherNationalId}</span>
                    <span className="text-slate-400 block text-[11px] truncate">{record.motherLegalName}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">DUAL KEY ATTESTATION</span>
                    <div className="flex items-center gap-2 text-emerald-400 font-medium text-[11px]">
                      <span>Doctor + Hospital Node Signed</span>
                    </div>
                    <span className="text-slate-500 block text-[10px] truncate mt-0.5">
                      Doc: {record.attendingPhysicianLicense}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">ZERO-KNOWLEDGE HASH</span>
                    <span className="text-blue-300 font-bold block truncate">{record.zkProof.birthHash}</span>
                    <span className="text-slate-500 block text-[10px]">Groth16 SNARK Proof Verified</span>
                  </div>
                </div>

                {/* Blockchain Seal Badge if Sealed */}
                {isSealed && record.blockchain && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3 rounded-xl border border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-emerald-300">
                    <div className="flex items-center gap-2">
                      <span>Block #{record.blockchain.blockNumber}</span>
                      <span className="text-slate-600">•</span>
                      <span>Hash: {record.blockchain.blockHash.slice(0, 18)}...</span>
                    </div>
                    <div>
                      Seal: <strong className="text-white">{record.blockchain.registrarSealId}</strong> ({record.blockchain.registrarName})
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
