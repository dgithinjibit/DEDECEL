import React, { useState } from 'react';
import { BirthRecord, PlaceOfBirth, Gender, BirthType } from '../types';
import {
  signBirthRecord,
  generateZkProof,
  encryptPayloadAES256
} from '../lib/crypto';

interface DoctorEntryPortalProps {
  onAddRecord: (record: BirthRecord) => Promise<void>;
  isOnline: boolean;
  queuedCount: number;
}

export const DoctorEntryPortal: React.FC<DoctorEntryPortalProps> = ({
  onAddRecord,
  isOnline,
  queuedCount
}) => {
  // Form State
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeOfBirth, setTimeOfBirth] = useState('09:15');
  const [placeOfBirth, setPlaceOfBirth] = useState<PlaceOfBirth>('Hospital');
  const [facilityName, setFacilityName] = useState('Mount Sinai Maternity Center');
  const [facilityId, setFacilityId] = useState('FAC-NY-7701');
  const [gender, setGender] = useState<Gender>('Female');
  const [birthWeightGrams, setBirthWeightGrams] = useState<number>(3350);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState<number>(39);
  const [apgar1Min, setApgar1Min] = useState<number>(9);
  const [apgar5Min, setApgar5Min] = useState<number>(10);
  const [birthType, setBirthType] = useState<BirthType>('Single');

  // Parents
  const [motherNationalId, setMotherNationalId] = useState('NAT-90182746');
  const [motherLegalName, setMotherLegalName] = useState('Sophia Martinez');
  const [fatherNationalId, setFatherNationalId] = useState('NAT-88201928');
  const [fatherLegalName, setFatherLegalName] = useState('Carlos Martinez');
  const [parentContactEmail, setParentContactEmail] = useState('sophia.m@example.com');

  // Attestation
  const [attendingPhysicianName, setAttendingPhysicianName] = useState('Dr. Sarah Lin, MD');
  const [attendingPhysicianLicense, setAttendingPhysicianLicense] = useState('MD-LIC-90214');

  // Dual Signing status
  const [isPhysicianSigned, setIsPhysicianSigned] = useState(false);
  const [isHospitalSigned, setIsHospitalSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // APGAR Evaluation helper
  const getApgarStatus = (score: number) => {
    if (score >= 7) return { text: 'Normal / Healthy', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
    if (score >= 4) return { text: 'Fair / Monitor', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    return { text: 'Critical / Intervention', color: 'text-rose-400 bg-rose-950/60 border-rose-800' };
  };

  const handleAutoFillDemo = () => {
    const sampleNames = [
      { first: 'Amara', last: 'Okonkwo', motherName: 'Chioma Okonkwo', motherId: 'NAT-99482012', fatherName: 'Emeka Okonkwo', fatherId: 'NAT-88301928' },
      { first: 'Lucas', last: 'Vance', motherName: 'Hannah Vance', motherId: 'NAT-77129402', fatherName: 'David Vance', fatherId: 'NAT-66291039' },
      { first: 'Zuri', last: 'Adebayo', motherName: 'Folake Adebayo', motherId: 'NAT-55102938', fatherName: 'Tunde Adebayo', fatherId: 'NAT-44192039' }
    ];
    const picked = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    setChildFirstName(picked.first);
    setChildLastName(picked.last);
    setDateOfBirth(new Date().toISOString().split('T')[0]);
    setTimeOfBirth('10:30');
    setGender('Female');
    setBirthWeightGrams(3420);
    setGestationalAgeWeeks(40);
    setApgar1Min(9);
    setApgar5Min(10);
    setMotherNationalId(picked.motherId);
    setMotherLegalName(picked.motherName);
    setFatherNationalId(picked.fatherId);
    setFatherLegalName(picked.fatherName);
    setParentContactEmail(`${picked.first.toLowerCase()}@example.com`);
    setAttendingPhysicianName('Dr. Sarah Lin, MD');
    setAttendingPhysicianLicense('MD-LIC-90214');
    setIsPhysicianSigned(true);
    setIsHospitalSigned(true);
  };

  const handleSimulatePhysicianSign = () => {
    setIsPhysicianSigned(true);
  };

  const handleSimulateHospitalSign = () => {
    setIsHospitalSigned(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motherNationalId.trim() || !childLastName.trim()) {
      alert('Mother National ID and Child Last Name are mandatory.');
      return;
    }

    if (!isPhysicianSigned || !isHospitalSigned) {
      alert('Dual-Key cryptographic signature is mandatory before submitting to BIRTH-CHAIN ledger.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const regId = `REG-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      const tempId = `TMP-${facilityId.slice(-3)}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const dobIso = new Date(`${dateOfBirth}T${timeOfBirth}:00.000Z`).toISOString();

      // 1. Dual Signatures
      const payloadString = `${regId}|${motherNationalId}|${dobIso}|${facilityId}`;
      const signatures = await signBirthRecord(payloadString, attendingPhysicianLicense, facilityId);

      // 2. Zero-Knowledge Proof Generation
      const zkProof = await generateZkProof(motherNationalId, dobIso, facilityId);

      // 3. Encrypt PII with AES-256 for IPFS
      const piiObj = {
        childFirstName,
        childLastName,
        motherNationalId,
        motherLegalName,
        fatherNationalId,
        fatherLegalName,
        parentContactEmail,
        birthWeightGrams,
        apgar1Min,
        apgar5Min,
      };
      const { encryptedPayload, ipfsCid } = await encryptPayloadAES256(piiObj);

      const record: BirthRecord = {
        id: regId,
        childTempId: tempId,
        childFirstName: childFirstName || 'Baby',
        childLastName,
        dateOfBirth: dobIso,
        timeOfBirth,
        placeOfBirth,
        facilityName,
        facilityId,
        gender,
        birthWeightGrams,
        gestationalAgeWeeks,
        apgar1Min,
        apgar5Min,
        birthType,
        motherNationalId: motherNationalId.toUpperCase().trim(),
        motherLegalName,
        fatherNationalId: fatherNationalId ? fatherNationalId.toUpperCase().trim() : undefined,
        fatherLegalName: fatherLegalName || undefined,
        parentContactEmail: parentContactEmail || undefined,
        attendingPhysicianName,
        attendingPhysicianLicense,
        signatures,
        status: 'Pending_Registrar_Seal',
        zkProof,
        ipfsCid,
        encryptedPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncState: isOnline ? 'Synced' : 'Queued_Offline'
      };

      await onAddRecord(record);

      setSuccessMessage(
        isOnline 
          ? `Birth Record ${regId} successfully submitted to BIRTH-CHAIN pending block! ZK Hash: ${zkProof.birthHash.slice(0, 24)}...`
          : `Offline Mode Active: Record ${regId} encrypted at rest with AES-256 and queued in IndexedDB for auto-broadcast.`
      );

      // Reset signature toggles for next submission
      setIsPhysicianSigned(false);
      setIsHospitalSigned(false);
    } catch (err) {
      console.error(err);
      alert('Error registering birth record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-medium border border-blue-500/30">
                CLINICAL ENTRY PORTAL
              </span>
              {!isOnline && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-medium border border-amber-500/30 flex items-center gap-1">
                  RURAL OFFLINE MODE
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Newborn Birth Registration & Dual Attestation
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Attending physician and maternity node must dual-sign. Generates Zero-Knowledge proof for cross-ledger verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAutoFillDemo}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md border border-blue-400/30 transition-all cursor-pointer"
            >
              Auto-Fill Sample Data
            </button>

            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/80 text-xs font-mono text-slate-300">
              <span className="text-slate-500 block">ACTIVE FACILITY NODE</span>
              <span className="text-emerald-400 font-semibold">{facilityName} ({facilityId})</span>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-emerald-300">Registration Success</div>
            <div className="font-mono text-xs mt-1">{successMessage}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Newborn Metrics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
            <h3 className="text-lg font-semibold text-white">1. Newborn Clinical & Medical Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Child First Name <span className="text-slate-500">(Optional / Private)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Elena"
                value={childFirstName}
                onChange={e => setChildFirstName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Child Last Name / Family Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rostova"
                value={childLastName}
                onChange={e => setChildLastName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Gender / Biological Sex
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as Gender)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Intersex">Intersex</option>
                <option value="Undisclosed">Undisclosed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Time of Birth
              </label>
              <input
                type="time"
                required
                value={timeOfBirth}
                onChange={e => setTimeOfBirth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Place of Birth
              </label>
              <select
                value={placeOfBirth}
                onChange={e => setPlaceOfBirth(e.target.value as PlaceOfBirth)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Hospital">Hospital / Medical Center</option>
                <option value="Home_Birth">Home Birth (Midwife Attended)</option>
                <option value="Maternity_Clinic">Maternity Clinic</option>
                <option value="In_Transit">In Transit / Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Birth Weight (Grams)
              </label>
              <input
                type="number"
                min={500}
                max={8000}
                value={birthWeightGrams}
                onChange={e => setBirthWeightGrams(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {(birthWeightGrams / 1000).toFixed(2)} kg ({(birthWeightGrams * 0.00220462).toFixed(2)} lbs)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Gestational Age (Weeks)
              </label>
              <input
                type="number"
                min={20}
                max={44}
                value={gestationalAgeWeeks}
                onChange={e => setGestationalAgeWeeks(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Birth Type
              </label>
              <select
                value={birthType}
                onChange={e => setBirthType(e.target.value as BirthType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Single">Single Birth</option>
                <option value="Twin">Twin (Baby A / B)</option>
                <option value="Triplet">Triplet</option>
                <option value="Multiple">Multiple Birth</option>
              </select>
            </div>
          </div>

          {/* APGAR Matrix */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">APGAR Score (1 Minute)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getApgarStatus(apgar1Min).color}`}>
                  {getApgarStatus(apgar1Min).text}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={apgar1Min}
                  onChange={e => setApgar1Min(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="text-lg font-bold font-mono text-white w-6 text-center">{apgar1Min}</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">APGAR Score (5 Minutes)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getApgarStatus(apgar5Min).color}`}>
                  {getApgarStatus(apgar5Min).text}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={apgar5Min}
                  onChange={e => setApgar5Min(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="text-lg font-bold font-mono text-white w-6 text-center">{apgar5Min}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Parent & Attestation Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
            <h3 className="text-lg font-semibold text-white">2. Parents & Attestation Identity</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mother's National ID (NIN) * <span className="text-amber-400 font-mono">(Key for DEBICEL Death Anchor)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. NAT-90182746"
                value={motherNationalId}
                onChange={e => setMotherNationalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mother's Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sophia Martinez"
                value={motherLegalName}
                onChange={e => setMotherLegalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Father's National ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. NAT-88201928"
                value={fatherNationalId}
                onChange={e => setFatherNationalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Father's Full Legal Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Carlos Martinez"
                value={fatherLegalName}
                onChange={e => setFatherLegalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Attending Obstetrician / Midwife Name
              </label>
              <input
                type="text"
                required
                value={attendingPhysicianName}
                onChange={e => setAttendingPhysicianName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Medical License ID
              </label>
              <input
                type="text"
                required
                value={attendingPhysicianLicense}
                onChange={e => setAttendingPhysicianLicense(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dual-Key Cryptographic Signatures */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">3. Dual-Key Cryptographic Attestation</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Requires 2/2 Ed25519 Signatures
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Key 1: Physician */}
            <div className={`p-4 rounded-xl border transition-all ${
              isPhysicianSigned 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>Key 1: Attending Physician</span>
                </div>
                {isPhysicianSigned ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    SIGNED ✓
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">UNSIGNED</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Dr. {attendingPhysicianName} ({attendingPhysicianLicense})
              </p>

              {!isPhysicianSigned ? (
                <button
                  type="button"
                  onClick={handleSimulatePhysicianSign}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  Sign with Doctor Private Key
                </button>
              ) : (
                <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 p-2 rounded border border-emerald-900/60 truncate">
                  0xsig_doc_{(attendingPhysicianLicense + '9012').toLowerCase()}
                </div>
              )}
            </div>

            {/* Key 2: Hospital Node */}
            <div className={`p-4 rounded-xl border transition-all ${
              isHospitalSigned 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>Key 2: Hospital Node HSM</span>
                </div>
                {isHospitalSigned ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    SIGNED ✓
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">UNSIGNED</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {facilityName} ({facilityId})
              </p>

              {!isHospitalSigned ? (
                <button
                  type="button"
                  onClick={handleSimulateHospitalSign}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  Sign with Hospital Node HSM
                </button>
              ) : (
                <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 p-2 rounded border border-emerald-900/60 truncate">
                  0xsig_hosp_node_{(facilityId + '8839').toLowerCase()}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>PII Encrypted via AES-256-GCM before IPFS upload</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isPhysicianSigned || !isHospitalSigned}
              className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                !isPhysicianSigned || !isHospitalSigned
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span>…</span>
                  Generating ZK Proof & Signing...
                </>
              ) : (
                <>
                  Submit Record to BIRTH-CHAIN Ledger
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
