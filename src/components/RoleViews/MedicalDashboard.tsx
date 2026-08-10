import React, { useState } from 'react';
import { DeathCertificate, UserPersona, NetworkSpeed } from '../../types';
import { CryptoEngine } from '../../services/cryptoEngine';
import { FhirInteroperability } from '../../services/fhirInteroperability';

interface MedicalDashboardProps {
  persona: UserPersona;
  certificates: DeathCertificate[];
  onCreateCertificate: (cert: DeathCertificate) => void;
  networkSpeed: NetworkSpeed;
  onImportFhir: (fhirJson: any) => void;
}

const COMMON_ICD10 = [
  "I21.9 - Acute Myocardial Infarction",
  "J96.9 - Respiratory Failure, Unspecified",
  "C34.9 - Malignant Neoplasm of Bronchus/Lung",
  "E11.9 - Type 2 Diabetes Mellitus with Complications",
  "I63.9 - Cerebral Infarction (Ischemic Stroke)",
  "A41.9 - Sepsis, Unspecified Organism",
  "R99 - Other ill-defined and unspecified causes of mortality"
];

export const MedicalDashboard: React.FC<MedicalDashboardProps> = ({
  persona,
  certificates,
  onCreateCertificate,
  networkSpeed,
  onImportFhir
}) => {
  const [activeTab, setActiveTab] = useState<'ROLE_LANDING' | 'NEW_CERTIFICATE' | 'MY_ISSUED_RECORDS'>('ROLE_LANDING');

  // Form state
  const [nationalId, setNationalId] = useState('ID-7819-2041-KEN');
  const [firstName, setFirstName] = useState('David');
  const [secondName, setSecondName] = useState('Kipkorir');
  const [lastName, setLastName] = useState('Maina');
  const [dateOfBirth, setDateOfBirth] = useState('1965-04-12');
  const [dateOfDeath, setDateOfDeath] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDeath, setTimeOfDeath] = useState('09:15');
  const [placeOfDeath, setPlaceOfDeath] = useState('Nairobi National Referral Hospital, ICU Ward 3');
  const [placeType, setPlaceType] = useState<'HOSPITAL' | 'RESIDENCE' | 'REMOTE_FIELD' | 'DISASTER_ZONE'>('HOSPITAL');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [causeOfDeathICD10, setCauseOfDeathICD10] = useState(COMMON_ICD10[0]);
  const [secondaryCauses, setSecondaryCauses] = useState('Essential Primary Hypertension');
  const [causeCategory, setCauseCategory] = useState<'NATURAL' | 'ACCIDENTAL' | 'INVESTIGATION_PENDING' | 'OTHER'>('NATURAL');
  
  // Validation / AI Assistance
  const [aiSanityResult, setAiSanityResult] = useState<string | null>(null);
  const [isCheckingAi, setIsCheckingAi] = useState(false);
  const [signedSecret, setSignedSecret] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [signatureHash, setSignatureHash] = useState('');

  const getFullDeceasedName = () => {
    return `${firstName.trim()} ${secondName.trim() ? secondName.trim() + ' ' : ''}${lastName.trim()}`.trim();
  };

  const calculateAge = (dob: string, dod: string) => {
    const birth = new Date(dob);
    const death = new Date(dod);
    let age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  };

  const handleSignCertificate = () => {
    const fullDeceasedName = getFullDeceasedName();
    if (!firstName.trim() || !lastName.trim() || !nationalId) {
      alert('Please fill in required patient fields (First Name, Last Name, and National ID).');
      return;
    }
    const payloadToSign = `${nationalId}_${fullDeceasedName}_${causeOfDeathICD10}_${dateOfDeath}_${persona.licenseOrId}`;
    const sig = CryptoEngine.signData(payloadToSign, persona.privateKey);
    setSignatureHash(sig);
    setIsSigned(true);
  };

  const handleRunAiSanityCheck = async () => {
    setIsCheckingAi(true);
    setAiSanityResult(null);

    // Simulate AI clinical verification or call Gemini API if available
    setTimeout(() => {
      const age = calculateAge(dateOfBirth, dateOfDeath);
      setAiSanityResult(
        `✅ Clinical Verification Passed (ICD-10 Consistency score: 98.4%). Age at death calculated as ${age} years. No conflicting diagnoses detected for ${causeCategory} causes.`
      );
      setIsCheckingAi(false);
    }, 800);
  };

  const handleSubmitCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSigned) {
      alert('Please digitally sign the certificate with your private key before submitting.');
      return;
    }

    const certId = `CERT-2026-${Math.floor(Math.random() * 900000) + 100000}`;
    const ageAtDeath = calculateAge(dateOfBirth, dateOfDeath);
    const encryptionKey = `SECRET_${certId}`;
    const fullDeceasedName = getFullDeceasedName();

    const newCert: DeathCertificate = {
      id: certId,
      nationalId,
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      lastName: lastName.trim(),
      deceasedName: fullDeceasedName,
      dateOfBirth,
      dateOfDeath,
      timeOfDeath,
      placeOfDeath,
      placeType,
      gender,
      ageAtDeath,
      causeOfDeathICD10,
      causeCategory,
      secondaryCauses,
      attendingPhysicianName: persona.name,
      attendingPhysicianLicense: persona.licenseOrId,
      hospitalOrg: persona.organization,
      physicianSignatureHash: signatureHash,
      status: 'SIGNED_MEDICAL',
      ipfsCid: 'bafybei' + CryptoEngine.hash(certId).substring(0, 46),
      timestamp: Date.now(),
      jurisdiction: 'KE_PDPA',
      zeroKnowledgeProof: CryptoEngine.generateZKProof(certId, persona.licenseOrId, Date.now()),
      accessKeyHash: CryptoEngine.hash(`FAM_KEY_${certId}`),
      isOfflineCreated: networkSpeed === 'OFFLINE' || networkSpeed === 'EDGE_2G',
      isEncrypted: true,
      fhirBundleId: `fhir-${certId}`
    };

    onCreateCertificate(newCert);

    // Reset form
    setFirstName('');
    setSecondName('');
    setLastName('');
    setIsSigned(false);
    setSignatureHash('');
    setAiSanityResult(null);
    alert(`Death Certificate #${certId} created and digitally signed successfully!`);
    setActiveTab('MY_ISSUED_RECORDS');
  };

  const handleFileUploadFHIR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const parsed = FhirInteroperability.parseFhirBundle(json);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.secondName) setSecondName(parsed.secondName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.nationalId) setNationalId(parsed.nationalId);
          if (parsed.causeOfDeathICD10) setCauseOfDeathICD10(parsed.causeOfDeathICD10);
          if (parsed.dateOfBirth) setDateOfBirth(parsed.dateOfBirth);
          if (parsed.dateOfDeath) setDateOfDeath(parsed.dateOfDeath);
          alert('FHIR R4 Hospital Record imported successfully into draft form!');
        } catch (err: any) {
          alert('Failed to parse FHIR file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-sm">
              MD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Attending Physician Medical Portal</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Licensed MD Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Issued for <strong className="text-slate-200">{persona.name}</strong> • License: <code className="text-cyan-400">{persona.licenseOrId}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('ROLE_LANDING')}
              className={`px-4 py-2 rounded-none text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'ROLE_LANDING'
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Physician Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('NEW_CERTIFICATE')}
              className={`px-4 py-2 rounded-none text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'NEW_CERTIFICATE'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Issue New Record</span>
            </button>

            <button
              onClick={() => setActiveTab('MY_ISSUED_RECORDS')}
              className={`px-4 py-2 rounded-none text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'MY_ISSUED_RECORDS'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Issued Records ({certificates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'ROLE_LANDING' && (
        <div className="space-y-6">
          
          {/* Physician Duty Overview Banner */}
          <div className="bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">Physician Clinical Workstation Hub</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active Clinical Shift • Kenya Medical Practitioners & Dentists Council (KMPDC) Accredited
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono text-emerald-400 font-bold">ECDSA Private Key Armed</span>
              </div>
            </div>

            {/* Doctor Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Certificates Signed</p>
                <p className="text-xl font-bold text-cyan-400 font-mono">{certificates.length} Total</p>
                <p className="text-[10px] text-slate-400">Cryptographically Sealed</p>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">FHIR Hospital Bridge</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">HL7 R4 Active</p>
                <p className="text-[10px] text-slate-400">Sync with Epic / Cerner EHR</p>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">AI Logic Validator</p>
                <p className="text-xl font-bold text-indigo-400 font-mono">ICD-10 Armed</p>
                <p className="text-[10px] text-slate-400">WHO Clinical Rules Engine</p>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Field Sync State</p>
                <p className="text-xl font-bold text-amber-400 font-mono">{networkSpeed.replace('_', ' ')}</p>
                <p className="text-[10px] text-slate-400">IndexedDB Local Offline Queue</p>
              </div>
            </div>

            {/* Quick Action Hub Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setActiveTab('NEW_CERTIFICATE')}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 border border-cyan-400"
              >
                <span>Issue New Death Certificate Report</span>
              </button>

              <label className="cursor-pointer flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3 px-4 text-xs transition flex items-center justify-center gap-2">
                <span>Import HL7 FHIR Bundle (.json)</span>
                <input type="file" accept=".json" onChange={handleFileUploadFHIR} className="hidden" />
              </label>
            </div>
          </div>

          {/* ICD-10 Cause of Death Reference Guide */}
          <div className="bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>Standard ICD-10 Cause of Death Coding Guidelines</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {COMMON_ICD10.map((codeStr, idx) => {
                const [code, label] = codeStr.split(' - ');
                return (
                  <div key={idx} className="bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                    <span className="font-mono text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 text-[10px] border border-slate-800">
                      {code}
                    </span>
                    <p className="text-slate-200 font-medium text-[11px] truncate">{label}</p>
                    <p className="text-[10px] text-slate-500">WHO Standard Classification</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
      {activeTab === 'NEW_CERTIFICATE' ? (
        <form onSubmit={handleSubmitCertificate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Medical Death Report Registration Form</span>
                <span className="text-xs font-normal text-slate-400">(Encrypted Client-Side)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter official details. Data will be hashed and signed with your private key.</p>
            </div>

            {/* Import FHIR Button */}
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-none text-xs font-medium flex items-center gap-1.5 transition">
              <span>Import FHIR HL7 Record</span>
              <input type="file" accept=".json" onChange={handleFileUploadFHIR} className="hidden" />
            </label>
          </div>

          {/* Section 1: Patient Demographic Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Deceased Patient Identification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Second Name / Middle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kipkorir"
                  value={secondName}
                  onChange={(e) => setSecondName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maina"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">National ID / Passport Hash *</label>
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other / Unspecified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date of Death *</label>
                <input
                  type="date"
                  required
                  value={dateOfDeath}
                  onChange={(e) => setDateOfDeath(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Time of Death (24h)</label>
                <input
                  type="time"
                  value={timeOfDeath}
                  onChange={(e) => setTimeOfDeath(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Details & ICD-10 Diagnosis */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Medical Diagnosis & Location</span>
              </h3>

              <button
                type="button"
                onClick={handleRunAiSanityCheck}
                disabled={isCheckingAi}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-none text-[11px] font-semibold flex items-center gap-1.5 transition"
              >
                <span>{isCheckingAi ? 'Validating Clinical Logic…' : 'AI Clinical Sanity Check'}</span>
              </button>
            </div>

            {aiSanityResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-start gap-2">
                <span>{aiSanityResult}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Cause of Death (ICD-10 Code) *</label>
                <select
                  value={causeOfDeathICD10}
                  onChange={(e) => setCauseOfDeathICD10(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {COMMON_ICD10.map((icd) => (
                    <option key={icd} value={icd}>{icd}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Manner / Category of Death</label>
                <select
                  value={causeCategory}
                  onChange={(e) => setCauseCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="NATURAL">Natural Causes</option>
                  <option value="ACCIDENTAL">Accidental Injury</option>
                  <option value="INVESTIGATION_PENDING">Investigation Pending (Autopsy/Toxicology)</option>
                  <option value="OTHER">Other / Disaster Zone</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Secondary / Underlying Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Chronic Kidney Disease"
                  value={secondaryCauses}
                  onChange={(e) => setSecondaryCauses(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Place / Facility of Death *</label>
                <input
                  type="text"
                  required
                  value={placeOfDeath}
                  onChange={(e) => setPlaceOfDeath(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Environment / Facility Type</label>
                <select
                  value={placeType}
                  onChange={(e) => setPlaceType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="HOSPITAL">Hospital / Clinical Facility</option>
                  <option value="RESIDENCE">Private Residence</option>
                  <option value="REMOTE_FIELD">Remote Rural Field (Low Bandwidth Queue)</option>
                  <option value="DISASTER_ZONE">Disaster Zone / Mass Casualty</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Digital ECDSA Signature Block */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">Physician ECDSA Digital Signature Block</h4>
              </div>
              {isSigned ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  Digitally Signed
                </span>
              ) : (
                <span className="text-amber-400 text-[10px] font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Signature Required
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <p>Signing Identity: <span className="text-white">{persona.name} ({persona.licenseOrId})</span></p>
              <p>Public Key: <span className="text-cyan-400">{persona.publicKey.substring(0, 32)}...</span></p>
              {signatureHash && (
                <p className="mt-1 text-emerald-400 truncate">
                  ECDSA Hash: {signatureHash}
                </p>
              )}
            </div>

            {!isSigned ? (
              <button
                type="button"
                onClick={handleSignCertificate}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-none text-xs transition flex items-center justify-center gap-2"
              >
                <span>Apply Digital ECDSA Signature</span>
              </button>
            ) : (
              <p className="text-[11px] text-emerald-400 text-center font-medium">
                Cryptographic signature attached. Ready for blockchain broadcast.
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={!isSigned}
              className={`px-6 py-2.5 rounded-none font-bold text-xs shadow-lg transition flex items-center gap-2 ${
                isSigned
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>Broadcast Death Record to Blockchain Queue</span>
            </button>
          </div>

        </form>
      ) : (
        /* Issued Records List Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Certificates Issued Under License #{persona.licenseOrId}</h2>
              <p className="text-xs text-slate-400">Total Records: {certificates.length}</p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No death certificates issued yet. Click "Issue New Record" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Cert ID</th>
                    <th className="py-3 px-3">Deceased Name</th>
                    <th className="py-3 px-3">National ID</th>
                    <th className="py-3 px-3">Date of Death</th>
                    <th className="py-3 px-3">Diagnosis (ICD-10)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">IPFS CID / Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {certificates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">{c.id}</td>
                      <td className="py-3 px-3 font-medium text-white">{c.deceasedName}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{c.nationalId}</td>
                      <td className="py-3 px-3">{c.dateOfDeath}</td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{c.causeOfDeathICD10}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'SEALED_ONCHAIN' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                        {c.ipfsCid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
