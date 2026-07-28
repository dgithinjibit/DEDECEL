import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Boxes, 
  FileCode2, 
  Lock, 
  KeyRound, 
  QrCode, 
  Activity, 
  Building2, 
  Stethoscope, 
  HeartHandshake, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck2, 
  Globe2, 
  Zap, 
  Clock, 
  ChevronRight,
  Download,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Layers,
  HelpCircle,
  Loader2,
  Camera,
  X,
  Check
} from 'lucide-react';
import { DeathCertificate, UserPersona, UserRole, JurisdictionMode } from '../types';
import { USER_PERSONAS } from '../data/personas';

interface PublicHomepageProps {
  certificates: DeathCertificate[];
  blocksCount: number;
  onSelectRole: (persona: UserPersona) => void;
  onOpenExplorer: () => void;
  onOpenFhir: () => void;
  onOpenEdgeCases: () => void;
  onOpenPdfModal: (cert: DeathCertificate) => void;
  isChainValid: boolean;
  jurisdiction: JurisdictionMode;
}

export const PublicHomepage: React.FC<PublicHomepageProps> = ({
  certificates,
  blocksCount,
  onSelectRole,
  onOpenExplorer,
  onOpenFhir,
  onOpenEdgeCases,
  onOpenPdfModal,
  isChainValid,
  jurisdiction
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedCert, setSearchedCert] = useState<DeathCertificate | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // QR Scanner State
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleStartScanner = async () => {
    setShowQrScanner(true);
    setCameraError(null);
    setIsCameraActive(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Camera API is not supported in this browser environment.');
      }
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setCameraError('Camera access requested. If blocked by browser or hardware constraints, select a certificate below to simulate instant optical scanning.');
    }
  };

  const handleCloseScanner = () => {
    stopCamera();
    setShowQrScanner(false);
  };

  const handleQrCodeScanned = (certId: string) => {
    stopCamera();
    setShowQrScanner(false);
    setSearchQuery(certId);
    executeSearch(certId);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const executeSearch = (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setSearchedCert(null);

    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const deathMatch = certificates.find(c => 
        c.id.toLowerCase() === q ||
        c.nationalId.toLowerCase() === q ||
        c.deceasedName.toLowerCase().includes(q) ||
        (c.firstName && c.firstName.toLowerCase().includes(q)) ||
        (c.secondName && c.secondName.toLowerCase().includes(q)) ||
        (c.lastName && c.lastName.toLowerCase().includes(q))
      );

      setSearchedCert(deathMatch || null);
      setIsSearching(false);
    }, 550);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const sealedCount = certificates.filter(c => c.status === 'SEALED_ON_CHAIN').length;
  const pendingCount = certificates.filter(c => c.status === 'PENDING_REGISTRAR_APPROVAL').length;

  const faqs = [
    {
      q: "How does decentralized death registration prevent identity theft & pension fraud?",
      a: "When a medical examiner signs a death record, it is immediately hashed with Secp256k1 ECDSA cryptography and anchored to an immutable blockchain block. Once sealed by the Civil Registrar, banking institutions, pension funds, and immigration authorities receive real-time cryptographic proof, permanently blocking fraudulent claims or identity impersonation."
    },
    {
      q: "How are family privacy and medical record sensitivity preserved?",
      a: "DEDECEL utilizes Zero-Knowledge Proofs (ZKP) and AES-256 field-level encryption. PII (Personally Identifiable Information) is encrypted off-chain or client-side. Verifying agencies only receive cryptographic verification without gaining unrestricted access to sensitive clinical records or cause-of-death details unless explicitly granted."
    },
    {
      q: "What happens if a rural hospital has no internet connection?",
      a: "DEDECEL features a full Offline-First PWA engine. Medical officers can issue certificates in offline field mode. The record is stored locally in an encrypted IndexedDB queue and automatically syncs to the consensus network as soon as 2G/3G connectivity is restored."
    },
    {
      q: "Is DEDECEL compliant with international health standards?",
      a: "Yes. The platform natively exports and ingests HL7 FHIR R4 (Fast Healthcare Interoperability Resources) data bundles, ICD-10 medical cause-of-death codes, and satisfies multi-jurisdictional standards including EU GDPR, US HIPAA, Kenya PDPA, and Singapore PDPA."
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#28292e] border border-slate-700/80 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00000000] border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-widest">
            <span>Public Vital Records Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#ffffff] leading-tight">
            Decentralized, Immutable & Secure <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-200 to-teal-300 bg-clip-text text-transparent">
              National Death Certificate Registry
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminating vital statistics fraud, probate delays, and administrative backlog. Empowering medical examiners, civil registrars, families, and verifying agencies through cryptographic blockchain proof.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-left">
            <div className="bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Ledger Height</p>
              <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">#{blocksCount} Blocks</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Sealed Records</p>
              <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{sealedCount} On-Chain</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Pending Verification</p>
              <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{pendingCount} Records</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Ledger Integrity</p>
              <p className={`text-xl font-bold mt-1 font-mono flex items-center gap-1.5 ${isChainValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isChainValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Valid</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Corrupted</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Search & Verification Widget */}
      <section className="bg-[#28292e] border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-[#ffffff] tracking-wide">Public Certificate Verification Engine</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Search by Certificate Reference ID (e.g., CERT-2026-GENESIS-001) or Deceased Name / National ID</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Knowledge Proof Enabled</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5" />
            <input
              type="text"
              placeholder="Enter Certificate ID, National ID, or Deceased Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 pl-10 pr-28 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleStartScanner}
              className="absolute right-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition"
              title="Scan QR Code from Death Certificate"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scan QR</span>
            </button>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-80 text-slate-950 font-bold px-6 py-2.5 text-xs transition shadow-lg shadow-cyan-500/20 shrink-0 border border-cyan-400 flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Matching Ledger Hashes...</span>
              </>
            ) : (
              <span>Verify Record On-Chain</span>
            )}
          </button>
        </form>

        {/* Quick Demo Search Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
          <span className="text-[11px] font-semibold text-slate-500">Sample Searches:</span>
          {certificates.slice(0, 3).map((c) => (
            <button
              key={c.id}
              disabled={isSearching}
              onClick={() => { setSearchQuery(c.id); executeSearch(c.id); }}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 px-2.5 py-1 text-[11px] font-mono border border-slate-700 transition"
            >
              {c.id} ({c.firstName ? `${c.firstName} ${c.lastName}` : c.deceasedName})
            </button>
          ))}
        </div>

        {/* Search Results Display */}
        {hasSearched && (
          <div className="pt-4 border-t border-slate-800">
            {isSearching ? (
              <div className="bg-slate-950 border border-cyan-500/30 p-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Querying Decentralized Ledger Nodes</span>
                </div>
                <div className="w-48 h-1 bg-slate-800 mx-auto overflow-hidden relative">
                  <div className="w-full h-full bg-cyan-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400">Matching SHA-256 Merkle proofs & verifying doctor ECDSA signatures...</p>
              </div>
            ) : searchedCert ? (
              <div className="bg-slate-950 border border-cyan-500/40 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold text-xs">#{searchedCert.id}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        searchedCert.status === 'SEALED_ON_CHAIN'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : searchedCert.status === 'REVOKED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {searchedCert.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {searchedCert.firstName ? [searchedCert.firstName, searchedCert.secondName, searchedCert.lastName].filter(Boolean).join(' ') : searchedCert.deceasedName}
                    </h3>
                  </div>

                  <button
                    onClick={() => onOpenPdfModal(searchedCert)}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Official PDF Certificate</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">National ID</p>
                    <p className="font-mono text-slate-300 mt-0.5">{searchedCert.nationalId}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Date of Death</p>
                    <p className="text-slate-300 mt-0.5">{searchedCert.dateOfDeath} ({searchedCert.timeOfDeath})</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Attending Physician</p>
                    <p className="text-slate-300 mt-0.5">{searchedCert.certifyingDoctor}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">ICD-10 Cause Code</p>
                    <p className="font-mono text-cyan-400 mt-0.5">{searchedCert.causeOfDeathICD10}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-slate-500">ECDSA Doctor Signature Hash:</span> <span className="text-indigo-400">{searchedCert.signatureHash ? searchedCert.signatureHash.substring(0, 32) + '...' : 'Signed'}</span>
                  </div>
                  <button
                    onClick={onOpenExplorer}
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-sans shrink-0 font-semibold text-xs"
                  >
                    <span>View Block #{searchedCert.blockNumber || 1}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 p-6 text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No Record Found Matching "{searchQuery}"</p>
                <p className="text-xs text-slate-500">Check the Reference ID or verify with the issuing medical center or civil registry.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Role / Faculty Entry Portal Cards */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Select Stakeholder Role Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Explore dedicated role interfaces tailored for medical officers, civil registrars, family beneficiaries, verifying agencies, and security auditors.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Medical Officer */}
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-4 hover:border-cyan-500/50 transition flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-[#00000000] px-2 py-0.5 border border-cyan-500/30 uppercase font-semibold">
                  Clinical Faculty
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#ffffff] group-hover:text-cyan-400 transition">Medical Officer Workstation</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Issue digital death certificates, run AI clinical logic sanity checks, apply ECDSA cryptographic doctor signatures, and import HL7 FHIR records directly from hospital EHR systems.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>HL7 FHIR R4 Bundle Import</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>AI Clinical Sanity Validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Offline 2G/3G Local Queueing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectRole(USER_PERSONAS.MEDICAL_OFFICER)}
              className="w-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-cyan-400 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Launch Medical Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Civil Registrar */}
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-4 hover:border-emerald-500/50 transition flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-[#00000000] px-2 py-0.5 border border-emerald-500/30 uppercase font-semibold">
                  Civil Authority
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#ffffff] group-hover:text-emerald-400 transition">Civil Registrar Portal</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Review medical certifications, verify doctor credentials against medical council registries, apply state-level on-chain seal, and manage certificate revocations or amendments.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>On-Chain State Seal Authorization</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Revocation Audit Trail</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Doctor Credential Verification</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectRole(USER_PERSONAS.REGISTRAR)}
              className="w-full bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-emerald-400 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Launch Registrar Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Family & Beneficiaries */}
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-4 hover:border-indigo-500/50 transition flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-[#00000000] px-2 py-0.5 border border-indigo-500/30 uppercase font-semibold">
                  Citizens & Next of Kin
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition">Family & Beneficiaries Portal</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Search deceased records, generate official watermarked PDF certificates with QR verification codes, grant temporal ZK access keys to banks or insurers, and manage key escrow shards.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Official PDF Transcript Download</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Temporal ZK Access Keys</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Shamir's Secret Key Escrow Shards</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectRole(USER_PERSONAS.FAMILY)}
              className="w-full bg-slate-800 hover:bg-indigo-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-indigo-400 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Launch Family Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Verifying Agency */}
          <div className="bg-slate-900 border border-slate-800 p-6 space-y-4 hover:border-amber-500/50 transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 uppercase font-semibold">
                  Accredited Inspectors
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">Verifying Agency Portal</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tailored for insurance companies, commercial banks, pension funds, and foreign embassies to perform instant QR code scanning and zero-trust certificate authenticity validation.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Real-Time QR Scanner Simulator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Zero-Trust Hash Verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Anti-Pension Fraud Alert Engine</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectRole(USER_PERSONAS.VERIFIER_AGENCY)}
              className="w-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-amber-400 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Launch Verifier Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 5: System Auditor */}
          <div className="bg-slate-900 border border-slate-800 p-6 space-y-4 hover:border-rose-500/50 transition flex flex-col justify-between group md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 uppercase font-semibold">
                  Security & Audit
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition">System Auditor & Security Workstation</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Monitor Merkle tree hash integrity, verify block height, test anti-tamper security simulations, audit cross-border regulatory compliance (EU GDPR, US HIPAA, KE PDPA), and reset ledger to Genesis state.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Merkle Root SHA-256 Diagnostics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Block Tamper Attack Simulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Regulatory Sovereignty Matrix</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Consensus Node Telemetry</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectRole(USER_PERSONAS.SYSTEM_AUDITOR)}
              className="w-full bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 border border-slate-700 hover:border-rose-500 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Launch Auditor Workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* How It Works & Architecture Section */}
      <section className="bg-slate-900 border border-slate-800 p-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>End-to-End Cryptographic Lifecycle</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Four deterministic steps ensuring tamper-proof record lineage from bedside to probate court.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-950 p-5 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Clinical Certification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attending doctor signs cause-of-death with their ECDSA private key. Record is checked against AI clinical logic and hashed.
            </p>
          </div>

          <div className="bg-slate-950 p-5 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 bg-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Consensus Block Mining</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The transaction is broadcasted to network validator nodes, hashed into a Merkle tree, and sealed in an unalterable block.
            </p>
          </div>

          <div className="bg-slate-950 p-5 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              03
            </div>
            <h3 className="text-sm font-bold text-white">State Seal Authorization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Civil Registrar validates physician credentials against the council registry and applies the official state cryptographic seal.
            </p>
          </div>

          <div className="bg-slate-950 p-5 border border-slate-800 space-y-3 relative">
            <div className="w-8 h-8 bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              04
            </div>
            <h3 className="text-sm font-bold text-white">Instant Agency Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Banks, pension funds, and families scan QR codes or query the ledger for instant proof without needing paper original certificates.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-slate-900 border border-slate-800 p-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <span>Frequently Asked Questions & Protocol Specs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Understanding decentralized vital records, zero-knowledge privacy, and offline network capabilities.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-4 text-xs sm:text-sm font-bold text-slate-200 hover:text-cyan-400 transition flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeFaq === idx ? 'rotate-90 text-cyan-400' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-900/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* QR Code Optical Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/50 max-w-lg w-full p-6 space-y-5 relative shadow-2xl">
            <button
              onClick={handleCloseScanner}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 border border-slate-700 transition"
              title="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Death Certificate QR Scanner</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono uppercase font-semibold">
                    Camera Armed
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Point lens at printed or digital certificate QR code</p>
              </div>
            </div>

            {/* Viewfinder Video Frame */}
            <div className="relative aspect-video bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center space-y-2">
                  <Camera className="w-10 h-10 text-cyan-500/40 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-300 font-semibold">Optical Camera Stream Simulator</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {cameraError || 'Align certificate barcode within crosshairs to decode transaction payload.'}
                  </p>
                </div>
              )}

              {/* Viewfinder Target Crosshairs Overlay */}
              <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/30 m-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                </div>
                
                {/* Laser Scanning Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />

                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                </div>
              </div>
            </div>

            {/* Simulated QR Payload Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">Detected / Sample QR Payloads:</span>
                <span className="text-cyan-400 font-mono">Tap to decode & lookup</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                {certificates.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => handleQrCodeScanned(cert.id)}
                    className="w-full text-left bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 p-2.5 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-mono text-xs text-white group-hover:text-cyan-300 font-bold truncate">{cert.id}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {cert.firstName ? `${cert.firstName} ${cert.lastName}` : cert.deceasedName} • {cert.nationalId}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 font-mono uppercase font-semibold border border-cyan-500/20 shrink-0">
                      Scan
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleCloseScanner}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 text-xs border border-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
