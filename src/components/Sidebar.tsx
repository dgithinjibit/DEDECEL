import React from 'react';
import { UserPersona, UserRole, JurisdictionMode } from '../types';
import { USER_PERSONAS } from '../data/personas';

/*
  SIDEBAR — the primary navigation rail (ChatGPT / Claude style, top-to-bottom).

  Everything that used to be crammed into the horizontal top bar now lives here, grouped
  into readable sections so a first-time user can scan it:

    VIEWS     Public Homepage / Portal   +   Birth / Death domain switch
    ROLE      the persona list (was a dropdown; a rail can show the full list inline)
    TOOLS     Block Explorer / FHIR / Edge Cases
    SETTINGS  data jurisdiction

  Responsive:
    - Desktop (lg+): a fixed rail that is always visible. `collapsed` shrinks it to a narrow
      strip (labels hidden) so the main content gets more room.
    - Mobile (<lg): an off-canvas drawer. `isOpen` slides it in; a backdrop closes it. Every
      navigation action also calls onClose so the drawer dismisses after you pick something.

  Project rules honoured: LETTERS ONLY (no icons/images), brand colour #BA8C63 via `brand-*`.
*/

type CertDomain = 'DEATH' | 'BIRTH';

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

interface SidebarProps {
  // Views
  activeViewMode: 'PUBLIC' | 'PORTAL';
  onSelectViewMode: (mode: 'PUBLIC' | 'PORTAL') => void;
  domain: CertDomain;
  onSelectDomain: (d: CertDomain) => void;
  // Role / persona
  currentPersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
  // Tools
  onOpenExplorer: () => void;
  onOpenFhir: () => void;
  onOpenEdgeCases: () => void;
  // Settings
  jurisdiction: JurisdictionMode;
  onSelectJurisdiction: (j: JurisdictionMode) => void;
  // Layout / drawer state
  isOpen: boolean;              // mobile drawer open?
  onClose: () => void;         // close the mobile drawer
  collapsed: boolean;          // desktop narrow rail?
  onToggleCollapse: () => void;
}

/** A labelled group heading — hidden when the desktop rail is collapsed. */
const SectionLabel: React.FC<{ collapsed: boolean; children: React.ReactNode }> = ({
  collapsed,
  children,
}) =>
  collapsed ? null : (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {children}
    </p>
  );

