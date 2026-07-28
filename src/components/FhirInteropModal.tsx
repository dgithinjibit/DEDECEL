import React, { useState } from 'react';
import { FileCode2, X, Download, UploadCloud, Copy, Check, Server, RefreshCw } from 'lucide-react';
import { DeathCertificate } from '../types';
import { FhirInteroperability } from '../services/fhirInteroperability';

interface FhirInteropModalProps {
  certificates: DeathCertificate[];
  onClose: () => void;
}

export const FhirInteropModal: React.FC<FhirInteropModalProps> = ({
  certificates,
  onClose
}) => {
  const [selectedCertId, setSelectedCertId] = useState<string>(certificates[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [simulatedHisSync, setSimulatedHisSync] = useState<string | null>(null);

  const selectedCert = certificates.find(c => c.id === selectedCertId) || certificates[0];
  const fhirBundleJson = selectedCert ? FhirInteroperability.exportToFhirR4Bundle(selectedCert) : {};

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(fhirBundleJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFhirFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fhirBundleJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FHIR_Bundle_${selectedCert?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSimulateHisPush = (systemName: string) => {
    setSimulatedHisSync(`Pushed FHIR R4 bundle to ${systemName} EHR Gateway. HTTP 201 Created (Provenance ID: urn:uuid:blockchain-${selectedCert?.id}).`);
    setTimeout(() => setSimulatedHisSync(null), 5000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Hospital Information Systems (HIS) FHIR Interoperability</h2>
              <p className="text-xs text-slate-400">HL7 FHIR R4 JSON Export / Import & EHR Bridge</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-none transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Switcher & HIS Gateway buttons */}
        <div className="space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Record to Export</label>
              <select
                value={selectedCertId}
                onChange={(e) => setSelectedCertId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {certificates.map((c) => (
                  <option key={c.id} value={c.id}>{c.id} - {c.deceasedName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-none text-xs font-semibold transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownloadFhirFile}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-none text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .fhir.json</span>
              </button>
            </div>
          </div>

          {/* Test HIS Sync Connectors */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-400" /> Test EHR Endpoint Bridge:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSimulateHisPush('Epic EHR System')}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded-none text-[11px] font-medium transition"
              >
                Sync to Epic EHR
              </button>
              <button
                onClick={() => handleSimulateHisPush('Cerner Millennium')}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded-none text-[11px] font-medium transition"
              >
                Sync to Cerner
              </button>
              <button
                onClick={() => handleSimulateHisPush('OpenMRS Global')}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded-none text-[11px] font-medium transition"
              >
                Sync to OpenMRS
              </button>
            </div>
          </div>

          {simulatedHisSync && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-xs font-mono">
              {simulatedHisSync}
            </div>
          )}
        </div>

        {/* JSON Display Area */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed">
          <pre>{JSON.stringify(fhirBundleJson, null, 2)}</pre>
        </div>

      </div>
    </div>
  );
};
