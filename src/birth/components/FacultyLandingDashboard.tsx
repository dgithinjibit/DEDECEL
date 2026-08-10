import React from 'react';
import { UserRole, BirthRecord } from '../types';

interface FacultyLandingDashboardProps {
  records: BirthRecord[];
  blockHeight: number;
  pendingSealCount: number;
  setActiveRole: (role: UserRole) => void;
  onOpenCertificateModal?: (record: BirthRecord) => void;
}

export const FacultyLandingDashboard: React.FC<FacultyLandingDashboardProps> = ({
  records,
  blockHeight,
  pendingSealCount,
  setActiveRole,
  onOpenCertificateModal
}) => {
  const totalSealed = records.filter(r => r.status === 'Sealed_On_Chain').length;
  const totalRecords = records.length;

  const facultyNodes = [
    {
      id: 'FAC-NY-7701',
      name: 'Mount Sinai Maternity Center',
      location: 'New York, NY',
      type: 'Level IV Tertiary Hospital',
      status: 'Active Node',
      activeDoctors: 24,
      signedRecords: records.filter(r => r.facilityId === 'FAC-NY-7701').length,
      nodeConsensus: 'Online (100% Sync)'
    },
    {
      id: 'FAC-NJ-3302',
      name: 'St. Mary Community Health Center',
      location: 'Newark, NJ',
      type: 'Community Maternity Clinic',
      status: 'Active Node',
      activeDoctors: 12,
      signedRecords: records.filter(r => r.facilityId === 'FAC-NJ-3302').length,
      nodeConsensus: 'Online (100% Sync)'
    },
    {
      id: 'FAC-NY-4409',
      name: 'Harlem Health Hub',
      location: 'Harlem, NY',
      type: 'Regional Health Center',
      status: 'High Velocity Node',
      activeDoctors: 18,
      signedRecords: records.filter(r => r.facilityId === 'FAC-NY-4409').length,
      nodeConsensus: 'Online (100% Sync)'
    },
    {
      id: 'FAC-NY-1029',
      name: 'Kings County Memorial Hospital',
      location: 'Brooklyn, NY',
      type: 'Municipal General Hospital',
      status: 'Active Node',
      activeDoctors: 30,
      signedRecords: records.filter(r => r.facilityId === 'FAC-NY-1029').length,
      nodeConsensus: 'Online (100% Sync)'
    }
  ];

  const facultyPortals = [
    {
      id: 'Doctor_Midwife' as UserRole,
      title: 'Healthcare & Clinical Faculty',
      subtitle: 'Attending Doctors & Midwives',
      description: 'Digital bedside birth attestation, dual Ed25519 cryptographic signatures, clinical APGAR logging, and offline rural clinic queueing.',
      badge: 'Hospital & Clinic Node',
      color: 'from-blue-600 to-indigo-600',
      borderColor: 'border-blue-500/40',
      actionText: 'Enter Clinical Portal'
    },
    {
      id: 'Civil_Registrar' as UserRole,
      title: 'Civil Registration Authority',
      subtitle: 'Government Registrars & Officials',
      description: 'Review dual-signed birth attestations, verify Groth16 Zero-Knowledge proofs, affix state civil seals, and mint BFT consensus blocks.',
      badge: pendingSealCount > 0 ? `${pendingSealCount} Pending Seals` : 'B2G Government Node',
      color: 'from-amber-600 to-orange-600',
      borderColor: 'border-amber-500/40',
      actionText: 'Enter Registrar Portal'
    },
    {
      id: 'Family_Certificate' as UserRole,
      title: 'Citizen & Family Self-Service',
      subtitle: 'Parents & Legal Guardians',
      description: 'Instant birth certificate retrieval by National ID, high-resolution official PDF exports, dynamic QR verification, and privacy controls.',
      badge: 'Public Family Service',
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'border-emerald-500/40',
      actionText: 'Search Family Records'
    },
    {
      id: 'Judicial_Auditor' as UserRole,
      title: 'Judicial & Health Inspector',
      subtitle: 'State Auditors & Epidemiologists',
      description: 'Interactive D3 registration velocity analytics, real-time birth surge/outbreak detection, ZK proof verifier console, and IPFS payload inspection.',
      badge: 'Inspection & Analytics',
      color: 'from-indigo-600 to-purple-600',
      borderColor: 'border-indigo-500/40',
      actionText: 'Open Auditor Terminal'
    },
    {
      id: 'DEBICEL_Simulator' as UserRole,
      title: 'DEBICEL Cross-Ledger Interoperability',
      subtitle: 'Death Certificate dApp Query API',
      description: 'Simulate cross-ledger queries from DEBICEL Death Certificate dApps using route /api/v1/birth-hash/:nationalId to prevent identity fraud.',
      badge: 'Inter-Ledger API Testbed',
      color: 'from-rose-600 to-pink-600',
      borderColor: 'border-rose-500/40',
      actionText: 'Launch DEBICEL API Simulator'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Main Faculty Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-semibold">
            DEBICEL FACULTY & INSTITUTIONAL GATEWAY
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Decentralized Birth Infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">Healthcare & Civil Authorities</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            DEBICEL bridges accredited healthcare facilities, civil registries, and citizen portals through dual-key cryptographic signatures, Groth16 Zero-Knowledge privacy proofs, and BFT consensus ledger immutability.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveRole('Doctor_Midwife')}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              Start Clinical Birth Registration
            </button>

            <button
              onClick={() => setActiveRole('Civil_Registrar')}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              Review Civil Seals ({pendingSealCount})
            </button>
          </div>
        </div>
      </div>

      {/* Network Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>REGISTERED NEWBORNS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalRecords} <span className="text-xs text-emerald-400 font-normal">Records</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {totalSealed} Sealed on DEBICEL Ledger
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>HEALTHCARE FACULTY NODES</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            4 <span className="text-xs text-indigo-400 font-normal">Active Nodes</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Accredited Hospitals & Clinics
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>CONSENSUS BLOCK HEIGHT</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            #{blockHeight.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            9/9 BFT Nodes Syncing
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>PRIVACY & SECURITY</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            100% <span className="text-xs text-amber-400 font-normal">ZK-Groth16</span>
          </div>
          <div className="text-[11px] text-slate-400">
            AES-256-GCM + IPFS CIDs
          </div>
        </div>
      </div>

      {/* Faculty Portals Landing Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              DEBICEL Faculty Operational Hubs
            </h2>
            <p className="text-slate-400 text-sm">
              Select a faculty domain below to access dedicated tools and specialized workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facultyPortals.map(portal => {
            return (
              <div 
                key={portal.id}
                className={`bg-slate-900/80 border ${portal.borderColor} rounded-2xl p-6 flex flex-col justify-between hover:border-slate-600 transition-all shadow-xl group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-end gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono font-medium">
                      {portal.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      {portal.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {portal.subtitle}
                    </p>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {portal.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => setActiveRole(portal.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <span>{portal.actionText}</span>
                    <span className="transition-transform group-hover:translate-x-1">›</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Faculty Facilities Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Accredited Healthcare Faculty Directory
            </h3>
            <p className="text-slate-400 text-xs">
              Live status and birth attestation metrics from hospital nodes integrated into DEBICEL.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
            4/4 Faculty Nodes Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {facultyNodes.map(node => (
            <div key={node.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-blue-400 font-semibold">{node.id}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  {node.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm leading-snug">{node.name}</h4>
                <p className="text-[11px] text-slate-400">{node.location} • {node.type}</p>
              </div>

              <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">PHYSICIANS</span>
                  <span className="text-slate-200 font-semibold">{node.activeDoctors} MD/CNMs</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ATTESTATIONS</span>
                  <span className="text-emerald-300 font-semibold">{node.signedRecords} Records</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How DEBICEL Works Architecture Overview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-xl font-bold text-white text-center">
          DEBICEL Cryptographic Birth Attestation Lifecycle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto font-mono font-bold text-sm">
              1
            </div>
            <h4 className="font-bold text-white text-sm">Clinical Attestation</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Attending physician signs newborn record with Ed25519 key at hospital bed or offline clinic.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center mx-auto font-mono font-bold text-sm">
              2
            </div>
            <h4 className="font-bold text-white text-sm">ZK Proof & IPFS</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              PII is encrypted with AES-256-GCM to IPFS; Groth16 ZK-SNARK generated for privacy-preserving verification.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto font-mono font-bold text-sm">
              3
            </div>
            <h4 className="font-bold text-white text-sm">Civil Seal Minting</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Government registrar verifies signatures, affixes official civil seal, and mints block to BFT ledger.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto font-mono font-bold text-sm">
              4
            </div>
            <h4 className="font-bold text-white text-sm">DEBICEL Death Cross-Anchor</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Future death certificate dApps query <code className="text-rose-300 font-mono text-[10px]">/api/v1/birth-hash</code> to verify legal birth existence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
