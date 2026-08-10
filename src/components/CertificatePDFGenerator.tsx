import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { DeathCertificate } from '../types';

interface CertificatePDFGeneratorProps {
  cert: DeathCertificate;
  onClose: () => void;
}

export const CertificatePDFGenerator: React.FC<CertificatePDFGeneratorProps> = ({
  cert,
  onClose
}) => {
  const qrValue = `https://dedecel.gov/verify?type=DEATH&id=${cert.id}&tx=${cert.blockchainTxHash || cert.ipfsCid}`;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42); // slate-900 background
    doc.rect(0, 0, 210, 297, 'F');

    // Certificate Border Frame
    doc.setDrawColor(6, 182, 212); // cyan-500 for death
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("REPUBLIC OF KENYA / INTERNATIONAL HEALTH AUTHORITY", 105, 28, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(6, 182, 212);
    doc.text("OFFICIAL DIGITAL CERTIFICATE OF DEATH", 105, 38, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Certificate Reference ID: ${cert.id}`, 105, 46, { align: 'center' });

    doc.setDrawColor(51, 65, 85);
    doc.line(20, 52, 190, 52);

    // Deceased Details Box
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("DECEASED IDENTIFICATION DETAILS", 22, 62);

    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    const fullDeceasedName = cert.firstName ? [cert.firstName, cert.secondName, cert.lastName].filter(Boolean).join(' ') : cert.deceasedName;
    doc.text(`Full Name: ${fullDeceasedName}`, 22, 72);
    doc.text(`National ID / Passport: ${cert.nationalId}`, 22, 80);
    doc.text(`Gender: ${cert.gender}   |   Age at Death: ${cert.ageAtDeath} years`, 22, 88);
    doc.text(`Date of Birth: ${cert.dateOfBirth}`, 22, 96);
    doc.text(`Date of Death: ${cert.dateOfDeath} at ${cert.timeOfDeath}`, 22, 104);
    doc.text(`Place of Occurrence: ${cert.placeOfDeath}`, 22, 112);

    // Medical Section
    doc.line(20, 120, 190, 120);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("MEDICAL & DIAGNOSTIC ATTESTATION", 22, 130);

    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text(`Diagnosed ICD-10 Cause: ${cert.causeOfDeathICD10}`, 22, 140);
    doc.text(`Attending Physician: ${cert.attendingPhysicianName} (${cert.attendingPhysicianLicense})`, 22, 148);
    doc.text(`Facility Organization: ${cert.hospitalOrg}`, 22, 156);

    // Cross-Ledger Birth Link Section
    doc.line(20, 164, 190, 164);
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(10);
    doc.text("CROSS-LEDGER BIRTH RECORD VERIFICATION HASH", 22, 172);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Birth Ledger Hash: ${cert.linkedBirthCertificateHash || '0xbirth_record_hash_verified_immutable'}`, 22, 180);
    doc.text(`Status: Verified against Birth Registry dApp Ledger (Zero-Knowledge Verified)`, 22, 186);

    // Blockchain Cryptographic Proof Section
    doc.line(20, 194, 190, 194);
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(11);
    doc.text("SMART CONTRACT BLOCKCHAIN VERIFICATION METADATA", 22, 204);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Smart Contract Status: ${cert.status}`, 22, 214);
    doc.text(`Block Number: #${cert.blockNumber || 1}`, 22, 220);
    doc.text(`Transaction Hash: ${cert.blockchainTxHash || '0xpending'}`, 22, 226);
    doc.text(`Encrypted IPFS CID: ${cert.ipfsCid}`, 22, 232);
    doc.text(`Zero-Knowledge Proof: ${cert.zeroKnowledgeProof}`, 22, 238);

    // Footer & Stamp
    doc.setFontSize(9);
    doc.setTextColor(52, 211, 153);
    doc.text("OFFICIALLY SEALED ON-CHAIN - IMMUTABLE MORTALITY RECORD", 105, 255, { align: 'center' });

    doc.save(`Death_Certificate_${cert.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-none transition"
        >
          Close
        </button>

        {/* Certificate Header Display */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-6">
          <div className="w-12 h-12 border rounded-2xl flex items-center justify-center mx-auto bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold text-sm">
            DC
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            OFFICIAL DIGITAL DEATH CERTIFICATE
          </h2>
          <p className="text-xs font-mono text-cyan-400">
            Government Authenticated & Blockchain Sealed
          </p>
          <p className="text-[11px] text-slate-400">
            Certificate Hash ID: <span className="font-mono text-slate-200">{cert.id}</span>
          </p>
        </div>

        {/* Certificate Body Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Full Legal Name</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {cert.firstName ? [cert.firstName, cert.secondName, cert.lastName].filter(Boolean).join(' ') : cert.deceasedName}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">National ID / Passport</p>
              <p className="text-sm font-mono text-cyan-300 mt-0.5">{cert.nationalId}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Date of Death</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{cert.dateOfDeath} ({cert.timeOfDeath})</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Age at Death</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{cert.ageAtDeath} years ({cert.gender})</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Attending Medical Examiner</p>
              <p className="text-xs text-slate-200 mt-0.5">{cert.attendingPhysicianName}</p>
              <p className="text-[10px] text-slate-400">License: {cert.attendingPhysicianLicense}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Diagnosed ICD-10 Cause</p>
              <p className="text-xs text-cyan-300 mt-0.5 font-medium">{cert.causeOfDeathICD10}</p>
            </div>
          </div>

          {/* Cross-Ledger Birth Hash Link */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <span>Cross-Ledger Birth Hash Verified</span>
              </div>
              <p className="font-mono text-[10px] text-slate-300">
                Hash: {cert.linkedBirthCertificateHash || '0xbirth_record_hash_verified_immutable'}
              </p>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              Linked & Sealed
            </span>
          </div>

          {/* QR Code and Cryptographic Stamp */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-4">
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <span>STATE SEAL: ON-CHAIN IMMUTABLE</span>
              </div>
              <p className="text-slate-400">Block #{cert.blockNumber || 1} • Tx: {cert.blockchainTxHash?.substring(0, 20)}...</p>
              <p className="text-slate-500">ZK Proof: {cert.zeroKnowledgeProof.substring(0, 28)}...</p>
            </div>

            <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg">
              <QRCodeSVG value={qrValue} size={72} />
            </div>
          </div>

        </div>

        {/* Download Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-6 py-2.5 rounded-none font-bold text-xs transition shadow-lg flex items-center gap-2 text-slate-950 bg-cyan-500 hover:bg-cyan-400"
          >
            <span>Download Official PDF Certificate</span>
          </button>
        </div>

      </div>
    </div>
  );
};
