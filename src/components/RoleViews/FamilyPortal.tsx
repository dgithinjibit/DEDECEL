import React, { useState } from 'react';
import { DeathCertificate, UserPersona } from '../../types';

interface FamilyPortalProps {
  persona: UserPersona;
  certificates: DeathCertificate[];
  onOpenPdfModal: (cert: DeathCertificate) => void;
}

export const FamilyPortal: React.FC<FamilyPortalProps> = ({
  persona,
  certificates,
  onOpenPdfModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [foundCert, setFoundCert] = useState<DeathCertificate | null>(null);
  const [delegatedAgency, setDelegatedAgency] = useState('');
  const [isDelegatedSuccess, setIsDelegatedSuccess] = useState(false);

  // Key Shard Recovery Simulation state
  const [showKeyShardModal, setShowKeyShardModal] = useState(false);
  const [shard1, setShard1] = useState('');
  const [shard2, setShard2] = useState('');
  const [recoveredKey, setRecoveredKey] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);

  const executeFamilySearch = (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);

    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const match = certificates.find(c => 
        c.id.toLowerCase() === q ||
        c.nationalId.toLowerCase() === q ||
        c.deceasedName.toLowerCase().includes(q) ||
        (c.firstName && c.firstName.toLowerCase().includes(q)) ||
        (c.secondName && c.secondName.toLowerCase().includes(q)) ||
        (c.lastName && c.lastName.toLowerCase().includes(q))
      );

      setIsSearching(false);
      if (match) {
        setFoundCert(match);
      } else {
        alert('No certified death record found for this Query/ID. Please verify the Certificate ID or National ID.');
        setFoundCert(null);
      }
    }, 500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeFamilySearch(searchQuery);
  };

  const handleDelegateAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatedAgency) return;
    setIsDelegatedSuccess(true);
    setTimeout(() => setIsDelegatedSuccess(false), 4000);
  };

  const handleRecoverKeyShard = () => {
    if (!shard1 || !shard2) {
      alert('Please provide at least 2 key shards (e.g. Hospital Shard & Civil Registrar Escrow Shard).');
      return;
    }
    const simulatedKey = `RECOVERED_KEY_SHARD_MATCH_${foundCert ? foundCert.id : '2026'}`;
    setRecoveredKey(simulatedKey);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-sm">
            FAM
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Family & Designated Kin Digital Service Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <strong className="text-slate-200">{persona.name}</strong> • Request official sealed death certificates & grant probate access.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowKeyShardModal(true)}
          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-4 py-2 rounded-none text-xs font-semibold transition flex items-center gap-2"
        >
          <span>Key Recovery Escrow (Shamir Shards)</span>
        </button>
      </div>

      {/* Record Lookup Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Search Official Deceased Family Record</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              required
              placeholder="Enter Certificate ID (e.g. CERT-2026-GENESIS-001) or Deceased Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 disabled:opacity-80 text-slate-950 font-bold px-6 py-2.5 rounded-none text-xs transition shadow-lg shadow-cyan-500/20 shrink-0 flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <span>Locating Record…</span>
            ) : (
              <span>Locate Record</span>
            )}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Sample Records:</span>
          {certificates.slice(0, 3).map((c) => (
            <button
              key={c.id}
              disabled={isSearching}
              onClick={() => { setSearchQuery(c.id); executeFamilySearch(c.id); }}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 px-2.5 py-1 rounded-none font-mono text-[11px] border border-slate-700 transition"
            >
              {c.id} ({c.firstName ? [c.firstName, c.secondName, c.lastName].filter(Boolean).join(' ') : c.deceasedName})
            </button>
          ))}
        </div>
      </div>

      {/* Certificate Details Result */}
      {isSearching ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3">
          <p className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
            Matching Cryptographic Fingerprints On Ledger...
          </p>
          <div className="w-32 h-1 bg-slate-800 mx-auto relative overflow-hidden">
            <div className="w-full h-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
      ) : foundCert ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold text-xs bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                  #{foundCert.id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  foundCert.status === 'SEALED_ONCHAIN' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {foundCert.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-2">
                {foundCert.firstName ? [foundCert.firstName, foundCert.secondName, foundCert.lastName].filter(Boolean).join(' ') : foundCert.deceasedName}
              </h2>
              <p className="text-xs text-slate-400">National ID: <span className="font-mono text-slate-200">{foundCert.nationalId}</span></p>
            </div>

            <button
              onClick={() => onOpenPdfModal(foundCert)}
              className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-5 py-2.5 rounded-none text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <span>Download Official Sealed Certificate (PDF)</span>
            </button>
          </div>

          {/* Certificate Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Date & Time of Death</p>
              <p className="text-sm font-bold text-white mt-1">{foundCert.dateOfDeath} at {foundCert.timeOfDeath}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Age at Death: {foundCert.ageAtDeath} years</p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Place of Death</p>
              <p className="text-sm font-bold text-white mt-1 truncate">{foundCert.placeOfDeath}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{foundCert.hospitalOrg}</p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Diagnosed Medical Cause</p>
              <p className="text-sm font-bold text-cyan-300 mt-1 truncate">{foundCert.causeOfDeathICD10}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Manner: {foundCert.causeCategory}</p>
            </div>
          </div>

          {/* Cryptographic Proofs */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Blockchain Tx Hash:</span>
              <span className="text-cyan-400 truncate max-w-xs">{foundCert.blockchainTxHash || 'Pending'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Encrypted IPFS CID:</span>
              <span className="text-slate-300 truncate max-w-xs">{foundCert.ipfsCid}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>ZK-SNARK Verification Proof:</span>
              <span className="text-emerald-400 truncate max-w-xs">{foundCert.zeroKnowledgeProof}</span>
            </div>
          </div>

          {/* Probate & Insurance Access Delegation Tool */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Grant Temporary Verification Access to Insurance / Bank / Probate Attorney
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              Generate a Zero-Knowledge Access Key allowing designated institutions to verify this death certificate without disclosing confidential medical diagnosis.
            </p>

            <form onSubmit={handleDelegateAccess} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                required
                placeholder="Institution Name (e.g. Aegis Life Assurance / High Court Probate)"
                value={delegatedAgency}
                onChange={(e) => setDelegatedAgency(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-none text-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Issue Temporal ZK Access Key</span>
              </button>
            </form>

            {isDelegatedSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <span>Temporary ZK Access Key successfully issued to {delegatedAgency}! Valid for 30 days.</span>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          Use the search bar above to query deceased relative records or test with a sample certificate ID.
        </div>
      )}

      {/* Key Recovery Escrow Modal */}
      {showKeyShardModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Shamir\'s Secret Key Recovery (2-of-3 Shards)</span>
              </h3>
              <button onClick={() => setShowKeyShardModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              If the primary family access key was lost, provide 2 out of 3 authorized key shards (e.g. Hospital Medical Escrow Shard + Civil Registrar Escrow Shard) to re-synthesize access.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Shard #1 (Medical Facility Escrow)</label>
                <input
                  type="text"
                  placeholder="e.g. SHARD-MED-889102"
                  value={shard1}
                  onChange={(e) => setShard1(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Shard #2 (Civil Registrar Escrow)</label>
                <input
                  type="text"
                  placeholder="e.g. SHARD-REGISTRAR-449102"
                  value={shard2}
                  onChange={(e) => setShard2(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleRecoverKeyShard}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-none text-xs transition"
              >
                Re-synthesize Access Key
              </button>

              {recoveredKey && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    Key Re-synthesized Successfully!
                  </p>
                  <p className="font-mono text-[11px] text-cyan-300">{recoveredKey}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
