import React, { useState } from 'react';
import { Block } from '../types';

interface BlockExplorerModalProps {
  blocks: Block[];
  onClose: () => void;
}

export const BlockExplorerModal: React.FC<BlockExplorerModalProps> = ({
  blocks,
  onClose
}) => {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(blocks[blocks.length - 1]?.index || 1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedBlock = blocks.find(b => b.index === selectedBlockIndex) || blocks[0];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
              BX
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Smart Contract Block Explorer & Merkle Tree Inspector</h2>
              <p className="text-xs text-slate-400">Live decentralized ledger visualization and transaction receipts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition"
          >
            Close
          </button>
        </div>

        {/* Explorer Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pr-1 flex-1">
          
          {/* Block Height Selector List */}
          <div className="space-y-2 border-r border-slate-800 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Block List ({blocks.length})</p>
            {blocks.slice().reverse().map((b) => (
              <button
                key={b.index}
                onClick={() => setSelectedBlockIndex(b.index)}
                className={`w-full text-left p-3 rounded-lg transition border ${
                  selectedBlockIndex === b.index
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">Block #{b.index}</span>
                  <span className="text-slate-500">›</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{b.hash.substring(0, 24)}...</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{new Date(b.timestamp).toLocaleTimeString()}</p>
              </button>
            ))}
          </div>

          {/* Block Details Inspector */}
          {selectedBlock && (
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">Block Header Details #{selectedBlock.index}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Mined & Validated
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Block Cryptographic Hash:</span>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-cyan-300">
                      <span className="truncate">{selectedBlock.hash}</span>
                      <button onClick={() => copyToClipboard(selectedBlock.hash)} className="text-slate-400 hover:text-white shrink-0 ml-2 text-[10px] font-bold">
                        {copiedText === selectedBlock.hash ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Merkle Tree Root Hash:</span>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-emerald-400">
                      <span className="truncate">{selectedBlock.merkleRoot}</span>
                      <button onClick={() => copyToClipboard(selectedBlock.merkleRoot)} className="text-slate-400 hover:text-white shrink-0 ml-2 text-[10px] font-bold">
                        {copiedText === selectedBlock.merkleRoot ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Previous Block Hash (Chain Link):</span>
                    <span className="text-slate-400 block truncate bg-slate-900/60 p-2 rounded-lg">{selectedBlock.previousHash}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 pt-1 text-[10px] text-slate-400">
                    <div>
                      <span>Proof-of-Stake Validator:</span>
                      <p className="text-slate-200 font-bold truncate">{selectedBlock.validator}</p>
                    </div>
                    <div>
                      <span>Nonce:</span>
                      <p className="text-slate-200 font-bold">{selectedBlock.nonce}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions in Block */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">Transactions in Block ({selectedBlock.transactions.length})</p>
                {selectedBlock.transactions.map((tx, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">Tx Hash: {tx.txHash.substring(0, 20)}...</span>
                      <span className="bg-indigo-500/10 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-500/30">
                        {tx.action}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p>Target Cert ID: <span className="text-white">{tx.certificateId}</span></p>
                      <p>Signer Authority: <span className="text-slate-200">{tx.performedBy} ({tx.role})</span></p>
                      <p>IPFS CID Payload: <span className="text-slate-300 truncate block">{tx.encryptedDataHash}</span></p>
                      <p>Zero-Knowledge Proof: <span className="text-emerald-400 truncate block">{tx.zkProof}</span></p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
