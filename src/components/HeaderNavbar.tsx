import React, { useState } from 'react';
import { UserPersona, UserRole, NetworkSpeed, JurisdictionMode } from '../types';
import { USER_PERSONAS } from '../data/personas';

/** Two-letter tag for a role — letters only, no icons (project rule). */
const roleTag = (role: UserRole): string =>
  ({
    ADMIN: 'AD',
    MEDICAL_OFFICER: 'MO',
    REGISTRAR: 'RG',
    FAMILY: 'FM',
    VERIFIER_AGENCY: 'VA',
    SYSTEM_AUDITOR: 'SA',
  } as Record<string, string>)[role] ?? '--';

interface HeaderNavbarProps {
  currentPersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
  networkSpeed: NetworkSpeed;
  onSelectNetworkSpeed: (speed: NetworkSpeed) => void;
  pendingQueueCount: number;
  jurisdiction: JurisdictionMode;
  onSelectJurisdiction: (j: JurisdictionMode) => void;
  onOpenExplorer: () => void;
  onOpenFhir: () => void;
  onOpenEdgeCases: () => void;
  onOpenPdfModal?: () => void;
  isChainValid: boolean;
  activeViewMode: 'PUBLIC' | 'PORTAL';
  onSelectViewMode: (mode: 'PUBLIC' | 'PORTAL') => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentPersona,
  onSelectPersona,
  networkSpeed,
  onSelectNetworkSpeed,
  pendingQueueCount,
  jurisdiction,
  onSelectJurisdiction,
  onOpenExplorer,
  onOpenFhir,
  onOpenEdgeCases,
  isChainValid,
  activeViewMode,
  onSelectViewMode
}) => {
  // Tap-driven menus (hover doesn't exist on touchscreens, so the old group-hover
  // persona dropdown was unreachable on phones — these make both menus tappable).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

  return (
    <header className="bg-[#28292e] border-b border-slate-700/80 text-[#ffffff] sticky top-0 z-40 shadow-xl">
      {/* Top Banner for Network / Chain Warning */}
      {!isChainValid && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>WARNING: Blockchain ledger integrity compromised! A block was tampered with.</span>
          </div>
          <button 
            onClick={onOpenExplorer}
            className="underline hover:text-slate-200 text-xs font-bold"
          >
            Inspect Block Explorer
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSelectViewMode('PUBLIC')}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition text-white font-bold text-sm">
                DC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    DEDECEL
                  </span>
                  <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-widest">
                    Death Registry
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Decentralized Death Certificate Ledger</p>
              </div>
            </button>
          </div>

          {/* Mode Navigation Selector (Public Home vs Faculty Portal) */}
          <div className="hidden sm:flex items-center bg-slate-950 p-1 border border-slate-800 gap-1">
            <button
              onClick={() => onSelectViewMode('PUBLIC')}
              className={`px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                activeViewMode === 'PUBLIC'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Public Homepage</span>
            </button>

            <button
              onClick={() => onSelectViewMode('PORTAL')}
              className={`px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                activeViewMode === 'PORTAL'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{currentPersona.role.replace(/_/g, ' ')} Portal</span>
            </button>
          </div>

          {/* Quick Actions & Modal Launchers */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenExplorer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Inspect Blockchain & Smart Contract Execution"
            >
              <span>Block Explorer</span>
            </button>

            <button
              onClick={onOpenFhir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Hospital HIS / HL7 FHIR Interoperability Bridge"
            >
              <span>FHIR / HIS Interop</span>
            </button>

            <button
              onClick={onOpenEdgeCases}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 transition animate-pulse"
              title="Edge Cases Grill & Decision Matrix"
            >
              <span>Edge Cases Grill</span>
            </button>
          </div>

          {/* Persona Switcher & Network Controls */}
          <div className="flex items-center gap-3">
            
            {/* Jurisdiction Selector */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
              <select
                value={jurisdiction}
                onChange={(e) => onSelectJurisdiction(e.target.value as JurisdictionMode)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="EU_GDPR" className="bg-slate-900">EU GDPR Sovereignty</option>
                <option value="US_HIPAA" className="bg-slate-900">US HIPAA Privacy</option>
                <option value="KE_PDPA" className="bg-slate-900">Kenya Data Protection</option>
                <option value="SG_PDPA" className="bg-slate-900">Singapore PDPA</option>
                <option value="GLOBAL_ISO" className="bg-slate-900">Global ISO/WHO Interop</option>
              </select>
            </div>

            {/* Network Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {networkSpeed === 'OFFLINE' ? (
                <span className="text-rose-400 ml-1.5 text-[10px] font-bold">OFF</span>
              ) : (
                <span className="text-emerald-400 ml-1.5 text-[10px] font-bold">ON</span>
              )}
              <select
                value={networkSpeed}
                onChange={(e) => onSelectNetworkSpeed(e.target.value as NetworkSpeed)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium pr-1"
              >
                <option value="ONLINE_5G" className="bg-slate-900">5G High Speed</option>
                <option value="LOW_BANDWIDTH_3G" className="bg-slate-900">3G Rural Network</option>
                <option value="EDGE_2G" className="bg-slate-900">2G Low Bandwidth</option>
                <option value="OFFLINE" className="bg-slate-900">Offline Field Mode</option>
              </select>

              {pendingQueueCount > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  {pendingQueueCount}
                </span>
              )}
            </div>

            {/* Role Switcher Pill — tap to open (works on touch + desktop) */}
            <div className="relative">
              <button
                onClick={() => setPersonaMenuOpen((o) => !o)}
                aria-expanded={personaMenuOpen}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-900/80 to-slate-800 hover:from-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-xs transition text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 text-[10px] font-bold">
                  <span className={currentPersona.role === 'ADMIN' ? 'text-amber-400' : ''}>
                    {roleTag(currentPersona.role)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="font-semibold text-slate-100 text-[11px] leading-tight">{currentPersona.name}</p>
                  <p className="text-[10px] text-cyan-400 font-mono tracking-tighter">{currentPersona.role.replace('_', ' ')}</p>
                </div>
              </button>

              {/* Persona Selector Dropdown Menu */}
              {personaMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Switch Role & Persona</p>
                    <p className="text-[10px] text-slate-500">Test dApp smart contract permissions</p>
                  </div>
                  <div className="space-y-1 mt-1">
                    {Object.values(USER_PERSONAS).map((persona) => (
                      <button
                        key={persona.role}
                        onClick={() => {
                          onSelectPersona(persona);
                          onSelectViewMode('PORTAL');
                          setPersonaMenuOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2.5 ${
                          currentPersona.role === persona.role
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-indigo-400 text-[10px] font-bold">
                          <span className={persona.role === 'ADMIN' ? 'text-amber-400' : ''}>{roleTag(persona.role)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-slate-200">{persona.name}</p>
                          <p className="text-[10px] text-slate-400">{persona.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle — text only, shown when the desktop rows are hidden */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              className="md:hidden text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
            >
              {mobileMenuOpen ? 'Close' : 'Menu'}
            </button>

          </div>

        </div>

        {/* Mobile menu panel — everything the desktop hides (mode nav, tools, jurisdiction) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onSelectViewMode('PUBLIC'); setMobileMenuOpen(false); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                  activeViewMode === 'PUBLIC'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                    : 'text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                Public Homepage
              </button>
              <button
                onClick={() => { onSelectViewMode('PORTAL'); setMobileMenuOpen(false); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                  activeViewMode === 'PORTAL'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {currentPersona.role.replace(/_/g, ' ')} Portal
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => { onOpenExplorer(); setMobileMenuOpen(false); }} className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-left">Block Explorer</button>
              <button onClick={() => { onOpenFhir(); setMobileMenuOpen(false); }} className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-left">FHIR / HIS Interop</button>
              <button onClick={() => { onOpenEdgeCases(); setMobileMenuOpen(false); }} className="px-3 py-2 text-xs font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-left">Edge Cases Grill</button>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Data Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => onSelectJurisdiction(e.target.value as JurisdictionMode)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="EU_GDPR" className="bg-slate-900">EU GDPR Sovereignty</option>
                <option value="US_HIPAA" className="bg-slate-900">US HIPAA Privacy</option>
                <option value="KE_PDPA" className="bg-slate-900">Kenya Data Protection</option>
                <option value="SG_PDPA" className="bg-slate-900">Singapore PDPA</option>
                <option value="GLOBAL_ISO" className="bg-slate-900">Global ISO/WHO Interop</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
