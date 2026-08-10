import React, { useState } from 'react';
import { BirthRecord, DebicelQueryResult } from '../types';
import { apiUrl, apiBaseConfigured } from '../../services/apiBase';

interface DedecelSimulatorProps {
  records: BirthRecord[];
}

export const DedecelSimulator: React.FC<DedecelSimulatorProps> = ({ records }) => {
  const [nationalId, setNationalId] = useState('NAT-88392019');
  const [queryResult, setQueryResult] = useState<DebicelQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleRunQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nationalId.trim()) return;

    setIsLoading(true);
    setQueryResult(null);

    try {
      const response = await fetch(apiUrl(`/api/v1/birth-hash/${encodeURIComponent(nationalId.trim())}`));
      const data = await response.json();

      if (response.ok) {
        setQueryResult({
          found: true,
          nationalId: data.nationalId,
          birthHash: data.birthHash,
          registrationId: data.registrationId,
          status: data.status,
          dateOfBirth: data.dateOfBirth,
          facilityId: data.facilityId,
          zkVerified: data.zkVerified,
          blockHash: data.blockHash,
          message: data.message,
          queriedAt: data.queriedAt,
        });
      } else {
        setQueryResult({
          found: false,
          nationalId: nationalId.trim(),
          message: data.message || 'No verified birth record found on BIRTH-CHAIN ledger for this National ID.',
          queriedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      setQueryResult({
        found: false,
        nationalId: nationalId.trim(),
        message: 'Failed to communicate with BIRTH-CHAIN backend API.',
        queriedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyApiUrl = () => {
    // In production point at the real backend; in dev fall back to the app origin (Vite proxy).
    const origin = apiBaseConfigured ? '' : window.location.origin;
    const url = `${origin}${apiUrl(`/api/v1/birth-hash/${nationalId}`)}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-medium border border-rose-500/30">
              DEBICEL CROSS-LEDGER INTEROPERABILITY STANDARD
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            DEBICEL Death Certificate dApp Cross-Anchor
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            When an individual passes away in the future, DEBICEL Death Certificate dApps query BIRTH-CHAIN's API route <code className="text-rose-300 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/api/v1/birth-hash/:nationalId</code> to verify legal birth existence and prevent ghost identity claims.
          </p>
        </div>

        {/* Quick Test Bar */}
        <form onSubmit={handleRunQuery} className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <input
              type="text"
              required
              placeholder="Enter Mother / Individual National ID (e.g. NAT-88392019)..."
              value={nationalId}
              onChange={e => setNationalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
          >
            {isLoading ? (
              <span>…</span>
            ) : null}
            Simulate DEBICEL Query
          </button>
        </form>

        {/* Quick sample buttons */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Test live records:</span>
          {records.slice(0, 3).map(r => (
            <button
              key={r.id}
              onClick={() => {
                setNationalId(r.motherNationalId);
                setTimeout(() => handleRunQuery(), 100);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono cursor-pointer"
            >
              {r.motherNationalId} ({r.childFirstName})
            </button>
          ))}
          <button
            onClick={() => {
              setNationalId('NAT-FAKE-999999');
              setTimeout(() => handleRunQuery(), 100);
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono cursor-pointer"
          >
            NAT-FAKE-999999 (Invalid Test)
          </button>
        </div>
      </div>

      {/* Query Results Console */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Interactive API Endpoint Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">REST API Endpoint Standard</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              GET 200 OK
            </span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-1">ROUTE SPECIFICATION</span>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 flex items-center justify-between">
                <span className="text-rose-300 font-bold break-all">
                  GET /api/v1/birth-hash/{nationalId || ':nationalId'}
                </span>
                <button
                  onClick={copyApiUrl}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  title="Copy Endpoint URL"
                >
                  {copiedUrl ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">USE CASE IN DEBICEL DEATH CERTIFICATE dAPPS</span>
              <p className="text-slate-300 font-sans leading-relaxed">
                Before issuing an official death certificate, DEBICEL queries BIRTH-CHAIN using the deceased person's National Identity Number. BIRTH-CHAIN verifies that a corresponding Zero-Knowledge Birth Hash exists on-chain, proving legal birth identity and preventing duplicate ghost identity claims.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-2">EXPECTED JSON RESPONSE SCHEMA</span>
              <pre className="text-[11px] text-slate-300 overflow-x-auto">
{`{
  "found": true,
  "nationalId": "NAT-88392019",
  "birthHash": "0xbirth_record_hash_8f93a1c7...",
  "registrationId": "REG-2026-89412",
  "status": "Sealed_On_Chain",
  "zkVerified": true,
  "dualKeySignaturesVerified": true
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Right: Live Query Result Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Live DEBICEL Verification Outcome
            </h3>
            {queryResult && (
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(queryResult.queriedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {!queryResult ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
              <p className="text-xs">Click "Simulate DEBICEL Query" to execute live backend endpoint test.</p>
            </div>
          ) : queryResult.found ? (
            <div className="bg-emerald-950/60 border border-emerald-500/50 p-5 rounded-2xl space-y-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm border-b border-emerald-900/80 pb-2">
                <span>LEGAL EXISTENCE VERIFIED ✓</span>
              </div>

              <div className="space-y-2 text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">National ID Query:</span>
                  <strong className="text-white">{queryResult.nationalId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ZK Birth Hash:</span>
                  <span className="text-blue-300 font-bold truncate max-w-[180px]">{queryResult.birthHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration ID:</span>
                  <span className="text-emerald-400 font-bold">{queryResult.registrationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ledger Status:</span>
                  <span className="text-amber-300 font-bold">{queryResult.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">On-Chain Block Hash:</span>
                  <span className="text-slate-300 truncate max-w-[160px]">{queryResult.blockHash}</span>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-800 text-[11px] text-emerald-200 leading-normal">
                {queryResult.message}
              </div>
            </div>
          ) : (
            <div className="bg-rose-950/60 border border-rose-500/50 p-5 rounded-2xl space-y-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm border-b border-rose-900/80 pb-2">
                <span>RECORD NOT FOUND (GHOST IDENTITY ALERT) ✗</span>
              </div>

              <p className="text-slate-300">
                National ID <strong>{queryResult.nationalId}</strong> has no verified birth anchor on BIRTH-CHAIN. DEBICEL will flag this death certificate claim for fraud investigation.
              </p>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-900 text-[11px] text-rose-200">
                {queryResult.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
