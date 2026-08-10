import React from 'react';
import {
  txExplorerUrl,
  accountExplorerUrl,
  isRealTxId,
  shortHash,
  CONFIGURED_CONTRACT_ID,
  CONFIGURED_NETWORK,
} from '../services/nearExplorer';

/*
  NEAR ANCHOR BADGE — shows whether a certificate's hash is on the NEAR blockchain, and links
  to the public NearBlocks explorer so anyone can verify it independently.

  Three honest states (no fake links, ever):
    1. ON-CHAIN   — a real tx id exists -> green badge + a clickable NearBlocks link.
    2. OFF-CHAIN  — a "local:" placeholder (NEAR not configured yet) -> amber badge explaining
                    the hash is recorded off-chain but not yet anchored on NEAR.
    3. NOT ANCHORED — no tx id at all -> neutral "awaiting seal" note.

  Letters/text only — no icons or images (project rule).
*/

interface NearAnchorBadgeProps {
  /** The transaction id from the anchor step (real hash, "local:..." placeholder, or null). */
  txId: string | null | undefined;
  /** Optional: when this anchoring happened (ISO string), shown for context. */
  anchoredAt?: string | null;
  /** Optional: override the contract account link (defaults to the configured one). */
  contractId?: string;
  /** Compact mode for tight card layouts (smaller text, single line where possible). */
  compact?: boolean;
}

export const NearAnchorBadge: React.FC<NearAnchorBadgeProps> = ({
  txId,
  anchoredAt,
  contractId = CONFIGURED_CONTRACT_ID,
  compact = false,
}) => {
  const onChain = isRealTxId(txId);
  const txUrl = txExplorerUrl(txId);
  const contractUrl = accountExplorerUrl(contractId);

  // State 3: nothing anchored yet.
  if (!txId) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-slate-400">
        <span className="px-2 py-0.5 rounded-full border border-slate-600 bg-slate-800/60 font-semibold">
          Awaiting seal
        </span>
        <span>Not yet anchored.</span>
      </span>
    );
  }

  // State 2: off-chain placeholder (NEAR not configured).
  if (!onChain) {
    return (
      <div className={`flex flex-col gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <span className="inline-flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold">
            Off-chain
          </span>
          <span className="text-slate-400">
            Recorded off-chain — not yet on NEAR.
          </span>
        </span>
        <span className="text-slate-500 font-mono break-all">ref {shortHash(txId, 8)}</span>
      </div>
    );
  }

  // State 1: real on-chain tx — link to NearBlocks.
  return (
    <div className={`flex flex-col gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold">
          On-chain · NEAR {CONFIGURED_NETWORK}
        </span>
        {anchoredAt && (
          <span className="text-slate-500">{new Date(anchoredAt).toLocaleString()}</span>
        )}
      </span>

      <span className="text-slate-400">
        Transaction:{' '}
        <a
          href={txUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-cyan-400 hover:text-cyan-300 underline break-all"
          title={txId!}
        >
          {shortHash(txId, 8)}
        </a>{' '}
        <span className="text-slate-500">(view on NearBlocks)</span>
      </span>

      {contractUrl && (
        <span className="text-slate-500">
          Contract:{' '}
          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-slate-300 hover:text-cyan-300 underline break-all"
          >
            {contractId}
          </a>
        </span>
      )}
    </div>
  );
};
