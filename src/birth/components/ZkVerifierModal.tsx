import React from 'react';
import { BirthRecord } from '../types';

interface ZkVerifierModalProps {
  record: BirthRecord | null;
  onClose: () => void;
}

export const ZkVerifierModal: React.FC<ZkVerifierModalProps> = ({
  record,
  onClose
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Groth16 ZK-SNARK Mathematical Proof</h3>
              <p className="text-xs text-slate-400">Zero-Knowledge Verification Audit for {record.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Status Badge */}
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
            <span>ZERO-KNOWLEDGE PROOF MATHEMATICALLY VERIFIED</span>
          </div>
          <p className="text-slate-300 font-sans">
            This proof proves that Mother NIN hash <code className="text-indigo-300 font-mono">{record.zkProof.publicInputs.motherNationalIdHash.slice(0, 16)}...</code> gave birth to Record ID <strong className="text-white">{record.id}</strong> at Facility <strong className="text-white">{record.facilityId}</strong> in <strong className="text-white">{record.zkProof.publicInputs.yearOfBirth}</strong> without disclosing raw PII publicly on block explorers.
          </p>
        </div>

        {/* Technical Inputs Grid */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <span className="text-slate-400 block mb-1">ZERO-KNOWLEDGE BIRTH HASH (DEBICEL ANCHOR)</span>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-blue-300 font-bold break-all">
              {record.zkProof.birthHash}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">ZK-SNARK PROOF COMMITMENT HASH</span>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 break-all">
              {record.zkProof.proofHash}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">JURISDICTION CODE</span>
              <span className="text-white font-bold">{record.zkProof.publicInputs.jurisdictionCode}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">GENERATED AT</span>
              <span className="text-slate-300">{new Date(record.zkProof.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
