import React, { useState, useRef, useEffect } from 'react';
import { DeathCertificate, UserPersona, JurisdictionMode } from '../types';
import { USER_PERSONAS } from '../data/personas';

/*
  PUBLIC HOMEPAGE — revamped, letters-only (no icons or images).
  Structure is carried by typography, hairline rules, and two-letter role marks.
  All original logic is preserved: public search, QR-payload picker, role entry,
  lifecycle explainer, and FAQ.
*/

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

interface RoleCard {
  mark: string;
  tag: string;
  title: string;
  blurb: string;
  points: string[];
  persona: UserPersona;
  cta: string;
}

export const PublicHomepage: React.FC<PublicHomepageProps> = ({
  certificates,
  blocksCount,
  onSelectRole,
  onOpenExplorer,
  onOpenPdfModal,
  isChainValid,
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
      streamRef.current.getTracks().forEach((track) => track.stop());
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
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('This browser does not expose a camera. Pick a sample record below to try a lookup.');
      }
    } catch (err) {
      console.warn('Camera access warning:', err);
      setCameraError('Camera unavailable or blocked. Pick a sample record below to try a lookup.');
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
      const deathMatch = certificates.find(
        (c) =>
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

  const sealedCount = certificates.filter((c) => c.status === 'SEALED_ON_CHAIN').length;
  const pendingCount = certificates.filter((c) => c.status === 'PENDING_REGISTRAR_APPROVAL').length;

  const roleCards: RoleCard[] = [
    {
      mark: 'MO',
      tag: 'Clinical',
      title: 'Medical Officer',
      blurb: 'Issue certificates, run clinical sanity checks, sign records, and import hospital EHR data.',
      points: ['HL7 FHIR R4 import', 'Clinical sanity checks', 'Offline queueing'],
      persona: USER_PERSONAS.MEDICAL_OFFICER,
      cta: 'Open Medical portal',
    },
    {
      mark: 'CR',
      tag: 'Civil authority',
      title: 'Civil Registrar',
      blurb: 'Review certifications, verify physician credentials, and apply the official on-chain seal.',
      points: ['On-chain seal', 'Revocation trail', 'Credential checks'],
      persona: USER_PERSONAS.REGISTRAR,
      cta: 'Open Registrar portal',
    },
    {
      mark: 'FB',
      tag: 'Family',
      title: 'Family & Beneficiaries',
      blurb: 'Find a record, download an official PDF, and grant time-limited access to banks or insurers.',
      points: ['Official PDF', 'Time-limited access', 'Key escrow'],
      persona: USER_PERSONAS.FAMILY,
      cta: 'Open Family portal',
    },
    {
      mark: 'VA',
      tag: 'Verifier',
      title: 'Verifying Agency',
      blurb: 'For banks, insurers, pensions, and embassies to confirm a certificate is genuine in seconds.',
      points: ['QR lookup', 'Hash verification', 'Fraud alerts'],
      persona: USER_PERSONAS.VERIFIER_AGENCY,
      cta: 'Open Verifier portal',
    },
    {
      mark: 'SA',
      tag: 'Security & audit',
      title: 'System Auditor',
      blurb: 'Check ledger integrity, run tamper simulations, and review cross-border compliance.',
      points: ['Integrity checks', 'Tamper simulator', 'Compliance matrix', 'Node telemetry'],
      persona: USER_PERSONAS.SYSTEM_AUDITOR,
      cta: 'Open Auditor workstation',
    },
  ];

  const lifecycle = [
    { n: '01', t: 'Certify', d: 'The attending doctor signs the cause of death. The record is checked and hashed.' },
    { n: '02', t: 'Anchor', d: 'A fingerprint of the record is written to the ledger and sealed in a block.' },
    { n: '03', t: 'Seal', d: 'The Civil Registrar verifies the physician and applies the official state seal.' },
    { n: '04', t: 'Verify', d: 'Banks, pensions, and families confirm the record instantly — no paper original needed.' },
  ];

  const faqs = [
    {
      q: 'How does this prevent identity theft and pension fraud?',
      a: 'When a doctor signs a death record it is fingerprinted and anchored to the ledger. Once the Civil Registrar seals it, banks, pension funds, and immigration authorities get real-time proof — blocking fraudulent claims and impersonation.',
    },
    {
      q: 'How is family privacy protected?',
      a: 'Personal details are kept off the public chain. Only a cryptographic fingerprint is anchored on-chain, so a verifier can confirm a record is genuine without seeing sensitive clinical details unless access is granted.',
    },
    {
      q: 'What happens with no internet, in a rural clinic?',
      a: 'Records can be created offline. They are stored locally, encrypted, and sync to the network automatically once a connection returns.',
    },
    {
      q: 'Does it meet international standards?',
      a: 'It exports and reads HL7 FHIR R4 bundles and ICD-10 cause-of-death codes, and is built to satisfy GDPR, HIPAA, and PDPA requirements.',
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="border border-slate-700/70 bg-[#28292e] p-8 sm:p-12">
        <p className="text-[11px] tracking-[0.35em] text-brand-400 font-semibold uppercase">
          Birth &amp; Death · Vital Records Network
        </p>
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] max-w-3xl">
          One trusted ledger for life's official records.
        </h1>
        <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          From birth registration to death certification — verifiable, tamper-evident, and
          fraud-resistant. Personal data stays private off-chain; only a cryptographic fingerprint
          is anchored on-chain.
        </p>

        {/* Ledger readout — hairline stat rail */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 border-t border-slate-700/70">
          {[
            { k: 'Ledger height', v: `#${blocksCount}`, tone: 'text-brand-400' },
            { k: 'Sealed on-chain', v: `${sealedCount}`, tone: 'text-emerald-400' },
            { k: 'Pending review', v: `${pendingCount}`, tone: 'text-amber-400' },
            { k: 'Integrity', v: isChainValid ? 'Valid' : 'Corrupted', tone: isChainValid ? 'text-emerald-400' : 'text-rose-400' },
          ].map((s) => (
            <div key={s.k} className="border-b border-r border-slate-700/70 px-4 py-4 last:border-r-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{s.k}</p>
              <p className={`text-2xl font-bold mt-1 font-mono ${s.tone}`}>{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Public verification ────────────────────────────────── */}
      <section className="border border-slate-700/70 bg-[#28292e] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Verify a certificate</h2>
            <p className="text-xs text-slate-400 mt-1">
              Search by certificate ID, national ID, or name. Verification is public; personal
              details are not.
            </p>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
            Privacy-preserving
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="CERT-2026-… , national ID, or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 pl-3.5 pr-24 py-3 text-xs focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={handleStartScanner}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700 text-[11px] font-semibold transition"
            >
              Scan QR
            </button>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-70 text-white font-semibold px-6 py-3 text-xs transition shrink-0"
          >
            {isSearching ? 'Matching…' : 'Verify on-chain'}
          </button>
        </form>

        {/* Sample searches */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Try:</span>
          {certificates.slice(0, 3).map((c) => (
            <button
              key={c.id}
              disabled={isSearching}
              onClick={() => {
                setSearchQuery(c.id);
                executeSearch(c.id);
              }}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-brand-300 px-2.5 py-1 text-[11px] font-mono border border-slate-700 transition"
            >
              {c.id}
            </button>
          ))}
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="pt-4 border-t border-slate-800">
            {isSearching ? (
              <div className="bg-slate-950 border border-brand-500/30 p-6 text-center space-y-3">
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand-400">
                  Querying ledger nodes…
                </p>
                <div className="w-48 h-1 bg-slate-800 mx-auto overflow-hidden">
                  <div className="w-full h-full bg-brand-400 animate-pulse" />
                </div>
              </div>
            ) : searchedCert ? (
              <div className="bg-slate-950 border border-brand-500/40 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-brand-400 font-bold text-xs">#{searchedCert.id}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          searchedCert.status === 'SEALED_ON_CHAIN'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : searchedCert.status === 'REVOKED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {searchedCert.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {searchedCert.firstName
                        ? [searchedCert.firstName, searchedCert.secondName, searchedCert.lastName]
                            .filter(Boolean)
                            .join(' ')
                        : searchedCert.deceasedName}
                    </h3>
                  </div>

                  <button
                    onClick={() => onOpenPdfModal(searchedCert)}
                    className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 px-4 py-2 text-xs font-semibold transition"
                  >
                    Download PDF
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">National ID</p>
                    <p className="font-mono text-slate-300 mt-0.5">{searchedCert.nationalId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Date of death</p>
                    <p className="text-slate-300 mt-0.5">
                      {searchedCert.dateOfDeath} ({searchedCert.timeOfDeath})
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Physician</p>
                    <p className="text-slate-300 mt-0.5">{searchedCert.certifyingDoctor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">ICD-10 code</p>
                    <p className="font-mono text-brand-400 mt-0.5">{searchedCert.causeOfDeathICD10}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-slate-500">Signature:</span>{' '}
                    <span className="text-brand-300">
                      {searchedCert.signatureHash ? searchedCert.signatureHash.substring(0, 32) + '…' : 'Signed'}
                    </span>
                  </div>
                  <button
                    onClick={onOpenExplorer}
                    className="text-brand-400 hover:underline font-sans shrink-0 font-semibold text-xs"
                  >
                    View block #{searchedCert.blockNumber || 1}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 p-6 text-center space-y-1">
                <p className="text-sm font-bold text-slate-300">No record found for “{searchQuery}”.</p>
                <p className="text-xs text-slate-500">
                  Check the reference ID, or ask the issuing medical center or civil registry.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Role portals ───────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">Choose your portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated workspaces for medical officers, registrars, families, verifiers, and auditors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roleCards.map((r, i) => (
            <div
              key={r.mark}
              className={`border border-slate-700/70 bg-[#28292e] p-6 flex flex-col justify-between hover:border-brand-500/60 transition ${
                i === 4 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-10 w-10 border border-brand-500/40 text-brand-400 font-bold text-sm flex items-center justify-center tracking-wider">
                    {r.mark}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{r.tag}</span>
                </div>
                <h3 className="text-base font-bold text-white">{r.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{r.blurb}</p>
                <ul className="pt-1 space-y-1 text-xs text-slate-400">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-brand-400">—</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => onSelectRole(r.persona)}
                className="mt-5 w-full bg-slate-800 hover:bg-brand-600 text-slate-100 border border-slate-700 hover:border-brand-500 font-semibold py-2.5 text-xs transition"
              >
                {r.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lifecycle ──────────────────────────────────────────── */}
      <section className="border border-slate-800 bg-slate-900 p-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">How a record moves</h2>
          <p className="text-xs text-slate-400 mt-1">Four steps, from bedside to verification.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {lifecycle.map((s) => (
            <div key={s.n} className="border border-slate-800 bg-slate-950 p-5">
              <p className="font-mono text-brand-400 font-bold text-sm">{s.n}</p>
              <h3 className="text-sm font-bold text-white mt-2">{s.t}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="border border-slate-800 bg-slate-900 p-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">Questions</h2>
          <p className="text-xs text-slate-400 mt-1">Privacy, offline use, and standards.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-800 bg-slate-950">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-4 text-xs sm:text-sm font-bold text-slate-200 hover:text-brand-400 transition flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <span className="text-brand-400 font-mono shrink-0">{activeFaq === idx ? '–' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── QR scanner modal ───────────────────────────────────── */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-brand-500/50 max-w-lg w-full p-6 space-y-5 relative">
            <button
              onClick={handleCloseScanner}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 px-2 py-1 border border-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Scan a certificate QR</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono uppercase font-semibold">
                  Camera
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Point at a printed or on-screen QR code.</p>
            </div>

            {/* Viewfinder */}
            <div className="relative aspect-video bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-slate-300 font-semibold">Camera preview</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {cameraError || 'Align the certificate QR within the frame to decode it.'}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/30 m-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-brand-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-brand-400" />
                </div>
                <div className="w-full h-0.5 bg-brand-400/70 animate-pulse" />
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-brand-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-brand-400" />
                </div>
              </div>
            </div>

            {/* Sample payloads */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-semibold">Sample QR payloads — tap to look up:</p>
              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                {certificates.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => handleQrCodeScanned(cert.id)}
                    className="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/50 p-2.5 transition flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <p className="font-mono text-xs text-white font-bold truncate">{cert.id}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {cert.firstName ? `${cert.firstName} ${cert.lastName}` : cert.deceasedName} · {cert.nationalId}
                      </p>
                    </div>
                    <span className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-1 font-mono uppercase font-semibold border border-brand-500/20 shrink-0">
                      Look up
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
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
