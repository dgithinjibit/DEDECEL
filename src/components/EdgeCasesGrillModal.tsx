import React, { useState } from 'react';
import { EDGE_CASE_SCENARIOS } from '../data/edgeCases';
import { EdgeCaseScenario, NetworkSpeed } from '../types';

interface EdgeCasesGrillModalProps {
  onClose: () => void;
  onSelectNetworkSpeed: (speed: NetworkSpeed) => void;
  onSimulateTamper: (blockIndex: number) => void;
}

export const EdgeCasesGrillModal: React.FC<EdgeCasesGrillModalProps> = ({
  onClose,
  onSelectNetworkSpeed,
  onSimulateTamper
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(EDGE_CASE_SCENARIOS[0].id);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeScenario = EDGE_CASE_SCENARIOS.find(s => s.id === activeScenarioId) || EDGE_CASE_SCENARIOS[0];

  const handleRunInteractiveTest = (scenario: EdgeCaseScenario) => {
    if (scenario.id === 'EDGE-1') {
      onSelectNetworkSpeed('EDGE_2G');
      setActionFeedback('Switched network mode to 2G Low Bandwidth Field Queue. Test creating a new record in Medical Portal now!');
    } else if (scenario.id === 'EDGE-2') {
      setActionFeedback('Triggered off-chain KMS encryption key shredding simulation. On-chain IPFS payload is now crypto-shredded noise.');
    } else if (scenario.id === 'EDGE-3') {
      setActionFeedback('Smart contract created an AMENDED block linked back to previous block hash. Both versions preserved in immutable history.');
    } else if (scenario.id === 'EDGE-4') {
      setActionFeedback('Shamir 2-of-3 key shard synthesis validated. Access key re-computed for family probate.');
    } else if (scenario.id === 'EDGE-5') {
      setActionFeedback('Placeholder biometric DNA hash generated for mass casualty entry. National ID binding pending police verification.');
    } else if (scenario.id === 'EDGE-6') {
      setActionFeedback('Generated ZK-SNARK proof circuit output: "Valid Death Event == True" (0% Medical Cause Disclosure).');
    } else if (scenario.id === 'EDGE-7') {
      setActionFeedback('Multi-Jurisdiction Data Sovereignty routing tags applied (EU GDPR & Kenya PDPA cross-border compliant).');
    }

    setTimeout(() => setActionFeedback(null), 6000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
              EC
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edge Case Grill & Architectural Decision Matrix</h2>
              <p className="text-xs text-slate-400">Probe and test every edge case in decentralized death record keeping</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition"
          >
            Close
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pr-1 flex-1">
          
          {/* Edge Case Scenarios List */}
          <div className="space-y-2 border-r border-slate-800 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Probe Scenarios ({EDGE_CASE_SCENARIOS.length})</p>
            {EDGE_CASE_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScenarioId(s.id)}
                className={`w-full text-left p-3 rounded-lg transition border ${
                  activeScenarioId === s.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{s.title}</span>
                  <span className="text-slate-500 shrink-0">›</span>
                </div>
                <span className="inline-block mt-1 bg-slate-900 text-cyan-400 text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-800">
                  {s.category}
                </span>
              </button>
            ))}
          </div>

          {/* Active Edge Case Explanation & Test Trigger */}
          <div className="md:col-span-2 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-base">{activeScenario.title}</h3>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    Architecturally Handled
                  </span>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">The Problem / Edge Case Probe:</h4>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{activeScenario.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">dApp Smart Contract Solution:</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                    {activeScenario.solutionArchitecture}
                  </p>
                </div>
              </div>

              {actionFeedback && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2">
                  <span>{actionFeedback}</span>
                </div>
              )}
            </div>

            {/* Interactive Test Action */}
            {activeScenario.interactiveActionLabel && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => handleRunInteractiveTest(activeScenario)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <span>{activeScenario.interactiveActionLabel}</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
