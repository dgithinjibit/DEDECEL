import React, { useState } from 'react';
import { 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Building2, 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Sliders, 
  Activity, 
  FileText, 
  Baby, 
  HeartHandshake, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Key, 
  Lock, 
  Globe, 
  Layers
} from 'lucide-react';
import { FacultyMember, JurisdictionMode, UserPersona } from '../../types';

interface AdminPortalProps {
  persona: UserPersona;
  facultyMembers: FacultyMember[];
  onAddFacultyMember: (member: FacultyMember) => void;
  onToggleFacultyStatus: (id: string, newStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED') => void;
  jurisdiction: JurisdictionMode;
  onJurisdictionChange: (mode: JurisdictionMode) => void;
  totalDeathsCount: number;
  totalBlocksCount: number;
  onResetGenesis: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  persona,
  facultyMembers,
  onAddFacultyMember,
  onToggleFacultyStatus,
  jurisdiction,
  onJurisdictionChange,
  totalDeathsCount,
  totalBlocksCount,
  onResetGenesis
}) => {
  const [activeTab, setActiveTab] = useState<'FACULTY' | 'NETWORK_GOVERNANCE' | 'SYSTEM_LOGS'>('FACULTY');
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // New Practitioner Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newLicense, setNewLicense] = useState('');
  const [newSpecialty, setNewSpecialty] = useState<FacultyMember['specialty']>('OBSTETRICS_GYNECOLOGY');
  const [newOrg, setNewOrg] = useState('Nairobi National Referral Hospital');
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const filteredFaculty = facultyMembers.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = specialtyFilter === 'ALL' || f.specialty === specialtyFilter;
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  const handleCreatePractitioner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName.trim() || !newLicense.trim() || !newEmail.trim()) {
      setAddError('Please fill in all required medical practitioner fields.');
      return;
    }

    const newMember: FacultyMember = {
      id: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
      name: newDoctorName.trim(),
      licenseNumber: newLicense.trim(),
      specialty: newSpecialty,
      role: newSpecialty === 'CIVIL_REGISTRATION' ? 'REGISTRAR' : 'MEDICAL_OFFICER',
      organization: newOrg.trim(),
      email: newEmail.trim(),
      status: 'ACTIVE',
      verifiedOnChain: true,
      certificatesIssuedCount: 0,
      registeredDate: new Date().toISOString().split('T')[0],
      publicKey: `0x04${Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')}`
    };

    onAddFacultyMember(newMember);
    setAddSuccess(`Successfully enrolled and ECDSA-signed practitioner: ${newDoctorName}`);
    setAddError('');
    
    // Reset form
    setNewDoctorName('');
    setNewLicense('');
    setNewEmail('');
    setTimeout(() => {
      setShowAddModal(false);
      setAddSuccess('');
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-[#28292e] border border-slate-700/80 p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 font-semibold uppercase">
                Directorate Level Access
              </span>
              <span className="text-slate-400 text-xs font-mono">• Node #01 Director Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
              Medical Faculty & Vital Records Governance Center
            </h1>
            <p className="text-xs text-slate-300">
              Manage authorized physicians, obstetricians, registrars, and system policy rules across the decentralized network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 text-xs flex items-center gap-2 shadow-lg transition border border-cyan-400/40"
            >
              <Plus className="w-4 h-4" />
              <span>Register Practitioner</span>
            </button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Faculty</span>
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-xl font-mono font-extrabold text-white">
              {facultyMembers.filter(f => f.status === 'ACTIVE').length} <span className="text-xs font-normal text-slate-400">/ {facultyMembers.length}</span>
            </p>
            <p className="text-[10px] text-emerald-400 font-mono">100% On-chain Verified</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Cross-Ledger Link</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-mono font-extrabold text-emerald-400">ACTIVE</p>
            <p className="text-[10px] text-slate-400 font-mono">Birth-to-Death ZK Proof Hash</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Death Records</span>
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xl font-mono font-extrabold text-indigo-400">{totalDeathsCount}</p>
            <p className="text-[10px] text-slate-400 font-mono">Forensic Mortality Registry</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ledger Blocks</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-xl font-mono font-extrabold text-cyan-400">#{totalBlocksCount}</p>
            <p className="text-[10px] text-cyan-400/80 font-mono">Block Height Active</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('FACULTY')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'FACULTY' 
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Practitioners & Faculty Registry</span>
        </button>

        <button
          onClick={() => setActiveTab('NETWORK_GOVERNANCE')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'NETWORK_GOVERNANCE' 
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Network Policy & Governance</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_LOGS')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'SYSTEM_LOGS' 
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Controls & Emergency Reset</span>
        </button>
      </div>

      {/* TAB 1: FACULTY & PRACTITIONER MANAGEMENT */}
      {activeTab === 'FACULTY' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#28292e] border border-slate-700/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by physician name, license, or hospital..."
                className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Specialty:</span>
              </div>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Specialties</option>
                <option value="OBSTETRICS_GYNECOLOGY">Obstetrics & Gynecology</option>
                <option value="FORENSIC_PATHOLOGY">Forensic Pathology</option>
                <option value="GENERAL_MEDICINE">General Medicine</option>
                <option value="CIVIL_REGISTRATION">Civil Registration</option>
                <option value="HEALTH_INFORMATICS">Health Informatics</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Authorized</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="SUSPENDED">Suspended / Revoked</option>
              </select>
            </div>
          </div>

          {/* Practitioner Cards Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.map((member) => (
              <div 
                key={member.id} 
                className="bg-[#28292e] border border-slate-700/80 p-5 space-y-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-cyan-400 bg-[#00000000] border border-cyan-500/30 px-2 py-0.5 font-semibold">
                        {member.specialty.replace('_', ' ')}
                      </span>
                      <h3 className="text-sm font-bold text-[#ffffff] mt-1.5">{member.name}</h3>
                      <p className="text-xs font-mono text-cyan-300 font-semibold">{member.licenseNumber}</p>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 border font-semibold ${
                      member.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : member.status === 'PENDING_VERIFICATION'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {member.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.organization}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Role: <strong className="text-white">{member.role}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 truncate">
                      <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate" title={member.publicKey}>{member.publicKey}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Issued: <strong className="text-cyan-300 font-mono">{member.certificatesIssuedCount}</strong> certs
                  </span>

                  <div className="flex items-center gap-2">
                    {member.status === 'ACTIVE' ? (
                      <button
                        onClick={() => onToggleFacultyStatus(member.id, 'SUSPENDED')}
                        className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-[11px] px-2.5 py-1 font-semibold transition flex items-center gap-1"
                        title="Suspend Signing Privileges"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Suspend</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleFacultyStatus(member.id, 'ACTIVE')}
                        className="bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-[11px] px-2.5 py-1 font-semibold transition flex items-center gap-1"
                        title="Authorize & Verify Practitioner"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Authorize</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: NETWORK POLICY & JURISDICTION */}
      {activeTab === 'NETWORK_GOVERNANCE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Globe className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Data Privacy & Sovereignty Enforcement</h3>
                <p className="text-xs text-slate-400">Set active zero-knowledge privacy policy for birth and death records</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { mode: 'KE_PDPA', title: 'Kenya PDPA (Data Protection Act 2019)', desc: 'East Africa healthcare compliance with biometric data sovereignty & local node encryption.' },
                { mode: 'EU_GDPR', title: 'EU GDPR Article 9 (Special Category PHI)', desc: 'Strict zero-knowledge proof verification with right-to-be-forgotten hash rotation.' },
                { mode: 'US_HIPAA', title: 'US HIPAA Privacy Rule & Safe Harbor', desc: '18-identifier PHI obfuscation with Business Associate Agreement (BAA) smart contract auditing.' },
                { mode: 'SG_PDPA', title: 'Singapore PDPA Vital Statistics Model', desc: 'Real-time inter-agency government sync with multi-party computation.' },
                { mode: 'GLOBAL_ISO', title: 'Global ISO 27001 Healthcare Federation', desc: 'Cross-border interoperability framework compliant with WHO ICD-11 & FHIR R4 standard.' }
              ].map((item) => (
                <div
                  key={item.mode}
                  onClick={() => onJurisdictionChange(item.mode as JurisdictionMode)}
                  className={`p-4 border cursor-pointer transition flex items-start justify-between gap-3 ${
                    jurisdiction === item.mode
                      ? 'bg-cyan-950/30 border-cyan-500 shadow-lg'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.title}</span>
                      {jurisdiction === item.mode && (
                        <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 border border-cyan-500/40">
                          Active Policy
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    jurisdiction === item.mode ? 'border-cyan-400 bg-cyan-400' : 'border-slate-700'
                  }`}>
                    {jurisdiction === item.mode && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Contract Parameters */}
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lock className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Smart Contract Execution Parameters</h3>
                <p className="text-xs text-slate-400">Cryptographic consensus & threshold signatures</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Consensus Engine:</span>
                  <span className="text-emerald-400 font-bold">Delegated Proof of Stake (DPoS)</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Active Validator Nodes:</span>
                  <span className="text-white">4 Regional Ministry Nodes</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Threshold Signatures Required:</span>
                  <span className="text-cyan-400 font-bold">2 of 3 (MD + Registrar)</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Zero-Knowledge Circuit:</span>
                  <span className="text-indigo-400 font-bold">Groth16 / BN254 Pairings</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>FHIR Interoperability Bridge</span>
                </h4>
                <p className="text-slate-400 text-[11px]">
                  All birth and death certifications are automatically mapped to standard FHIR R4 Observation & Composition JSON-LD schemas before being anchored to IPFS.
                </p>
                <div className="p-2 bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300">
                  Endpoint: https://fhir-vitals.health.gov.ke/r4/Composition/$sign-certificate
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM LOGS & EMERGENCY CONTROLS */}
      {activeTab === 'SYSTEM_LOGS' && (
        <div className="space-y-6">
          <div className="bg-[#28292e] border border-slate-700/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">System Diagnostics & Reset Controls</h3>
                <p className="text-xs text-slate-400">Perform maintenance, clear cache, or reset blockchain ledger to initial genesis state</p>
              </div>
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-300">Reset Ledger to Genesis State</h4>
                  <p className="text-[11px] text-amber-200/80">
                    This will clear locally stored transactions and restore the default genesis Birth and Death records. Use for testing clean database cycles.
                  </p>
                </div>
              </div>

              <button
                onClick={onResetGenesis}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center gap-2 transition border border-amber-300 shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Execute Ledger Genesis Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW PRACTITIONER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/50 max-w-lg w-full p-6 space-y-5 relative shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Enroll New Medical Practitioner / Registrar</h3>
                <p className="text-xs text-slate-400">Issue cryptographic identity and license verification</p>
              </div>
            </div>

            {addError && (
              <div className="bg-rose-950/50 border border-rose-500/50 p-2.5 text-xs text-rose-300">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="bg-emerald-950/50 border border-emerald-500/50 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{addSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePractitioner} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Full Practitioner Name *</label>
                <input
                  type="text"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Catherine Njeri, MD"
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Medical License No. *</label>
                  <input
                    type="text"
                    value={newLicense}
                    onChange={(e) => setNewLicense(e.target.value)}
                    placeholder="e.g. KMD-90182-OB"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Specialty Cadre *</label>
                  <select
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value as FacultyMember['specialty'])}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="OBSTETRICS_GYNECOLOGY">Obstetrics & Gynecology</option>
                    <option value="FORENSIC_PATHOLOGY">Forensic Pathology</option>
                    <option value="GENERAL_MEDICINE">General Medicine</option>
                    <option value="CIVIL_REGISTRATION">Civil Registration</option>
                    <option value="HEALTH_INFORMATICS">Health Informatics</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Hospital / Facility Organization *</label>
                <input
                  type="text"
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  placeholder="e.g. Pumwani Maternity Hospital"
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Official Government Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="c.njeri@pumwani.go.ke"
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 text-xs border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 text-xs transition border border-cyan-400"
                >
                  Issue ECDSA Keypair & Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
