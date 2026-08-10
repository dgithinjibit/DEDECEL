import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BirthRecord } from '../types';

interface DigitalCertificateModalProps {
  record: BirthRecord | null;
  onClose: () => void;
}

export const DigitalCertificateModal: React.FC<DigitalCertificateModalProps> = ({
  record,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (record) {
      const qrPayload = JSON.stringify({
        system: 'BIRTH-CHAIN B2G LEDGER',
        regId: record.id,
        motherId: record.motherNationalId,
        zkBirthHash: record.zkProof.birthHash,
        status: record.status,
        sealedAt: record.blockchain?.sealedAt || record.createdAt
      });

      QRCode.toDataURL(qrPayload, {
        width: 160,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
    }
  }, [record]);

  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative text-slate-100 my-8">
        {/* Top Control Bar (Hidden during print) */}
        <div className="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">Official Government Digital Birth Certificate</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
            >
              Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* PRINTABLE CERTIFICATE CANVAS */}
        <div className="p-8 sm:p-12 bg-slate-950 print:bg-white print:text-black print:p-6 text-slate-100">
          <div className="border-8 border-double border-slate-800 print:border-slate-900 p-8 sm:p-10 rounded-2xl relative overflow-hidden bg-slate-900/40 print:bg-white">
            
            {/* Header Emblem */}
            <div className="text-center mb-8 border-b border-slate-800 print:border-slate-300 pb-6">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider text-white print:text-slate-900 uppercase">
                State Civil Registration Department
              </h1>
              <p className="text-xs font-mono text-emerald-400 print:text-slate-700 uppercase tracking-widest mt-1">
                OFFICIAL DECENTRALIZED DIGITAL BIRTH CERTIFICATE
              </p>
              <p className="text-[11px] text-slate-500 print:text-slate-600 font-mono mt-0.5">
                REGISTRATION ID: <strong className="text-white print:text-slate-900 font-bold">{record.id}</strong> (TEMP ID: {record.childTempId})
              </p>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
              {/* Left Column: Newborn */}
              <div className="space-y-3 bg-slate-950/80 print:bg-slate-50 p-5 rounded-xl border border-slate-800 print:border-slate-300">
                <h3 className="font-mono text-xs font-bold text-amber-400 print:text-slate-800 uppercase tracking-wider border-b border-slate-800 print:border-slate-300 pb-1.5">
                  1. Child Information
                </h3>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Full Legal Name:</span>
                  <strong className="text-white print:text-slate-900 text-base font-bold">{record.childFirstName} {record.childLastName}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Date & Time of Birth:</span>
                  <span className="font-mono text-slate-200 print:text-slate-800">
                    {new Date(record.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} @ {record.timeOfBirth}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Place of Birth:</span>
                  <span className="text-slate-200 print:text-slate-800">{record.facilityName} ({record.placeOfBirth.replace('_', ' ')})</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Biological Sex:</span>
                  <span className="text-slate-200 print:text-slate-800">{record.gender}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Weight & Gestational Age:</span>
                  <span className="text-slate-200 print:text-slate-800">{record.birthWeightGrams} grams • {record.gestationalAgeWeeks} Weeks</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">APGAR Clinical Scores:</span>
                  <span className="font-mono text-emerald-400 print:text-slate-900 font-bold">{record.apgar1Min} / 10 (1m) • {record.apgar5Min} / 10 (5m)</span>
                </div>
              </div>

              {/* Right Column: Parents & Attestation */}
              <div className="space-y-3 bg-slate-950/80 print:bg-slate-50 p-5 rounded-xl border border-slate-800 print:border-slate-300">
                <h3 className="font-mono text-xs font-bold text-amber-400 print:text-slate-800 uppercase tracking-wider border-b border-slate-800 print:border-slate-300 pb-1.5">
                  2. Parents & Attestation
                </h3>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Mother's Legal Name:</span>
                  <strong className="text-white print:text-slate-900">{record.motherLegalName}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Mother National ID:</span>
                  <span className="font-mono font-bold text-indigo-300 print:text-slate-900">{record.motherNationalId}</span>
                </div>

                {record.fatherLegalName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 print:text-slate-600 text-xs">Father's Legal Name:</span>
                    <span className="text-slate-200 print:text-slate-800">{record.fatherLegalName}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Attending Physician:</span>
                  <span className="text-slate-200 print:text-slate-800">{record.attendingPhysicianName} ({record.attendingPhysicianLicense})</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 text-xs">Facility Node ID:</span>
                  <span className="font-mono text-slate-200 print:text-slate-800">{record.facilityId}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Seal Section */}
            <div className="bg-slate-950 print:bg-slate-100 p-5 rounded-xl border border-slate-800 print:border-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="col-span-2 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 print:text-slate-600 block">ZERO-KNOWLEDGE BIRTH HASH (DEBICEL ANCHOR)</span>
                  <span className="text-blue-300 print:text-slate-900 font-bold truncate block">{record.zkProof.birthHash}</span>
                </div>

                <div>
                  <span className="text-slate-500 print:text-slate-600 block">BLOCKCHAIN PROOF</span>
                  <span className="text-emerald-400 print:text-slate-900 block">
                    Block #{record.blockchain?.blockNumber || '1851093'} • Seal: {record.blockchain?.registrarSealId || 'SEAL-NY-CIVIL-9012'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 print:text-slate-600 block">OFF-CHAIN IPFS AES-256 CID</span>
                  <span className="text-slate-400 print:text-slate-700 truncate block">{record.ipfsCid}</span>
                </div>
              </div>

              {/* Dynamic QR Code */}
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-300">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Birth Certificate QR Verification Code" className="w-28 h-28 object-contain" />
                ) : (
                  <div className="w-28 h-28 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-500">
                    Generating QR...
                  </div>
                )}
                <span className="text-[9px] font-mono text-slate-800 mt-1 uppercase font-bold">
                  SCAN TO VERIFY
                </span>
              </div>
            </div>

            {/* Attestation Signatures Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-6 text-center text-xs">
              <div>
                <div className="font-serif italic text-amber-300 print:text-slate-800 text-sm mb-1">
                  Dr. {record.attendingPhysicianName}
                </div>
                <div className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                  Attending Obstetrician Signer (Ed25519)
                </div>
                <div className="text-[9px] font-mono text-slate-600 print:text-slate-500 truncate mt-0.5">
                  {record.signatures.physicianSignature.slice(0, 24)}...
                </div>
              </div>

              <div>
                <div className="font-serif italic text-amber-300 print:text-slate-800 text-sm mb-1">
                  {record.blockchain?.registrarName || 'Hon. Marcus Vance, Chief Registrar'}
                </div>
                <div className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                  State Registrar General (Civil Seal Affixed)
                </div>
                <div className="text-[9px] font-mono text-slate-600 print:text-slate-500 truncate mt-0.5">
                  {record.blockchain?.blockHash ? record.blockchain.blockHash.slice(0, 24) + '...' : 'Sealed On-Chain'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
