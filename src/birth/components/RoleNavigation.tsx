import React from 'react';
import { UserRole } from '../types';

interface RoleNavigationProps {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  pendingSealCount: number;
}

export const RoleNavigation: React.FC<RoleNavigationProps> = ({
  activeRole,
  setActiveRole,
  pendingSealCount
}) => {
  const roles = [
    {
      id: 'Faculty_Overview' as UserRole,
      title: 'Faculty Gateway',
      subtitle: 'Institutional Overview & Hubs',
      badge: 'Home',
      color: 'indigo'
    },
    {
      id: 'Doctor_Midwife' as UserRole,
      title: 'Doctor & Midwife Portal',
      subtitle: 'Newborn Entry & Dual Signatures',
      badge: null,
      color: 'blue'
    },
    {
      id: 'Civil_Registrar' as UserRole,
      title: 'Civil Registrar Seal',
      subtitle: 'Government Review & Block Minting',
      badge: pendingSealCount > 0 ? `${pendingSealCount} Pending` : null,
      color: 'amber'
    },
    {
      id: 'Family_Certificate' as UserRole,
      title: 'Family Digital Certificate',
      subtitle: 'Public Lookup, QR & PDF Export',
      badge: null,
      color: 'emerald'
    },
    {
      id: 'Judicial_Auditor' as UserRole,
      title: 'Judicial Auditor',
      subtitle: 'ZK Verifier & Immutable Logs',
      badge: null,
      color: 'indigo'
    },
    {
      id: 'DEBICEL_Simulator' as UserRole,
      title: 'DEBICEL Cross-Anchor',
      subtitle: 'Death Ledger Verification API Test',
      badge: 'API Endpoint',
      color: 'rose'
    }
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-[73px] z-30 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
        {roles.map(role => {
          const isActive = activeRole === role.id;

          return (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left whitespace-nowrap transition-all text-xs sm:text-sm font-medium border ${
                isActive
                  ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                  <span>{role.title}</span>
                  {role.badge && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                      role.id === 'Civil_Registrar' && pendingSealCount > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {role.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-normal hidden lg:block">
                  {role.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