export const Sidebar: React.FC<SidebarProps> = ({
  activeViewMode,
  onSelectViewMode,
  domain,
  onSelectDomain,
  currentPersona,
  onSelectPersona,
  onOpenExplorer,
  onOpenFhir,
  onOpenEdgeCases,
  jurisdiction,
  onSelectJurisdiction,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}) => {
  // A nav action on mobile should also dismiss the drawer.
  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  // Shared button styling for a rail item.
  const itemBase =
    'w-full text-left rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5';

  return (
    <>
      {/* Mobile backdrop — tap to close. Only on small screens when the drawer is open. */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          // Base
          'bg-[#232429] border-r border-slate-700/70 text-white flex flex-col shrink-0',
          // Mobile: off-canvas drawer
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in-flow sticky rail, always visible; width follows collapsed
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-30',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        ].join(' ')}
      >
        {/* Rail header: DC mark + collapse (desktop) / close (mobile) */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-slate-700/70 shrink-0">
          <button
            onClick={act(() => onSelectViewMode('PUBLIC'))}
            className="flex items-center gap-2.5 focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm group-hover:bg-brand-500 transition-colors shrink-0">
              DC
            </div>
            {!collapsed && (
              <span className="font-bold text-base tracking-tight text-slate-100">BIDECEL</span>
            )}
          </button>

          {/* Desktop collapse toggle (chevron as a letter, no icon) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable nav body */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {/* ---- VIEWS ---- */}
          <SectionLabel collapsed={collapsed}>Views</SectionLabel>

          <button
            onClick={act(() => onSelectViewMode('PUBLIC'))}
            className={`${itemBase} px-3 py-2 mb-1 ${
              activeViewMode === 'PUBLIC'
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Public Homepage"
          >
            {collapsed ? 'PH' : 'Public Homepage'}
          </button>

          <button
            onClick={act(() => onSelectViewMode('PORTAL'))}
            className={`${itemBase} px-3 py-2 ${
              activeViewMode === 'PORTAL'
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title={`${currentPersona.role.replace(/_/g, ' ')} Portal`}
          >
            {collapsed ? 'PT' : `${currentPersona.role.replace(/_/g, ' ')} Portal`}
          </button>

          {/* Birth / Death domain switch */}
          <SectionLabel collapsed={collapsed}>Registry</SectionLabel>
          <div className={collapsed ? 'space-y-1' : 'flex rounded-lg bg-[#1f2024] border border-slate-700 p-0.5'}>
            <button
              onClick={act(() => onSelectDomain('DEATH'))}
              className={`${collapsed ? 'w-full' : 'flex-1'} px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                domain === 'DEATH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Death Certificates"
            >
              {collapsed ? 'DE' : 'Death'}
            </button>
            <button
              onClick={act(() => onSelectDomain('BIRTH'))}
              className={`${collapsed ? 'w-full' : 'flex-1'} px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                domain === 'BIRTH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Birth Certificates"
            >
              {collapsed ? 'BI' : 'Birth'}
            </button>
          </div>

          {/* ---- ROLE / PERSONA ---- */}
          <SectionLabel collapsed={collapsed}>Role</SectionLabel>
          <div className="space-y-1">
            {Object.values(USER_PERSONAS).map((persona) => {
              const active = currentPersona.role === persona.role;
              return (
                <button
                  key={persona.role}
                  onClick={act(() => {
                    onSelectPersona(persona);
                    onSelectViewMode('PORTAL');
                  })}
                  className={`${itemBase} px-2.5 py-2 items-start ${
                    active
                      ? 'bg-brand-600/20 border border-brand-500/40 text-white'
                      : 'text-slate-300 hover:bg-slate-800 border border-transparent'
                  }`}
                  title={`${persona.name} — ${persona.title}`}
                >
                  <span
                    className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                      persona.role === 'ADMIN'
                        ? 'text-brand-200 border-brand-300/50 bg-brand-500/10'
                        : 'text-brand-300 border-brand-400/40'
                    }`}
                  >
                    {roleTag(persona.role)}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block font-medium text-xs text-slate-200 truncate">
                        {persona.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 truncate">
                        {persona.title}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ---- TOOLS ---- */}
          <SectionLabel collapsed={collapsed}>Tools</SectionLabel>
          <div className="space-y-1">
            <button
              onClick={act(onOpenExplorer)}
              className={`${itemBase} px-3 py-2 text-slate-200 bg-slate-800/60 hover:bg-slate-800`}
              title="Block Explorer"
            >
              {collapsed ? 'BX' : 'Block Explorer'}
            </button>
            <button
              onClick={act(onOpenFhir)}
              className={`${itemBase} px-3 py-2 text-slate-200 bg-slate-800/60 hover:bg-slate-800`}
              title="FHIR / HIS Interop"
            >
              {collapsed ? 'FH' : 'FHIR / HIS Interop'}
            </button>
            <button
              onClick={act(onOpenEdgeCases)}
              className={`${itemBase} px-3 py-2 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30`}
              title="Edge Cases Grill"
            >
              {collapsed ? 'EC' : 'Edge Cases Grill'}
            </button>
          </div>

          {/* ---- SETTINGS ---- */}
          {!collapsed && (
            <>
              <SectionLabel collapsed={collapsed}>Settings</SectionLabel>
              <div className="px-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 px-2">
                  Data Jurisdiction
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => onSelectJurisdiction(e.target.value as JurisdictionMode)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="EU_GDPR" className="bg-slate-900">EU GDPR Sovereignty</option>
                  <option value="US_HIPAA" className="bg-slate-900">US HIPAA Privacy</option>
                  <option value="KE_PDPA" className="bg-slate-900">Kenya Data Protection</option>
                  <option value="SG_PDPA" className="bg-slate-900">Singapore PDPA</option>
                  <option value="GLOBAL_ISO" className="bg-slate-900">Global ISO/WHO Interop</option>
                </select>
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
};
